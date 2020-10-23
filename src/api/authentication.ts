import type { Option } from "@effect-ts/core/Classic/Option"
import * as O from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import type { Has } from "@effect-ts/core/Has"
import { tag } from "@effect-ts/core/Has"

import * as HTTP from "../http"

export interface AuthSession {
  maybeUser: Option<string>
}

export const AuthSession = tag<AuthSession>()

export const { maybeUser: accessMaybeUserM } = T.deriveAccessM(AuthSession)([
  "maybeUser"
])

export const authenticatedUser = accessMaybeUserM(
  O.fold(
    () =>
      T.fail<HTTP.HTTPRouteException>({
        _tag: "HTTPRouteException",
        status: 403,
        message: "Forbidden"
      }),
    T.succeed
  )
)

export function addAuthMiddleware<R, E>(routes: HTTP.Routes<R & Has<AuthSession>, E>) {
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
