import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import { LiveHTTPServer, makeHTTPServerConfig } from "../http"
import { LiveProgram } from "../program"
import { LiveBar } from "../program/Bar"
import { LiveFoo } from "../program/Foo"

export const Live = pipe(
  LiveProgram,
  L.using(L.allPar(LiveHTTPServer, LiveFoo, LiveBar)),
  L.using(
    makeHTTPServerConfig({
      host: "0.0.0.0",
      port: 8081
    })
  )
)

// main function (unsafe)
export function main() {
  return pipe(T.never, T.provideSomeLayer(Live), T.runMain)
}
