import "@effect-ts/core/Operators"

import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { flow } from "@effect-ts/core/Function"
import { tag } from "@effect-ts/core/Has"
import type { _A } from "@effect-ts/core/Utils"

import { Db } from "../db"
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

export const makeUserPersistence = T.gen(function* (_) {
  const { query } = yield* _(Db("main"))

  return {
    getUser: flow(
      validateId,
      T.chain(encodeId),
      T.chain(({ id }) => query(`SELECT * FROM users WHERE id = $1::integer`, id)),
      T.chain((_) =>
        _.rows.length > 0 ? T.succeed(_.rows[0]) : T.fail(new UserNotFound())
      ),
      T.chain(decodeUser[">>"](T.orDie))
    ),
    createUser: flow(
      validateCreateUser,
      T.chain(encodeCreateUser),
      T.chain(({ email }) =>
        query(`INSERT INTO users (email) VALUES ($1::text) RETURNING *`, email)
      ),
      T.map((_) => _.rows[0]),
      T.chain(decodeUser[">>"](T.orDie))
    ),
    updateUser: flow(
      validateUser,
      T.chain(encodeUser),
      T.chain(({ email, id }) =>
        query(
          `UPDATE users SET email = $1::text WHERE id = $2::integer RETURNING *`,
          email,
          id
        )
      ),
      T.map((_) => _.rows[0]),
      T.chain(decodeUser[">>"](T.orDie))
    )
  }
})

export interface UserPersistence extends _A<typeof makeUserPersistence> {}

export const UserPersistence = tag<UserPersistence>()

export const UserPersistenceLive = L.fromEffect(UserPersistence)(makeUserPersistence)

export const { createUser, getUser, updateUser } = T.deriveLifted(UserPersistence)(
  ["createUser", "updateUser", "getUser"],
  [],
  []
)
