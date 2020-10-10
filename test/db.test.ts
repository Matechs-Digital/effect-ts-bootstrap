import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as PG from "../src/db/client"
import { TestContainersLive } from "./utils/containers"
import { PgConfigTest } from "./utils/db"
import { Migrations, TestMigration } from "./utils/migration"
import { testRuntime } from "./utils/runtime"

const runtime = pipe(
  TestMigration(1),
  L.using(PG.Live),
  L.using(PgConfigTest),
  L.using(TestContainersLive),
  testRuntime
)

describe("Live Db", () => {
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
      PG.withClientM((client) =>
        pipe(
          T.fromPromiseDie(() => client.query("SELECT $1::text as name", ["Michael"])),
          T.map((_): string => _.rows[0].name)
        )
      ),
      runtime.runPromiseExit
    )

    expect(response).toEqual(Ex.succeed("Michael"))
  })
})
