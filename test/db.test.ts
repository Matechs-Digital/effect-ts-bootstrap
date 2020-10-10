import type { Has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"
import * as Lens from "@effect-ts/monocle/Lens"

import type { UserPersistence } from "../src/api/user"
import { createUser, Live as UserPersistenceLive } from "../src/api/user"
import * as PgClient from "../src/db/PgClient"
import type { PgConfig } from "../src/db/PgConfig"
import * as PgPool from "../src/db/PgPool"
import { User } from "../src/model/user"
import type { TestContainers } from "./utils/containers"
import { TestContainersLive } from "./utils/containers"
import { PgConfigTest } from "./utils/db"
import { Migrations, TestMigration } from "./utils/migration"
import { testRuntime } from "./utils/runtime"

const runtime = pipe(
  TestMigration(1),
  L.using(PgPool.Live),
  L.using(PgConfigTest),
  L.using(TestContainersLive),
  testRuntime
)

const persistence = pipe(UserPersistenceLive, L.using(PgClient.Live))

export type TestEnv = Has<UserPersistence> &
  Has<PgClient.PgClient> &
  Has<Migrations> &
  Has<PgPool.PgPool> &
  Has<PgConfig> &
  Has<TestContainers>

export function runPromise<E, A>(_: T.Effect<TestEnv, E, A>) {
  return pipe(_, T.provideSomeLayer(persistence), runtime.runPromise)
}

export function runPromiseExit<E, A>(_: T.Effect<TestEnv, E, A>) {
  return pipe(_, T.provideSomeLayer(persistence), runtime.runPromiseExit)
}

describe("Live Db", () => {
  it("migrations are being applied", async () => {
    expect(
      await pipe(
        T.accessService(Migrations)((_) => _.migrations.length),
        runPromise
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
      runPromiseExit
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
      runPromiseExit
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
      runPromiseExit
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
    const result = await pipe(createUser({ name: "Michael" }), runPromiseExit)

    const nameAndId = pipe(User.lens, Lens.props("name", "id"))

    expect(pipe(result, Ex.map(nameAndId.get))).toEqual(
      Ex.succeed({ id: 1, name: "Michael" })
    )
  })
})
