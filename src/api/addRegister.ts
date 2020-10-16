import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import { fromPool } from "../db"
import * as HTTP from "../http"
import { Register } from "../model/api"
import { register } from "../persistence/transactions"

export const addRegister = HTTP.addRoute((r) => r.req.url === "/register")(() =>
  pipe(
    T.do,
    T.bind("body", () => HTTP.morphicBody(Register)),
    T.bind("user", ({ body }) => pipe(register(body), T.orDie, fromPool("main"))),
    T.chain(({ user }) =>
      HTTP.accessResM((res) =>
        T.effectTotal(() => {
          res.setHeader("content-type", "application/json")
          res.end(JSON.stringify(user))
        })
      )
    )
  )
)
