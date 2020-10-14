import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import { Server } from "../http"

// program

export function LiveProgram({ queue }: Server) {
  return {
    main: pipe(
      queue.take,
      T.chain(({ req, res }) =>
        pipe(
          T.effectTotal(() => {
            console.log(`Process: ${req.url}`)
            res.end("ok")
          }),
          T.delay(200),
          T.fork
        )
      ),
      T.forever
    )
  }
}

export interface Program extends ReturnType<typeof LiveProgram> {}

export const Program = has<Program>()

export const Live = L.fromConstructor(Program)(LiveProgram)(Server)

export const { main } = T.deriveLifted(Program)([], ["main"], [])
