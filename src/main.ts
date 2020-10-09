import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as Calc from "./calculator"
import * as Console from "./console"
import * as Program from "./program"

export const Live = pipe(Program.Live, L.using(Calc.Live), L.using(Console.Live))

// main function (unsafe)
export function main() {
  return pipe(Program.main, T.provideSomeLayer(Live), T.runMain)
}
