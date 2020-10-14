import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import type { HTTPRouteException } from "../exceptions"
import { isHTTPRouteException } from "../exceptions"
import * as HTTP from "../router"

export function addHTTPRouteExceptionHandler<R, E>(routes: HTTP.Routes<R, E>) {
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

export function drain<R>(_: HTTP.Routes<R, HTTPRouteException>) {
  return HTTP.drain(addHTTPRouteExceptionHandler(_))
}
