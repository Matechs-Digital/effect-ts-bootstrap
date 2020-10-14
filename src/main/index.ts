import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as Http from "../http"
import * as Program from "../program"
import * as Bar from "../program/Bar"
import * as Foo from "../program/Foo"

export const Live = pipe(
  Program.Live,
  L.using(L.allPar(Foo.LiveFoo, Bar.LiveBar)),
  L.using(Http.Live),
  L.using(
    Http.makeHTTPServerConfig({
      host: "0.0.0.0",
      port: 8081
    })
  )
)

// main function (unsafe)
export function main() {
  return pipe(T.never, T.provideSomeLayer(Live), T.runMain)
}
