import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as F from "@effect-ts/core/Effect/Fiber"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as Lens from "@effect-ts/monocle/Lens"
import { arbitrary } from "@effect-ts/morphic/FastCheck"
import { has } from "@effect-ts/system/Has"
import * as fc from "fast-check"

import { Crypto, CryptoLive, PBKDF2ConfigTest, verifyPassword } from "../src/crypto"
import {
  Db,
  DbLive,
  PgClient,
  PgPoolLive,
  provideClient,
  TestMigration
} from "../src/db"
import { TestContainersLive } from "../src/dev/containers"
import { PgConfigTest } from "../src/dev/db"
import { isRouterDraining, LiveHTTP, serverConfig } from "../src/http"
import { Credential, PasswordField } from "../src/model/credential"
import { Email, EmailField, User } from "../src/model/user"
import { ValidationError } from "../src/model/validation"
import {
  createCredential,
  CredentialPersistence,
  CredentialPersistenceLive,
  updateCredential
} from "../src/persistence/credential"
import { register, TransactionsLive } from "../src/persistence/transactions"
import {
  createUser,
  getUser,
  updateUser,
  UserPersistenceLive
} from "../src/persistence/user"
import { App } from "../src/program"
import { assertSuccess } from "./utils/assertions"
import { testRuntime } from "./utils/runtime"

export function makeAppFiber() {
  return App["|>"](T.fork)
    ["|>"](M.makeInterruptible(F.interrupt))
    ["|>"](M.map((fiber) => ({ fiber })))
}

export interface AppFiber {
  fiber: F.FiberContext<never, never>
}

export const AppFiber = has<AppFiber>()

export const AppFiberTest = L.fromConstructorManaged(AppFiber)(makeAppFiber)()

const PersistenceTest = TransactionsLive["|>"](
  L.using(L.allPar(UserPersistenceLive, CredentialPersistenceLive))
)

const CryptoTest = CryptoLive["|>"](L.using(PBKDF2ConfigTest))

const DbTest = DbLive("main")
  ["|>"](L.using(TestMigration("main")))
  ["|>"](L.using(PgPoolLive("main")))
  ["|>"](L.using(PgConfigTest("main")("integration")))
  ["|>"](L.using(TestContainersLive("integration")))

const ServerTest = LiveHTTP["|>"](
  L.using(
    serverConfig({
      host: "0.0.0.0",
      port: 8082
    })
  )
)

const BootstrapTest = AppFiberTest["|>"](L.using(PersistenceTest))["|>"](
  L.using(L.allPar(DbTest, ServerTest, CryptoTest))
)

