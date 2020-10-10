import type { AType, EType } from "@effect-ts/morphic"
import { make, opaque } from "@effect-ts/morphic"
import { encoder } from "@effect-ts/morphic/Encoder"
import { strictDecoder } from "@effect-ts/morphic/StrictDecoder"

import { Common } from "./common"

const CreateUser_ = make((F) =>
  F.interface({
    name: F.string()
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
