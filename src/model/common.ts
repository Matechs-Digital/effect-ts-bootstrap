import { succeed } from "@effect-ts/core/Classic/Sync"
import type { AType, EType } from "@effect-ts/morphic"
import { DecoderURI, make, opaque } from "@effect-ts/morphic"

const Common_ = make((F) =>
  F.interface({
    id: F.number(),
    createdAt: F.date({
      conf: {
        [DecoderURI]: (_) => ({
          decode: (u) => (u instanceof Date ? succeed(u) : _.decode(u))
        })
      }
    })
  })
)

export interface Common extends AType<typeof Common_> {}
export interface CommonRaw extends EType<typeof Common_> {}

export const Common = opaque<CommonRaw, Common>()(Common_)
