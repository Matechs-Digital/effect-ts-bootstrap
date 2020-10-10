import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import type * as C from "@effect-ts/core/Effect/Clock"
import * as L from "@effect-ts/core/Effect/Layer"
import type { Managed } from "@effect-ts/core/Effect/Managed"
import * as M from "@effect-ts/core/Effect/Managed"
import * as S from "@effect-ts/core/Effect/Schedule"
import { pipe } from "@effect-ts/core/Function"
import * as PG from "pg"

import { withConfig } from "./PgConfig"

export interface PgPool {
  withPoolClientM: <R, E, A>(
    body: (_: PG.PoolClient) => T.Effect<R, E, A>
  ) => T.Effect<R & C.HasClock, E, A>
  managedClient: Managed<C.HasClock, never, PG.PoolClient>
}

export const PgPool = has<PgPool>()

export function withPoolClientM<R, E, A>(
  body: (_: PG.PoolClient) => T.Effect<R, E, A>
) {
  return T.accessServiceM(PgPool)((_) => _.withPoolClientM(body))
}

export const Live = pipe(
  withConfig((_) => new PG.Pool(_)),
  M.make((_) => T.fromPromiseDie(() => _.end())),
  M.map(
    (pool): PgPool => ({
      withPoolClientM: (body) =>
        T.bracket_(
          T.orDie(
            T.retry_(
              T.fromPromise(() => pool.connect()),
              S.whileOutput_(S.exponential(100), (n) => n < 1000)
            )
          ),
          body,
          (p) => T.effectTotal(() => p.release())
        ),
      managedClient: M.makeExit_(
        T.orDie(
          T.retry_(
            T.fromPromise(() => pool.connect()),
            S.whileOutput_(S.exponential(100), (n) => n < 1000)
          )
        ),
        (p) => T.effectTotal(() => p.release())
      )
    })
  ),
  L.fromManaged(PgPool)
)
