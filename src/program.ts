import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as Calc from "./calculator"

// program

export function LiveProgram(Calc: Calc.Calculator) {
  return {
    main: pipe(
      T.zip_(Calc.gen(1), T.effectTotal(Calc.factorFun)),
      T.chain((_) => T.tuple(Calc.base, T.succeed(Calc.factor), T.succeed(_))),
      T.chain(([b, f, [x, y]]) =>
        T.chain_(Calc.add(b, f), (k) => T.succeed(k + x + y))
      ),
      T.chain((sum) => Calc.mul(sum, 3)),
      T.chain(Calc.log)
    )
  }
}

export interface Program extends ReturnType<typeof LiveProgram> {}

export const Program = has<Program>()

export const Live = L.fromConstructor(Program)(LiveProgram)(Calc.Calculator)

export const { main } = T.deriveLifted(Program)([], ["main"], [])
