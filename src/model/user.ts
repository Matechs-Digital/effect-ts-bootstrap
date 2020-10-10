import * as O from "@effect-ts/core/Classic/Option"
import * as S from "@effect-ts/core/Classic/Sync"
import { flow } from "@effect-ts/core/Function"
import type { AType, EType } from "@effect-ts/morphic"
import { DecoderURI, make, opaque } from "@effect-ts/morphic"
import type { DecodingError } from "@effect-ts/morphic/Decoder/common"
import { fail } from "@effect-ts/morphic/Decoder/common"
import { encoder } from "@effect-ts/morphic/Encoder"
import { strictDecoder } from "@effect-ts/morphic/StrictDecoder"

import { Common } from "./common"
import { validation } from "./validation"

const ids = {
  user_name_length: "user_name_length"
}

const CreateUser_ = make((F) =>
  F.interface({
    name: F.string({
      conf: {
        [DecoderURI]: (_) => ({
          decode: flow(
            _.decode,
            S.chain((s) =>
              s.length > 0 && s.length < 255
                ? S.succeed(s)
                : fail([
                    {
                      actual: s,
                      id: ids.user_name_length,
                      name: "user_name",
                      message: "name should be between 0 and 255 characters long"
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

const User_ = make((F) => F.intersection([CreateUser(F), Common(F)]))

export interface User extends AType<typeof User_> {}
export interface UserRaw extends EType<typeof User_> {}

export const User = opaque<UserRaw, User>()(User_)

export const decodeUser = strictDecoder(User).decode
export const encodeUser = encoder(User).encode

export const userErrors = (_: DecodingError) =>
  _.id != null && _.id in ids && _.message != null && _.message.length > 0
    ? O.some(_.message)
    : O.none

export const validateUser = validation(User, userErrors)

export const validateCreateUser = validation(CreateUser, userErrors)
