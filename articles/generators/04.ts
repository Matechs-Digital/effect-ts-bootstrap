import * as E from "@effect-ts/core/Classic/Either"
import * as O from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Effect"
import * as S from "@effect-ts/core/Effect/Stream"
import { pipe } from "@effect-ts/core/Function"

const result = S.gen(function* (_) {
  const a = yield* _(O.some(0))
  const b = yield* _(E.right(1))
  const c = yield* _(T.succeed(2))
  const d = yield* _(S.fromArray([a, b, c]))

  return d
})

pipe(
  result,
  S.runCollect,
  T.chain((res) =>
    T.effectTotal(() => {
      console.log(res)
    })
  ),
  T.runMain
)
