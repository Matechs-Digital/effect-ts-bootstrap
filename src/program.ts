import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

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

export function LiveConsole() {
  return {
    log: (s: string) =>
      T.effectTotal(() => {
        console.log(s)
      })
  }
}

export interface Console extends ReturnType<typeof LiveConsole> {}

export const Console = has<Console>()

export const { log } = T.deriveLifted(Console)(["log"], [], [])

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

export function MockCalculator(): Calculator {
  return {
    add: () => T.succeed(0),
    mul: () => T.succeed(0),
    base: T.succeed(0),
    factor: 0,
    gen: T.succeed,
    factorFun: () => 0
  }
}

export function main() {
  return pipe(
    program,
    T.provideService(Calculator)(LiveCalculator()),
    T.provideService(Console)(LiveConsole()),
    T.runMain
  )
}
