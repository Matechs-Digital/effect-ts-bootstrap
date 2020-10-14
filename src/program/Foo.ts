import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"

// program

export interface Foo {
  foo: string
}

export const Foo = has<Foo>()

export const LiveFoo = L.create(Foo).pure({ foo: "foo!!" })

export const { foo: accessFooM } = T.deriveAccessM(Foo)(["foo"])
