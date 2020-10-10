import * as A from "@effect-ts/core/Classic/Array"
import type * as O from "@effect-ts/core/Classic/Option"
import * as S from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"
import type { M } from "@effect-ts/morphic"
import type { DecodingError } from "@effect-ts/morphic/Decoder/common"
import { encoder } from "@effect-ts/morphic/Encoder"
import { strictDecoder } from "@effect-ts/morphic/StrictDecoder"

export function validation<E, A>(
  F: M<{}, E, A>,
  collector: (_: DecodingError) => O.Option<string>
) {
  const decode = strictDecoder(F).decode
  const encode = encoder(F).encode

  return (u: A) =>
    pipe(
      u,
      encode,
      S.chain(decode),
      S.mapError(
        (d) => new ValidationError(A.filterMap_(d.errors, collector).join(", "))
      )
    )
}

export class ValidationError {
  readonly _tag = "ValidationError"
  readonly message: string
  constructor(message: string) {
    this.message = message.length === 0 ? "Unknown validation error" : message
  }
}
