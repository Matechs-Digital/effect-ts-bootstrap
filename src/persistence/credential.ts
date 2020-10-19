import "@effect-ts/core/Operators"

import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"

import { hashPassword } from "../crypto"
import { query } from "../db"
import type { Id } from "../model/common"
import { encodeId, validateId } from "../model/common"
import type { CreateCredential, UpdateCredential } from "../model/credential"
import {
  decodeCredential,
  validateCreateCredential,
  validateUpdateCredential
} from "../model/credential"

export class CredentialNotFound {
  readonly _tag = "CredentialNotFound"
}

export const makeCredentialPersistence = () => ({
  getCredential: (i: Id) =>
    T.gen(function* (_) {
      yield* _(validateId(i))
      const { id } = yield* _(encodeId(i))
      const result = yield* _(
        query("main")(
          `SELECT * FROM "public"."credentials" WHERE "id" = $1::integer`,
          id
        )
      )
      const credential = yield* _(
        result.rows.length > 0
          ? T.succeed(result.rows[0])
          : T.fail(new CredentialNotFound())
      )
      return yield* _(decodeCredential(credential)["|>"](T.orDie))
    }),
  createCredential: (i: CreateCredential) =>
    T.gen(function* (_) {
      yield* _(validateCreateCredential(i))
      const hash = yield* _(hashPassword(i.password))
      const result = yield* _(
        query("main")(
          `INSERT INTO "public"."credentials" ("userId", "hash") VALUES ($1::integer, $2::text) RETURNING *`,
          i.userId,
          hash
        )
      )
      return yield* _(decodeCredential(result.rows[0])["|>"](T.orDie))
    }),
  updateCredential: (i: UpdateCredential) =>
    T.gen(function* (_) {
      yield* _(validateUpdateCredential(i))
      const hash = yield* _(hashPassword(i.password))
      const result = yield* _(
        query("main")(
          `UPDATE "public"."credentials" SET "hash" = $1::text WHERE "id" = $2::integer RETURNING *`,
          hash,
          i.id
        )
      )
      return yield* _(decodeCredential(result.rows[0])["|>"](T.orDie))
    })
})

export interface CredentialPersistence
  extends ReturnType<typeof makeCredentialPersistence> {}

export const CredentialPersistence = has<CredentialPersistence>()

export const CredentialPersistenceLive = L.fromConstructor(CredentialPersistence)(
  makeCredentialPersistence
)()

export const { createCredential, getCredential, updateCredential } = T.deriveLifted(
  CredentialPersistence
)(["createCredential", "updateCredential", "getCredential"], [], [])
