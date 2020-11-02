import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

const program = pipe(
  T.do,
  T.bind("a", () => T.succeed(1)),
  T.bind("b", () => T.succeed(2)),
  T.bind("c", ({ a, b }) => T.succeed(a + b)),
  T.map(({ c }) => c)
)

pipe(
  program,
  T.chain((c) =>
    T.effectTotal(() => {
      console.log(c)
    })
  ),
  T.runMain
)
