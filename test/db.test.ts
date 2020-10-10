import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as PG from "../src/db/client"
import { TestContainerPg } from "./utils/db"
import { testRuntime } from "./utils/runtime"

const runtime = pipe(PG.Live, L.using(TestContainerPg), testRuntime)

describe("Live Db", () => {
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
