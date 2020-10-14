import * as Morph from "@effect-ts/morphic"
import * as Guard from "@effect-ts/morphic/Guard"

export interface HTTPRouteException extends Morph.AType<typeof HTTPRouteException_> {}

const HTTPRouteException_ = Morph.make((F) =>
  F.interface({
    _tag: F.stringLiteral("HTTPRouteException"),
    message: F.string(),
    status: F.number()
  })
)

export const HTTPRouteException = Morph.opaque_<HTTPRouteException>()(
  HTTPRouteException_
)

export const isHTTPRouteException = Guard.guard(HTTPRouteException).is
