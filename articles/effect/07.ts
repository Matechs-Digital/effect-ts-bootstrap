import * as T from "@effect-ts/core/Effect"
import * as Rand from "@effect-ts/core/Effect/Random"
import { pipe } from "@effect-ts/core/Function"

export class ProcessError {
  readonly _tag = "ProcessError"
  constructor(readonly message: string) {}
}

// this effect sleeps for a random period between 100ms and 1000ms and randomly suceed or fail
export const randomFailure = (n: number) =>
  pipe(
    Rand.nextIntBetween(100, 1000),
    T.chain((delay) =>
      pipe(
        Rand.nextBoolean,
        T.chain((b) => (b ? T.unit : T.fail(new ProcessError(`failed at: ${n}`)))),
        T.delay(delay)
      )
    )
  )

// build up a n-tuple of computations
export const program = T.tuplePar(
  randomFailure(0),
  randomFailure(1),
  randomFailure(2),
  randomFailure(3),
  randomFailure(4),
  randomFailure(5)
)

// runs the program
pipe(
  program,
  T.catchAll((_) =>
    T.effectTotal(() => {
      console.log(`Process error: ${_.message}`)
    })
  ),
  T.runMain
)
