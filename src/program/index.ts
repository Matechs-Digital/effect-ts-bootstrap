import type { Has } from "@effect-ts/core/Classic/Has"
import * as O from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import type { HTTPRouteException } from "../exceptions/HTTPRouteException"
import { isHTTPRouteException } from "../exceptions/HTTPRouteException"
import * as HTTP from "../http"
import { accessMaybeUserM, AuthSession } from "./AuthSession"
import { accessBarM } from "./Bar"
import { accessFooM } from "./Foo"

export const addHome = HTTP.addRoute((r) => r.req.url === "/")(({ res }) =>
  accessFooM((foo) =>
    T.delay(200)(
      T.effectTotal(() => {
        res.end(foo)
      })
    )
  )
)

export const addBar = HTTP.addRoute((r) => r.req.url === "/bar")(({ res }) =>
  accessBarM((bar) =>
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
)

export function addAuth<R, E>(routes: HTTP.Routes<R & Has<AuthSession>, E>) {
  return pipe(
    routes,
    HTTP.addMiddleware((cont) => (request, next) =>
      request.req.url === "/secret"
        ? T.fail<E | HTTPRouteException>({
            _tag: "HTTPRouteException",
            message: "Forbidden!",
            status: 403
          })
        : T.provideService(AuthSession)({ maybeUser: O.some("Michael") })(
            cont(request, next)
          )
    )
  )
}

export function addHandler<R, E>(routes: HTTP.Routes<R, E>) {
  return pipe(
    routes,
    HTTP.addMiddleware((cont) => (request, next) =>
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

export const process = pipe(
  HTTP.create,
  addHome,
  addBar,
  addAuth,
  addHandler,
  HTTP.drain
)

export const LiveProgram = L.fromRawEffect(process)
