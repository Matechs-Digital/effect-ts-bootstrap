import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { flow } from "@effect-ts/core/Function"

import { query } from "../db/Db"
import { decodeUser, validateCreateUser } from "../model/user"

export const makeUserPersistence = () => ({
  createUser: flow(
    validateCreateUser,
    T.chain(({ name }) =>
      query(`INSERT INTO users (name) VALUES ($1::text) RETURNING *`, name)
    ),
    T.map((_) => _.rows[0]),
    T.chain(flow(decodeUser, T.orDie))
  )
})

export interface UserPersistence extends ReturnType<typeof makeUserPersistence> {}

export const UserPersistence = has<UserPersistence>()

export const Live = L.fromConstructor(UserPersistence)(makeUserPersistence)()

export const { createUser } = T.deriveLifted(UserPersistence)(["createUser"], [], [])
