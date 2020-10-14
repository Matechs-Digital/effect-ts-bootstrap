import type { Has } from "@effect-ts/core/Classic/Has"
import * as O from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as HTTP from "../http"
import { LiveHTTPServer, makeHTTPServerConfig } from "../http"
import { accessBarM, LiveBar } from "../program/Bar"
import { accessFooM, LiveFoo } from "../program/Foo"
import { accessMaybeUserM, AuthSession } from "./AuthSession"

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
        ? T.fail<E | HTTP.HTTPRouteException>({
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

export const HTTPServer = pipe(
  HTTP.create,
  addHome,
  addBar,
  addAuth,
  HTTP.drain,
  L.fromRawEffect
)

export const App = pipe(
  HTTPServer,
  L.using(L.allPar(LiveHTTPServer, LiveFoo, LiveBar)),
  L.using(
    makeHTTPServerConfig({
      host: "0.0.0.0",
      port: 8081
    })
  )
)

// main function (unsafe)
export function main() {
  return pipe(T.never, T.provideSomeLayer(App), T.runMain)
}
