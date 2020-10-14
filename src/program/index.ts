import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import * as R from "../router"
import { accessBarM } from "./Bar"
import { accessFooM } from "./Foo"

export const home = R.route(({ req, res }, next) =>
  req.url === "/"
    ? accessFooM((foo) =>
        T.delay(200)(
          T.effectTotal(() => {
            res.end(foo)
          })
        )
      )
    : next
)

export const bar = R.route(({ req, res }, next) =>
  req.url === "/bar"
    ? accessBarM((bar) =>
        T.delay(200)(
          T.effectTotal(() => {
            res.end(bar)
          })
        )
      )
    : next
)

export const main = pipe(R.init, home, bar, R.run)
