import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import * as PG from "../db/PgClient"
import type { CreateUser } from "../model/user"
import { decodeUser } from "../model/user"

export function makeUserPersistence() {
  return {
    createUser(_: CreateUser) {
      return pipe(
        PG.accessM((db) =>
          T.fromPromiseDie(() =>
            db.query(`INSERT INTO users (name) VALUES ($1::text) RETURNING *`, [_.name])
          )
        ),
        T.chain((_) => T.orDie(decodeUser(_.rows[0])))
      )
    }
  }
}

export interface UserPersistence extends ReturnType<typeof makeUserPersistence> {}

export const UserPersistence = has<UserPersistence>()

export const Live = L.fromConstructor(UserPersistence)(makeUserPersistence)()

export const { createUser } = T.deriveLifted(UserPersistence)(["createUser"], [], [])
