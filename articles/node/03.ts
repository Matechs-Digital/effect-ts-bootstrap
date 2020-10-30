import * as T from "@effect-ts/core/Effect"
import * as MO from "@effect-ts/morphic"
import * as MOD from "@effect-ts/morphic/Decoder"

const MyCommand = MO.make((F) =>
  F.interface({
    type: F.stringLiteral("MyCommand"),
    data: F.nullable(F.string())
  })
)
const effect = (command: unknown) =>
  T.gen(function* (_) {
    const input = yield* _(MOD.decoder(MyCommand).decode(command))
    return input
  })
