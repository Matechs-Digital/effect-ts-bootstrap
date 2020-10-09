import * as T from "@effect-ts/core/Effect"

import type { Calculator } from "./calculator"
import type { Console } from "./console"

export function MockCalculator(): Calculator {
  return {
    add: () => T.succeed(0),
    mul: () => T.succeed(0),
    base: T.succeed(0),
    factor: 0,
    gen: T.succeed,
    factorFun: () => 0,
    log: () => T.unit
  }
}

export function MockConsole(): Console {
  return {
    log: () => T.unit
  }
}
