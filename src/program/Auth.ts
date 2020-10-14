import type { Has } from "@effect-ts/core/Classic/Has"
import { has } from "@effect-ts/core/Classic/Has"
import type { Option } from "@effect-ts/core/Classic/Option"
import * as O from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import * as HTTP from "../http"

export interface AuthSession {
  maybeUser: Option<string>
}

export const AuthSession = has<AuthSession>()

export const { maybeUser: accessMaybeUserM } = T.deriveAccessM(AuthSession)([
  "maybeUser"
])

export function authenticated<R, E>(
  body: (request: HTTP.Request & { user: string }) => T.Effect<R, E, void>
) {
  return (request: HTTP.Request) =>
    accessMaybeUserM(
      O.fold(
        () =>
          T.fail<HTTP.HTTPRouteException | E>({
            _tag: "HTTPRouteException",
            status: 403,
            message: "Forbidden"
          }),
        (user) => body({ ...request, user })
      )
    )
}

export function add<R, E>(routes: HTTP.Routes<R & Has<AuthSession>, E>) {
  return pipe(
    routes,
    HTTP.addMiddleware((cont) => (request, next) =>
      T.provideService(AuthSession)({
        maybeUser:
          request.req.headers["authorization"] === "Secret" ? O.some("Michael") : O.none
      })(cont(request, next))
    )
  )
}
