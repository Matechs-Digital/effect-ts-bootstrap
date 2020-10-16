import type { AType, EType } from "@effect-ts/morphic"
import { make, opaque } from "@effect-ts/morphic"

import { PasswordField } from "./credential"
import { CreateUser } from "./user"

const Register_ = make((F) => F.intersection([CreateUser(F), PasswordField(F)]))

export interface Register extends AType<typeof Register_> {}
export interface RegisterRaw extends EType<typeof Register_> {}

export const Register = opaque<RegisterRaw, Register>()(Register_)
