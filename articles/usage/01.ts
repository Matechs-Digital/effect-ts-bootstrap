import "@effect-ts/core/Operators"

import * as T from "@effect-ts/core/Effect"
import * as F from "@effect-ts/core/Effect/Fiber"

const program = T.succeed(0)
  ["|>"](T.map((n) => n + 1))
  ["|>"](T.delay(1000))
  ["|>"](T.fork)
  ["|>"](T.chain(F.join))
  ["|>"](
    T.chain((n) =>
      T.effectTotal(() => {
        console.log(n)
      })
    )
  )

program["|>"](T.runMain)
