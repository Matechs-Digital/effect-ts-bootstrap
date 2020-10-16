import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import { fromPool } from "../db"
import { addRoute, matchRegex, morphicBody, morphicResponse } from "../http"
import { Register } from "../model/api"
import { User } from "../model/user"
import { register } from "../persistence/transactions"

export const addRegistration = addRoute(matchRegex(/^\/register$/, ["POST"]))(() =>
  pipe(
    T.do,
    T.bind("body", () => morphicBody(Register)),
    T.bind("user", ({ body }) => pipe(register(body), T.orDie, fromPool("main"))),
    T.chain(({ user }) => morphicResponse(User)(user))
  )
)
