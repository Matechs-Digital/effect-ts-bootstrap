import * as O from "@effect-ts/core/Classic/Option"
import * as S from "@effect-ts/core/Classic/Sync"
import { flow } from "@effect-ts/core/Function"
import type { AType, EType } from "@effect-ts/morphic"
import { DecoderURI, FastCheckURI, make, opaque } from "@effect-ts/morphic"
import type { DecodingError } from "@effect-ts/morphic/Decoder/common"
import { fail } from "@effect-ts/morphic/Decoder/common"
import { encoder } from "@effect-ts/morphic/Encoder"
import { strictDecoder } from "@effect-ts/morphic/StrictDecoder"

import { Common, commonErrorIds, Id } from "./common"
import { UserId } from "./user"
import { validation } from "./validation"

export const credentialErrorIds = {
  ...commonErrorIds,
  password_length: "password_length"
}

const Password_ = make((F) =>
  F.interface({
    password: F.string({
      conf: {
        [FastCheckURI]: (_, { module: fc }) =>
          fc.string({ minLength: 8, maxLength: 32 }),
        [DecoderURI]: (_) => ({
          decode: flow(
            _.decode,
            S.chain((s) =>
              s.length > 8 && s.length <= 32
                ? S.succeed(s)
                : fail([
                    {
                      actual: s,
                      id: credentialErrorIds.password_length,
                      name: "password",
                      message: "password should be have between 8 and 32 characters"
                    }
                  ])
            )
          )
        })
      }
    })
  })
)

export interface Password extends AType<typeof Password_> {}
export interface PasswordRaw extends EType<typeof Password_> {}

export const Password = opaque<PasswordRaw, Password>()(Password_)

const CreateCredential_ = make((F) => F.intersection([UserId(F), Password(F)]))

export interface CreateCredential extends AType<typeof CreateCredential_> {}
export interface CreateCredentialRaw extends EType<typeof CreateCredential_> {}

export const CreateCredential = opaque<CreateCredentialRaw, CreateCredential>()(
  CreateCredential_
)

const CredentialHash_ = make((F) =>
  F.interface({
    hash: F.string()
  })
)

export interface CredentialHash extends AType<typeof CredentialHash_> {}
export interface CredentialHashRaw extends EType<typeof CredentialHash_> {}

export const CredentialHash = opaque<CredentialHashRaw, CredentialHash>()(
  CredentialHash_
)

const Credential_ = make((F) => F.intersection([Id(F), CredentialHash(F), Common(F)]))

export interface Credential extends AType<typeof Credential_> {}
export interface CredentialRaw extends EType<typeof Credential_> {}

export const Credential = opaque<CredentialRaw, Credential>()(Credential_)

const UpdateCredential_ = make((F) => F.intersection([Id(F), CreateCredential(F)]))

export interface UpdateCredential extends AType<typeof UpdateCredential_> {}
export interface UpdateCredentialRaw extends EType<typeof UpdateCredential_> {}

export const UpdateCredential = opaque<UpdateCredentialRaw, UpdateCredential>()(
  UpdateCredential_
)

export const decodeCredential = strictDecoder(Credential).decode
export const encodeCredential = encoder(Credential).encode
export const decodeUpdateCredential = strictDecoder(UpdateCredential).decode
export const encodeUpdateCredential = encoder(UpdateCredential).encode
export const encodeCreateCredential = encoder(CreateCredential).encode
export const decodeCreateCredential = strictDecoder(CreateCredential).decode

export const credentialErrors = (_: DecodingError) =>
  _.id != null &&
  _.id in credentialErrorIds &&
  _.message != null &&
  _.message.length > 0
    ? O.some(_.message)
    : O.none

export const validateCredential = validation(Credential, credentialErrors)
export const validateUpdateCredential = validation(UpdateCredential, credentialErrors)
export const validateCreateCredential = validation(CreateCredential, credentialErrors)
