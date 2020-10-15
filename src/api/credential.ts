import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { flow, pipe } from "@effect-ts/core/Function"

import { hashPassword } from "../crypto"
import { query } from "../db/Db"
import { encodeId, validateId } from "../model/common"
import type { CreateCredential, UpdateCredential } from "../model/credential"
import { decodeCredential, validateCreateCredential } from "../model/credential"

export class CredentialNotFound {
  readonly _tag = "CredentialNotFound"
}

export const makeCredentialPersistence = () => ({
  getCredential: flow(
    validateId,
    T.chain(encodeId),
    T.chain(({ id }) =>
      query(`SELECT * FROM "public"."credentials" WHERE "id" = $1::bigint`, id)
    ),
    T.chain((_) =>
      _.rows.length > 0 ? T.succeed(_.rows[0]) : T.fail(new CredentialNotFound())
    ),
    T.chain(flow(decodeCredential, T.orDie))
  ),
  createCredential: (_: CreateCredential) =>
    pipe(
      T.do,
      T.tap(() => validateCreateCredential(_)),
      T.bind("hash", () => hashPassword(_.password)),
      T.chain(({ hash }) =>
        query(
          `INSERT INTO "public"."credentials" ("userId", "hash") VALUES ($1::integer, $2::text) RETURNING *`,
          _.userId,
          hash
        )
      ),
      T.map((_) => _.rows[0]),
      T.chain(flow(decodeCredential, T.orDie))
    ),
  updateCredential: (_: UpdateCredential) =>
    pipe(
      T.do,
      T.tap(() => validateCreateCredential(_)),
      T.bind("hash", () => hashPassword(_.password)),
      T.chain(({ hash }) =>
        query(
          `UPDATE "public"."credentials" SET "hash" = $1::text VALUES ($1::text) WHERE "userId" = $2::text RETURNING *`,
          hash,
          _.userId
        )
      ),
      T.map((_) => _.rows[0]),
      T.chain(flow(decodeCredential, T.orDie))
    )
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
