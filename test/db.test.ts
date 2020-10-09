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
      PG.withClientM((client) =>
        pipe(
          T.fromPromise(() => client.query("SELECT $1::text as name", ["Michael"])),
          T.map((_) => _.rows[0].name)
        )
      ),
      runtime.runPromiseExit
    )

    expect(response).toEqual(Ex.succeed("Michael"))
  })
})
