import * as A from "@effect-ts/core/Classic/Array"
import * as T from "@effect-ts/core/Effect"
import * as Cause from "@effect-ts/core/Effect/Cause"
import { pipe } from "@effect-ts/core/Function"
import { matchTag } from "@effect-ts/core/Utils"

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

// T.Effect<InputA & InputB, ErrorA, void>
const program = pipe(
  T.access((_: InputA) => _.x),
  T.chain((n) =>
    n === 0 ? T.fail<ErrorA>({ _tag: "ErrorA", value: "n === 0" }) : T.succeed(n)
  ),
  T.chain((n) => T.access((_: InputB) => _.y + n)),
  T.chain((n) => (n === 10 ? T.die("something very wrong happened") : T.succeed(n))),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

// T.Effect<InputA & InputB, never, void>
const programAfterErrorHandling = pipe(
  program,
  T.catchAll(
    matchTag(
      {
        ErrorA: ({ value }) =>
          T.effectTotal(() => {
            console.log(`handling ErrorA: ${value}`)
          })
      },
      (e) =>
        pipe(
          T.effectTotal(() => {
            console.log(`Default Handler`)
          }),
          T.andThen(T.fail(e))
        )
    )
  )
)

const handleFullCause = pipe(
  programAfterErrorHandling,
  T.sandbox,
  T.catchAll((cause) => {
    const defects = Cause.defects(cause)

    if (A.isNonEmpty(defects)) {
      return T.effectTotal(() => {
        console.log("Handle:", ...defects)
      })
    }

    return T.halt(cause)
  })
)

pipe(handleFullCause, T.provideAll({ x: 1, y: 9 }), T.runMain)
