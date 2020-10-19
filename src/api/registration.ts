import "@effect-ts/core/Operators"

import * as T from "@effect-ts/core/Effect"

import * as Db from "../db"
import { addRoute, jsonBody, jsonResponse, matchRegex } from "../http"
import { Register } from "../model/api"
import { User } from "../model/user"
import { register } from "../persistence/transactions"

export const addRegistration = addRoute(matchRegex(/^\/register$/, ["POST"]))(() =>
  T.gen(function* (_) {
    const body = yield* _(jsonBody(Register))
    const user = yield* _(register(body)["|>"](T.orDie)["|>"](Db.fromPool("main")))

    return yield* _(jsonResponse(User)(user))
  })
)
