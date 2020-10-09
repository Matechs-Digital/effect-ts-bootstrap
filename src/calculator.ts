import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"

// module definition
export function LiveCalculator() {
  return {
    factor: 2,
    factorFun: () => 3,
    base: T.succeed(1),
    add: (x: number, y: number) => T.effectTotal(() => x + y),
    mul: (x: number, y: number) => T.effectTotal(() => x * y),
    gen: <A>(a: A) => T.effectTotal(() => a)
  }
}

export interface Calculator extends ReturnType<typeof LiveCalculator> {}

// module tag
export const Calculator = has<Calculator>()

// lifted functions
export const { add, base, factor, mul } = T.deriveLifted(Calculator)(
  ["add", "mul"],
  ["base"],
  ["factor"]
)

// accessM functions
export const { gen } = T.deriveAccessM(Calculator)(["gen"])

// access functions
export const { factorFun } = T.deriveAccess(Calculator)(["factorFun", "gen"])
