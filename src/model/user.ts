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
import { validation } from "./validation"

export const userErrorIds = {
  ...commonErrorIds,
  email_length: "email_length"
}

const CreateUser_ = make((F) =>
  F.interface({
    email: F.string({
      conf: {
        [FastCheckURI]: (_, { module: fc }) =>
          fc.string({ minLength: 1, maxLength: 255 }),
        [DecoderURI]: (_) => ({
          decode: flow(
            _.decode,
            S.chain((s) =>
              s.length > 0 && s.length <= 255
                ? S.succeed(s)
                : fail([
                    {
                      actual: s,
                      id: userErrorIds.email_length,
                      name: "email",
                      message: "email should be between 0 and 255 characters long"
                    }
                  ])
            )
          )
        })
      }
    })
  })
)

export interface CreateUser extends AType<typeof CreateUser_> {}
export interface CreateUserRaw extends EType<typeof CreateUser_> {}

export const CreateUser = opaque<CreateUserRaw, CreateUser>()(CreateUser_)

const User_ = make((F) => F.intersection([Id(F), CreateUser(F), Common(F)]))

export interface User extends AType<typeof User_> {}
export interface UserRaw extends EType<typeof User_> {}

export const User = opaque<UserRaw, User>()(User_)

export const decodeUser = strictDecoder(User).decode
export const encodeUser = encoder(User).encode
export const encodeCreateUser = encoder(CreateUser).encode
export const decodeCreateUser = strictDecoder(CreateUser).decode

export const userErrors = (_: DecodingError) =>
  _.id != null && _.id in userErrorIds && _.message != null && _.message.length > 0
    ? O.some(_.message)
    : O.none

export const validateUser = validation(User, userErrors)
export const validateCreateUser = validation(CreateUser, userErrors)

const UserId_ = make((F) =>
  F.interface({
    userId: F.number()
  })
)

export interface UserId extends AType<typeof UserId_> {}
export interface UserIdRaw extends EType<typeof UserId_> {}

export const UserId = opaque<UserIdRaw, UserId>()(UserId_)
