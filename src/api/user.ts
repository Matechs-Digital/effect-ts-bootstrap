import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { flow } from "@effect-ts/core/Function"

import type { Migrations } from "../db/Migrations"
import * as PG from "../db/PgClient"
import { decodeUser, validateCreateUser } from "../model/user"

export interface UserMigrations extends Migrations {
  _tag: "UserMigrations"
}

export const UserMigrations = has<UserMigrations>()

export const makeUserPersistence = (_: UserMigrations) => ({
  createUser: flow(
    validateCreateUser,
    T.chain(({ name }) =>
      PG.accessM((db) =>
        T.fromPromiseDie(async () => {
          const result = await db.query(
            `INSERT INTO users (name) VALUES ($1::text) RETURNING *`,
            [name]
          )
          return result.rows[0]
        })
      )
    ),
    T.chain(flow(decodeUser, T.orDie))
  )
})

export interface UserPersistence extends ReturnType<typeof makeUserPersistence> {}

export const UserPersistence = has<UserPersistence>()

export const Live = L.fromConstructor(UserPersistence)(makeUserPersistence)(
  UserMigrations
)

export const { createUser } = T.deriveLifted(UserPersistence)(["createUser"], [], [])