describe("Integration Suite", () => {
  const { runPromiseExit } = testRuntime(BootstrapTest)({
    open: 30_000,
    close: 30_000
  })

  describe("Bootstrap", () => {
    it("run simple query", async () => {
      const program = T.gen(function* (_) {
        const { client } = yield* _(PgClient("main"))

        const result = yield* _(
          T.fromPromiseDie(() => client.query("SELECT $1::text as name", ["Michael"]))
        )

        return result.rows[0].name
      })["|>"](provideClient("main"))

      expect(await runPromiseExit(program)).toEqual(Ex.succeed("Michael"))
    })

    it("http server fiber is running", async () => {
      const result = await runPromiseExit(
        T.accessServiceM(AppFiber)((_) => _.fiber.getRef(isRouterDraining))
      )
      expect(result).toEqual(Ex.succeed(true))
    })

    it("check users table structure", async () => {
      const program = T.gen(function* (_) {
        const { client } = yield* _(PgClient("main"))

        const result = yield* _(
          T.fromPromiseDie(() =>
            client.query(
              "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = $1::text;",
              ["users"]
            )
          )
        )

        return result.rows
      })["|>"](provideClient("main"))

      expect(await runPromiseExit(program)).toEqual(
        Ex.succeed([
          { table_name: "users", column_name: "id", data_type: "integer" },
          {
            table_name: "users",
            column_name: "email",
            data_type: "text"
          },
          {
            table_name: "users",
            column_name: "createdAt",
            data_type: "timestamp without time zone"
          },
          {
            table_name: "users",
            column_name: "updatedAt",
            data_type: "timestamp without time zone"
          }
        ])
      )
    })

    it("check credentials table structure", async () => {
      const program = T.gen(function* (_) {
        const { client } = yield* _(PgClient("main"))

        const result = yield* _(
          T.fromPromiseDie(() =>
            client.query(
              "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = $1::text;",
              ["credentials"]
            )
          )
        )

        return result.rows
      })["|>"](provideClient("main"))

      expect(await runPromiseExit(program)).toEqual(
        Ex.succeed([
          {
            column_name: "id",
            data_type: "integer",
            table_name: "credentials"
          },
          {
            column_name: "userId",
            data_type: "integer",
            table_name: "credentials"
          },
          {
            column_name: "hash",
            data_type: "text",
            table_name: "credentials"
          },
          {
            column_name: "createdAt",
            data_type: "timestamp without time zone",
            table_name: "credentials"
          },
          {
            table_name: "credentials",
            column_name: "updatedAt",
            data_type: "timestamp without time zone"
          }
        ])
      )
    })
  })

  describe("User Api", () => {
    it("creates a new user", async () => {
      const result = await createUser({ email: Email.wrap("ma@example.org") })
        ["|>"](provideClient("main"))
        ["|>"](runPromiseExit)

      const nameAndId = User.lens["|>"](Lens.props("email", "id"))

      expect(result["|>"](Ex.map(nameAndId.get))).toEqual(
        Ex.succeed({ id: 1, email: "ma@example.org" })
      )
    })

    it("fail to create a new user with an empty email", async () => {
      const result = await createUser({ email: Email.wrap("") })
        ["|>"](provideClient("main"))
        ["|>"](runPromiseExit)

      expect(result).toEqual(
        Ex.fail(
          new ValidationError("email should be between 0 and 255 characters long")
        )
      )
    })

    it("transactional dsl handles success/failure with commit/rollback", async () => {
      const result = await T.gen(function* (_) {
        const { transaction } = yield* _(Db("main"))

        return yield* _(
          T.tuple(
            createUser({ email: Email.wrap("USER_0@example.org") }),
            createUser({ email: Email.wrap("USER_1@example.org") }),
            createUser({ email: Email.wrap("USER_2@example.org") })
          )
            ["|>"](T.tap(() => T.fail("error")))
            ["|>"](transaction)
        )
      })
        ["|>"](provideClient("main"))
        ["|>"](runPromiseExit)

      expect(result).toEqual(Ex.fail("error"))

      const userCount = T.gen(function* (_) {
        const { client } = yield* _(PgClient("main"))

        const result = yield* _(
          T.fromPromiseDie(() =>
            client.query("SELECT COUNT(*) FROM users WHERE email LIKE 'USER_%'")
          )
        )

        return parseInt(result.rows[0].count)
      })["|>"](provideClient("main"))

      const count = await userCount["|>"](runPromiseExit)

      expect(count).toEqual(Ex.succeed(0))

      const resultSuccess = await T.gen(function* (_) {
        const { transaction } = yield* _(Db("main"))

        return yield* _(
          transaction(
            T.tuple(
              createUser({ email: Email.wrap("USER_0@example.org") }),
              createUser({ email: Email.wrap("USER_1@example.org") }),
              createUser({ email: Email.wrap("USER_2@example.org") })
            )
          )
        )
      })
        ["|>"](provideClient("main"))
        ["|>"](runPromiseExit)

      assertSuccess(resultSuccess)
      expect(resultSuccess.value.map((_) => [_.email, _.id])).toEqual([
        ["USER_0@example.org", 5],
        ["USER_1@example.org", 6],
        ["USER_2@example.org", 7]
      ])

      const countSuccess = await userCount["|>"](runPromiseExit)

      assertSuccess(countSuccess)
      expect(countSuccess.value).toEqual(3)
    })

    it("get user", async () => {
      const result = await getUser({ id: 5 })
        ["|>"](T.map((_) => _.email))
        ["|>"](provideClient("main"))
        ["|>"](runPromiseExit)

      expect(result).toEqual(Ex.succeed("USER_0@example.org"))
    })

    it("creates and updates user", async () => {
      const result = await createUser({
        email: Email.wrap("OldName@example.org")
      })
        ["|>"](
          T.chain((user) =>
            updateUser({ ...user, email: Email.wrap("NewEmail@example.org") })
          )
        )
        ["|>"](T.map((_) => _.email))
        ["|>"](provideClient("main"))
        ["|>"](runPromiseExit)

      expect(result).toEqual(Ex.succeed("NewEmail@example.org"))
    })
  })

  describe("Credential Api", () => {
    it("creates a credential", async () => {
      const result = await createCredential({ userId: 5, password: "helloworld000" })
        ["|>"](provideClient("main"))
        ["|>"](runPromiseExit)

      const id = Credential.lens["|>"](Lens.prop("id"))
      const hash = Credential.lens["|>"](Lens.prop("hash"))

      expect(result["|>"](Ex.map(id.get))).toEqual(Ex.succeed(1))

      const verify = await T.done(result)
        ["|>"](T.map(hash.get))
        ["|>"](T.chain((_) => verifyPassword("helloworld000", _)))
        ["|>"](runPromiseExit)

      expect(verify).toEqual(Ex.unit)
    })

    it("update a credential", async () => {
      const result = await updateCredential({
        id: 1,
        userId: 105,
        password: "helloworld001"
      })
        ["|>"](provideClient("main"))
        ["|>"](runPromiseExit)

      const id = Credential.lens["|>"](Lens.prop("id"))
      const hash = Credential.lens["|>"](Lens.prop("hash"))

      expect(result["|>"](Ex.map(id.get))).toEqual(Ex.succeed(1))

      const verify = await T.done(result)
        ["|>"](T.map(hash.get))
        ["|>"](T.chain((_) => verifyPassword("helloworld001", _)))
        ["|>"](runPromiseExit)

      expect(verify).toEqual(Ex.unit)
    })
  })

  describe("Generative", () => {
    it("create arbitrary users with credentials", () =>
      fc.assert(
        fc.asyncProperty(
          arbitrary(EmailField),
          arbitrary(PasswordField),
          async ({ email }, { password }) => {
            const verify = await runPromiseExit(
              T.gen(function* (_) {
                const { getCredentialByUserId } = yield* _(CredentialPersistence)
                const { verifyPassword } = yield* _(Crypto)

                const user = yield* _(register({ email, password }))
                const cred = yield* _(getCredentialByUserId(user.id))

                yield* _(verifyPassword(password, cred.hash))
              })["|>"](provideClient("main"))
            )

            expect(verify).toEqual(Ex.unit)
          }
        ),
        { endOnFailure: true, timeout: 1000 }
      ))
  })
})
