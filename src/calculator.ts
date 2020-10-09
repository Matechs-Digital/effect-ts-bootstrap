import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"

import { Console } from "./console"

// module definition
export function LiveCalculator(Console: Console) {
  return T.succeed({
    factor: 2,
    factorFun: () => 3,
    base: T.succeed(1),
    add: (x: number, y: number) => T.effectTotal(() => x + y),
    mul: (x: number, y: number) => T.effectTotal(() => x * y),
    gen: <A>(a: A) => T.effectTotal(() => a),
    log: (n: number) => Console.log(`Result: ${n}`),
    open: Console.log("Prepare..."),
    close: Console.log("Close...")
  })
}

export interface Calculator
  extends Omit<T._A<ReturnType<typeof LiveCalculator>>, "open" | "close"> {}

// module tag
export const Calculator = has<Calculator>()

// lifted functions
export const { add, base, factor, log, mul } = T.deriveLifted(Calculator)(
  ["add", "mul", "log"],
  ["base"],
  ["factor"]
)

// accessM functions
export const { gen } = T.deriveAccessM(Calculator)(["gen"])

// access functions
export const { factorFun } = T.deriveAccess(Calculator)(["factorFun", "gen"])

export const Live = L.bracketConstructorM(Calculator)(LiveCalculator)(Console)(
  (_) => _.open,
  (_) => _.close
)
