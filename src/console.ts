import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"

export function LiveConsole() {
  return {
    log: (s: string) =>
      T.effectTotal(() => {
        console.log(s)
      })
  }
}

export interface Console extends ReturnType<typeof LiveConsole> {}

export const Console = has<Console>()

export const { log } = T.deriveLifted(Console)(["log"], [], [])

export const Live = L.create(Console).fromEffect(T.effectTotal(LiveConsole))
