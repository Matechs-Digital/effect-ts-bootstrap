import * as T from "@effect-ts/core/Effect"
import { pretty } from "@effect-ts/core/Effect/Cause"
import * as F from "@effect-ts/core/Effect/Fiber"

const cancellableEffect = T.effectAsyncInterrupt<unknown, never, number>((cb) => {
  const timer = setTimeout(() => {
    cb(T.succeed(1))
  }, 2000)

  return T.effectTotal(() => {
    clearTimeout(timer)
  })
})

const main = T.gen(function* (_) {
  const fiber = yield* _(T.fork(cancellableEffect))

  yield* _(T.sleep(200))

  const exit = yield* _(F.interrupt(fiber))

  yield* _(
    T.effectTotal(() => {
      switch (exit._tag) {
        case "Failure": {
          console.log(pretty(exit.cause))
          break
        }
        case "Success": {
          console.log(`completed with: ${exit.value}`)
        }
      }
    })
  )
})

T.runMain(main)
