import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

interface InputA {
  x: number
}
interface InputB {
  y: number
}
interface ErrorA {
  _tag: "ErrorA"
  value: string
}
interface ErrorB {
  _tag: "ErrorB"
  value: string
}

// T.Effect<InputA & InputB, ErrorA | ErrorB, number>
const program = pipe(
  T.access((_: InputA) => _.x),
  T.chain((n) =>
    n === 0 ? T.fail<ErrorA>({ _tag: "ErrorA", value: "n === 0" }) : T.succeed(n)
  ),
  T.chain((n) => T.access((_: InputB) => _.y + n)),
  T.chain((n) =>
    n === 10 ? T.fail<ErrorB>({ _tag: "ErrorB", value: "n === 10" }) : T.succeed(n)
  ),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

pipe(program, T.provideAll({ x: 1, y: 1 }), T.runMain)
