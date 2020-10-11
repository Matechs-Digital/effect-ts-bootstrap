import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"
import * as Lens from "@effect-ts/monocle/Lens"
import { arbitrary } from "@effect-ts/morphic/FastCheck"
import * as fc from "fast-check"

import { createUser, Live as UserPersistenceLive, updateUser } from "../src/api/user"
import * as Db from "../src/db/Db"
import * as PgClient from "../src/db/PgClient"
import * as PgPool from "../src/db/PgPool"
import { restrictToPublic } from "../src/entry/restrictToPublic"
import { CreateUser, User } from "../src/model/user"
import { ValidationError } from "../src/model/validation"
import { assertSuccess } from "./utils/assertions"
import { TestContainersLive } from "./utils/containers"
import { PgConfigTest } from "./utils/db"
import { TestMigrations } from "./utils/migrations"
import { testRuntime } from "./utils/runtime"

// @ts-expect-error
BigInt.prototype.toJSON = function () {
  return `${this.toString()}`
}

describe("Integration Suite", () => {
  const { runPromiseExit } = pipe(
    L.allPar(UserPersistenceLive),
    L.using(TestMigrations),
    L.using(PgPool.Live),
    L.using(PgConfigTest("integration")),
    L.using(TestContainersLive("integration")),
    restrictToPublic,
    testRuntime
  )({
    open: 30_000,
    close: 30_000
  })

  describe("Bootstrap", () => {
    it("run simple query", async () => {
      const response = await runPromiseExit(
        pipe(
          PgClient.accessM((client) =>
            pipe(
              T.fromPromiseDie(() =>
                client.query("SELECT $1::text as name", ["Michael"])
              ),
              T.map((_): string => _.rows[0].name)
            )
          ),
          PgClient.provide
        )
      )

      expect(response).toEqual(Ex.succeed("Michael"))
    })

    it("check users table structure", async () => {
      const response = await runPromiseExit(
        pipe(
          PgClient.accessM((client) =>
            pipe(
              T.fromPromiseDie(() =>
                client.query(
                  "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = $1::text;",
                  ["users"]
                )
              ),
              T.map((_) => _.rows)
            )
          ),
          PgClient.provide
        )
      )

      expect(response).toEqual(
        Ex.succeed([
          { table_name: "users", column_name: "id", data_type: "bigint" },
          {
            table_name: "users",
            column_name: "name",
            data_type: "text"
          },
          {
            table_name: "users",
            column_name: "createdAt",
            data_type: "timestamp without time zone"
          }
        ])
      )
    })

    it("check posts table structure", async () => {
      const response = await runPromiseExit(
        pipe(
          PgClient.accessM((client) =>
            pipe(
              T.fromPromiseDie(() =>
                client.query(
                  "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = $1::text;",
                  ["posts"]
                )
              ),
              T.map((_) => _.rows)
            )
          ),
          PgClient.provide
        )
      )

      assertSuccess(response)

      expect(response.value).toEqual([
        { table_name: "posts", column_name: "id", data_type: "bigint" },
        {
          table_name: "posts",
          column_name: "userId",
          data_type: "bigint"
        },
        {
          table_name: "posts",
          column_name: "body",
          data_type: "text"
        },
        {
          column_name: "createdAt",
          data_type: "timestamp without time zone",
          table_name: "posts"
        }
      ])
    })
  })

  describe("User Api", () => {
    it("creates a new user", async () => {
      const result = await runPromiseExit(
        pipe(createUser({ name: "Michael" }), Db.fromPool)
      )

      const nameAndId = pipe(User.lens, Lens.props("name", "id"))

      expect(pipe(result, Ex.map(nameAndId.get))).toEqual(
        Ex.succeed({ id: BigInt(1), name: "Michael" })
      )
    })

    it("fail to create a new user with an empty name", async () => {
      const result = await runPromiseExit(pipe(createUser({ name: "" }), Db.fromPool))

      expect(result).toEqual(
        Ex.fail(new ValidationError("name should be between 0 and 255 characters long"))
      )
    })

    it("create arbitrary users", () =>
      fc.assert(
        fc.asyncProperty(arbitrary(CreateUser), async (_) => {
          const result = await runPromiseExit(
            pipe(createUser(_), T.as(true), Db.fromPool)
          )

          expect(result).toEqual(Ex.succeed(true))
        }),
        { endOnFailure: true, timeout: 1000 }
      ))

    it("find users created from previous steps", async () => {
      const response = await runPromiseExit(
        pipe(
          PgClient.accessM((client) =>
            pipe(
              T.fromPromiseDie(() => client.query("SELECT COUNT(*) FROM users")),
              T.map((_) => parseInt(_.rows[0].count))
            )
          ),
          PgClient.provide
        )
      )

      assertSuccess(response)
      expect(response.value).toBeGreaterThan(10)
    })

    it("transactional dsl handles success/failure with commit/rollback", async () => {
      const result = await runPromiseExit(
        pipe(
          T.tuple(
            createUser({ name: "USER_0" }),
            createUser({ name: "USER_1" }),
            createUser({ name: "USER_2" })
          ),
          T.tap(() => T.fail("error")),
          Db.transaction,
          Db.fromPool
        )
      )

      expect(result).toEqual(Ex.fail("error"))

      const count = await runPromiseExit(
        pipe(
          PgClient.accessM((client) =>
            pipe(
              T.fromPromiseDie(() =>
                client.query("SELECT COUNT(*) FROM users WHERE name LIKE 'USER_%'")
              ),
              T.map((_) => parseInt(_.rows[0].count))
            )
          ),
          PgClient.provide
        )
      )

      expect(count).toEqual(Ex.succeed(0))

      const resultSuccess = await runPromiseExit(
        pipe(
          T.tuple(
            createUser({ name: "USER_0" }),
            createUser({ name: "USER_1" }),
            createUser({ name: "USER_2" })
          ),
          Db.transaction,
          Db.fromPool
        )
      )

      assertSuccess(resultSuccess)
      expect(resultSuccess.value.map((_) => [_.name, _.id])).toEqual([
        ["USER_0", BigInt(105)],
        ["USER_1", BigInt(106)],
        ["USER_2", BigInt(107)]
      ])

      const countSuccess = await runPromiseExit(
        pipe(
          PgClient.accessM((client) =>
            pipe(
              T.fromPromiseDie(() =>
                client.query("SELECT COUNT(*) FROM users WHERE name LIKE 'USER_%'")
              ),
              T.map((_) => parseInt(_.rows[0].count))
            )
          ),
          PgClient.provide
        )
      )

      assertSuccess(countSuccess)
      expect(countSuccess.value).toEqual(3)
    })

    it("creates and updates user", async () => {
      const result = await runPromiseExit(
        pipe(
          createUser({
            name: "OldName"
          }),
          T.chain((user) => updateUser({ ...user, name: "NewName" })),
          T.map((_) => _.name),
          Db.fromPool
        )
      )

      expect(result).toEqual(Ex.succeed("NewName"))
    })
  })
})
