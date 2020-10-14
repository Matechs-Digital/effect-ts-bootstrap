import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"

export interface Bar {
  bar: string
}

export const Bar = has<Bar>()

export const LiveBar = L.create(Bar).pure({ bar: "bar!!" })

export const { bar: accessBarM } = T.deriveAccessM(Bar)(["bar"])
