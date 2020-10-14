import type { Has } from "@effect-ts/core/Classic/Has"
import * as O from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as R from "../router"
import { accessMaybeUserM, AuthSession } from "./AuthSession"
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
        accessMaybeUserM((maybeUser) =>
          T.delay(200)(
            T.effectTotal(() => {
              O.fold_(
                maybeUser,
                () => {
                  res.statusCode = 401
                  res.end()
                },
                (user) => {
                  res.end(`${user}: ${bar}`)
                }
              )
            })
          )
        )
      )
    : next
)

export function middle<R>(routes: R.Routes<R & Has<AuthSession>>) {
  return pipe(
    routes,
    R.middleware((cont) => (request, next) =>
      request.req.url === "/middle"
        ? T.effectTotal(() => {
            request.res.end("Middle!")
          })
        : T.provideService(AuthSession)({ maybeUser: O.some("Michael") })(
            cont(request, next)
          )
    )
  )
}

export const Live = pipe(R.init, home, bar, middle, R.run, L.fromRawEffect)
