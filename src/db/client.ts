import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import type * as C from "@effect-ts/core/Effect/Clock"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as S from "@effect-ts/core/Effect/Schedule"
import { pipe } from "@effect-ts/core/Function"
import * as PG from "pg"

export interface PgConfig {
  config: PG.ClientConfig
}

export const PgConfig = has<PgConfig>()

export const { config: withConfig } = T.deriveAccess(PgConfig)(["config"])

export interface PgClient {
  withClientM: <R, E, A>(
    body: (_: PG.PoolClient) => T.Effect<R, E, A>
  ) => T.Effect<R & C.HasClock, E, A>
}

export const PgClient = has<PgClient>()

export function withClientM<R, E, A>(body: (_: PG.PoolClient) => T.Effect<R, E, A>) {
  return T.accessServiceM(PgClient)((_) => _.withClientM(body))
}

export const Live = pipe(
  withConfig((_) => new PG.Pool(_)),
  M.make((_) => T.fromPromiseDie(() => _.end())),
  M.map(
    (pool): PgClient => ({
      withClientM: <R, E, A>(body: (_: PG.PoolClient) => T.Effect<R, E, A>) =>
        T.bracket_(
          T.orDie(
            T.retry_(
              T.fromPromise(() => pool.connect()),
              S.whileOutput_(S.exponential(100), (n) => n < 1000)
            )
          ),
          (p) => body(p),
          (p) => T.effectTotal(() => p.release())
        )
    })
  ),
  L.fromManaged(PgClient)
)
