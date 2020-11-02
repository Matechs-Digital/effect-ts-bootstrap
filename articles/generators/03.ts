import * as E from "@effect-ts/core/Classic/Either"
import * as O from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Effect"
import * as M from "@effect-ts/core/Effect/Managed"
import { pipe } from "@effect-ts/core/Function"

const result = T.gen(function* (_) {
  const a = yield* _(O.some(1))
  const b = yield* _(O.some(2))
  const c = yield* _(E.right(3))
  const d = yield* _(T.access((_: { n: number }) => _.n))
  const e = yield* _(
    M.makeExit_(
      T.effectTotal(() => {
        console.log("open")

        return 5
      }),
      () =>
        T.effectTotal(() => {
          console.log("release")
        })
    )
  )

  yield* _(
    T.effectTotal(() => {
      console.log(a + b + c + d + e)
    })
  )
})

pipe(result, T.provideAll({ n: 4 }), T.runMain)
