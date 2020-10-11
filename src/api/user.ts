import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { flow } from "@effect-ts/core/Function"

import { query } from "../db/Db"
import {
  decodeUser,
  encodeCreateUser,
  encodeUser,
  validateCreateUser,
  validateUser
} from "../model/user"

export const makeUserPersistence = () => ({
  createUser: flow(
    validateCreateUser,
    T.chain(encodeCreateUser),
    T.chain(({ name }) =>
      query(`INSERT INTO users (name) VALUES ($1::text) RETURNING *`, name)
    ),
    T.map((_) => _.rows[0]),
    T.chain(flow(decodeUser, T.orDie))
  ),
  updateUser: flow(
    validateUser,
    T.chain(encodeUser),
    T.chain(({ id, name }) =>
      query(
        `UPDATE users SET name = $1::text WHERE id = $2::bigint RETURNING *`,
        name,
        id
      )
    ),
    T.map((_) => _.rows[0]),
    T.chain(flow(decodeUser, T.orDie))
  )
})

export interface UserPersistence extends ReturnType<typeof makeUserPersistence> {}

export const UserPersistence = has<UserPersistence>()

export const Live = L.fromConstructor(UserPersistence)(makeUserPersistence)()

export const { createUser, updateUser } = T.deriveLifted(UserPersistence)(
  ["createUser", "updateUser"],
  [],
  []
)
