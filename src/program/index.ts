import type { Has } from "@effect-ts/core/Classic/Has"
import * as O from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import {
  HTTPRouteException,
  isHTTPRouteException
} from "../exceptions/HTTPRouteException"
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

export function authMiddleware<R, E>(routes: R.Routes<R & Has<AuthSession>, E>) {
  return pipe(
    routes,
    R.middleware((cont) => (request, next) =>
      request.req.url === "/secret"
        ? T.fail<E | HTTPRouteException>(
            HTTPRouteException.build({
              _tag: "HTTPRouteException",
              message: "Forbidden!",
              status: 403
            })
          )
        : T.provideService(AuthSession)({ maybeUser: O.some("Michael") })(
            cont(request, next)
          )
    )
  )
}

export function exceptionHandler<R, E>(routes: R.Routes<R, E>) {
  return pipe(
    routes,
    R.middleware((cont) => (request, next) =>
      T.catchAll_(cont(request, next), (e) =>
        T.suspend(() => {
          if (isHTTPRouteException(e)) {
            request.res.statusCode = e.status
            request.res.end(e.message)
            return T.unit
          } else {
            return T.fail(<Exclude<E, HTTPRouteException>>e)
          }
        })
      )
    )
  )
}

export const Live = pipe(
  R.init,
  home,
  bar,
  authMiddleware,
  exceptionHandler,
  R.run,
  L.fromRawEffect
)
