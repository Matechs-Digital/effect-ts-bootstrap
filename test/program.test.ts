import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as Calc from "../src/calculator"
import { Console } from "../src/console"
import { MockConsole } from "../src/mocks"
import * as P from "../src/program"

describe("Program", () => {
  it("main should compute 21 as result", async () => {
    const logF = jest.fn((n: number) => n)

    await pipe(
      P.main,
      T.provideSomeLayer(P.Live),
      T.provideSomeLayer(
        L.fromEffect(Calc.Calculator)(
          T.accessService(Calc.Calculator)((c) => ({
            ...c,
            log: (n) => c.log(logF(n))
          }))
        )
      ),
      T.provideSomeLayer(Calc.Live),
      T.provideSomeLayer(L.pure(Console)(MockConsole())),
      T.runPromise
    )

    expect(logF).toHaveBeenCalledTimes(1)
    expect(logF).toHaveBeenNthCalledWith(1, 21)
  })
})
