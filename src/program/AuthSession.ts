import { has } from "@effect-ts/core/Classic/Has"
import type { Option } from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Effect"

export interface AuthSession {
  maybeUser: Option<string>
}

export const AuthSession = has<AuthSession>()

export const { maybeUser: accessMaybeUserM } = T.deriveAccessM(AuthSession)([
  "maybeUser"
])
