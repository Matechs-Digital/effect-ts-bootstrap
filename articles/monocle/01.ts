import "@effect-ts/core/Operators"

import * as T from "@effect-ts/core/Effect"
import * as F from "@effect-ts/core/Effect/Fiber"

const program = T.succeed(1)
  ["|>"](T.map((n) => n + 1))
  ["|>"](T.fork)
  ["|>"](T.chain(F.join))
