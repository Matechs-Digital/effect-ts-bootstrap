import * as T from "@effect-ts/core/Effect"

import { PBKDF2Config } from "../../src/crypto"

export const quickPBKDF2 = T.replaceService(PBKDF2Config, (_) => ({
  ..._,
  iterations: 1
}))
