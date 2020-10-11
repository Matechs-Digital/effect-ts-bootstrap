import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

interface Input {
  x: number
  y: number
}

const division = pipe(
  T.environment<Input>(),
  T.chain(({ x, y }) => (y === 0 ? T.fail("division by zero") : T.succeed(x / y))),
  T.chain((result) =>
    T.effectTotal(() => {
      console.log(`Final result: ${result}`)
    })
  )
)

pipe(division, T.provideAll({ x: 1, y: 1 }), T.runMain)
