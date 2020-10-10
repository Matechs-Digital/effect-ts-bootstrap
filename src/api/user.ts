import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import * as PG from "../db/PgClient"
import type { CreateUser } from "../model/user"
import { decodeUser } from "../model/user"

export function createUser(_: CreateUser) {
  return pipe(
    PG.accessM((db) =>
      T.fromPromiseDie(() =>
        db.query(`INSERT INTO users (name) VALUES ($1::text) RETURNING *`, [_.name])
      )
    ),
    T.chain((_) => T.orDie(decodeUser(_.rows[0])))
  )
}
