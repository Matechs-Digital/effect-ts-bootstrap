import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as PG from "../src/db/client"
import { TestContainerPg } from "./utils/db"
import { testRuntime } from "./utils/runtime"

const runtime = pipe(PG.Live, L.using(TestContainerPg), testRuntime)

describe("DockerComposeEnvironment", () => {
  it("reads config", async () => {
    const response = await pipe(
      T.accessServiceM(PG.PgClient)((_) =>
        pipe(
          _.client((pc) =>
            T.fromPromiseDie(() => pc.query("SELECT $1::text as name", ["Michael"]))
          ),
          T.map((r) => r.rows[0].name)
        )
      ),
      runtime.runPromiseExit
    )

    expect(response).toEqual(Ex.succeed("Michael"))
  })
})
