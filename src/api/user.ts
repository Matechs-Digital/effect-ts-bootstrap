import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { flow } from "@effect-ts/core/Function"

import { query } from "../db/Db"
import { encodeId, validateId } from "../model/common"
import {
  decodeUser,
  encodeCreateUser,
  encodeUser,
  validateCreateUser,
  validateUser
} from "../model/user"

export class UserNotFound {
  readonly _tag = "UserNotFound"
}

export const makeUserPersistence = () => ({
  getUser: flow(
    encodeId,
    T.chain(({ id }) => query(`SELECT * FROM users WHERE id = $1::bigint`, id)),
    T.chain((_) =>
      _.rows.length > 0 ? T.succeed(_.rows[0]) : T.fail(new UserNotFound())
    ),
    T.chain(flow(decodeUser, T.orDie))
  ),
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

export const { createUser, getUser, updateUser } = T.deriveLifted(UserPersistence)(
  ["createUser", "updateUser", "getUser"],
  [],
  []
)
