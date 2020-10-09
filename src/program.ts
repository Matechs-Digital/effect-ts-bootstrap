import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import {
  add,
  base,
  Calculator,
  factor,
  factorFun,
  gen,
  LiveCalculator,
  mul
} from "./calculator"
import { Console, LiveConsole, log } from "./console"

// program
export const program = pipe(
  T.zip_(
    gen((_) => _(1)),
    factorFun((_) => _())
  ),
  T.chain((_) => T.tuple(base, factor, T.succeed(_))),
  T.chain(([b, f, [x, y]]) => T.chain_(add(b, f), (k) => T.succeed(k + x + y))),
  T.chain((sum) => mul(sum, 3)),
  T.chain((n) => log(`Result: ${n}`))
)

// main function (unsafe)
export function main() {
  return pipe(
    program,
    T.provideService(Calculator)(LiveCalculator()),
    T.provideService(Console)(LiveConsole()),
    T.runMain
  )
}
