import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as Calc from "./calculator"
import * as Console from "./console"

// program
export const program = pipe(
  T.zip_(
    Calc.gen((_) => _(1)),
    Calc.factorFun((_) => _())
  ),
  T.chain((_) => T.tuple(Calc.base, Calc.factor, T.succeed(_))),
  T.chain(([b, f, [x, y]]) => T.chain_(Calc.add(b, f), (k) => T.succeed(k + x + y))),
  T.chain((sum) => Calc.mul(sum, 3)),
  T.chain(Calc.log)
)

export const Live = pipe(Calc.Live, L.using(Console.Live))

// main function (unsafe)
export function main() {
  return pipe(program, T.provideSomeLayer(Live), T.runMain)
}
