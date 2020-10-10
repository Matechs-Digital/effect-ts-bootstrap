import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"
import * as Lens from "@effect-ts/monocle/Lens"
import { arbitrary } from "@effect-ts/morphic/FastCheck"
import * as fc from "fast-check"

import { createUser, Live as UserPersistenceLive } from "../src/api/user"
import * as PgClient from "../src/db/PgClient"
import * as PgPool from "../src/db/PgPool"
import { CreateUser, User } from "../src/model/user"
import { ValidationError } from "../src/model/validation"
import { TestContainersLive } from "./utils/containers"
import { PgConfigTest } from "./utils/db"
import { Migrations, TestMigration } from "./utils/migration"
import { testRuntime } from "./utils/runtime"

const runtime = pipe(
  L.all(TestMigration(1), UserPersistenceLive),
  L.using(PgPool.Live),
  L.using(PgConfigTest),
  L.using(TestContainersLive),
  testRuntime
)

describe("Integration Suite", () => {
  it("migrations are being applied", async () => {
    expect(
      await pipe(
        T.accessService(Migrations)((_) => _.migrations.length),
        runtime.runPromise
      )
    ).toEqual(1)
  })

  it("run simple query", async () => {
    const response = await pipe(
      PgClient.accessM((client) =>
        pipe(
          T.fromPromiseDie(() => client.query("SELECT $1::text as name", ["Michael"])),
          T.map((_): string => _.rows[0].name)
        )
      ),
      PgClient.provide,
      runtime.runPromiseExit
    )

    expect(response).toEqual(Ex.succeed("Michael"))
  })

  it("check users table structure", async () => {
    const response = await pipe(
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
      PgClient.provide,
      runtime.runPromiseExit
    )

    expect(response).toEqual(
      Ex.succeed([
        { table_name: "users", column_name: "id", data_type: "integer" },
        {
          table_name: "users",
          column_name: "name",
          data_type: "character varying"
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
    const response = await pipe(
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
      PgClient.provide,
      runtime.runPromiseExit
    )

    expect(response).toEqual(
      Ex.succeed([
        { table_name: "posts", column_name: "id", data_type: "integer" },
        {
          table_name: "posts",
          column_name: "userId",
          data_type: "integer"
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
    )
  })

  it("creates a new user", async () => {
    const result = await pipe(
      createUser({ name: "Michael" }),
      PgClient.provide,
      runtime.runPromiseExit
    )

    const nameAndId = pipe(User.lens, Lens.props("name", "id"))

    expect(pipe(result, Ex.map(nameAndId.get))).toEqual(
      Ex.succeed({ id: 1, name: "Michael" })
    )
  })

  it("fail to create a new user with an ampty name", async () => {
    const result = await pipe(
      createUser({ name: "" }),
      PgClient.provide,
      runtime.runPromiseExit
    )

    expect(result).toEqual(
      Ex.fail(new ValidationError("name should be between 0 and 255 characters long"))
    )
  })

  it("create arbitrary users", async () => {
    await fc.check(
      fc.asyncProperty(arbitrary(CreateUser), async (_) => {
        const result = await pipe(
          createUser(_),
          PgClient.provide,
          runtime.runPromiseExit
        )

        expect(result._tag).toEqual("Success")
      })
    )
  })

  it("find users created from previous steps", async () => {
    const response = await pipe(
      PgClient.accessM((client) =>
        pipe(
          T.fromPromiseDie(() => client.query("SELECT COUNT(*) FROM users")),
          T.map((_) => parseInt(_.rows[0].count))
        )
      ),
      PgClient.provide,
      runtime.runPromiseExit
    )

    expect(response).toEqual(Ex.succeed(101))
  })
})
