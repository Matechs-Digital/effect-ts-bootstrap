import * as O from "@effect-ts/core/Classic/Option"
import type { DecodingError } from "@effect-ts/morphic/Decoder/common"

import { credentialErrorIds } from "./credential"
import { userErrorIds } from "./user"

export const allErrorIds = {
  ...userErrorIds,
  ...credentialErrorIds
}

export const allErrors = (_: DecodingError) =>
  _.id != null && _.id in allErrorIds && _.message != null && _.message.length > 0
    ? O.some(_.message)
    : O.none
