import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import { fromPool } from "../db"
import { addRoute, matchRegex, morphicBody, morphicResponse } from "../http"
import { Register } from "../model/api"
import { User } from "../model/user"
import { register } from "../persistence/transactions"

export const addRegistration = addRoute(matchRegex(/^\/register$/, ["POST"]))(() =>
  T.gen(function* (_) {
    const body = yield* _(morphicBody(Register))
    const user = yield* _(pipe(register(body), T.orDie, fromPool("main")))

    return yield* _(morphicResponse(User)(user))
  })
)
