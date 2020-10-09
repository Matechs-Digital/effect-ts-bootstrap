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

export interface PgClient {
  withClient: <R, E, A>(
    body: (_: PG.PoolClient) => T.Effect<R, E, A>
  ) => T.Effect<R & C.HasClock, E, A>
}

export const PgClient = has<PgClient>()

export const { withClient: withClientM } = T.deriveAccessM(PgClient)(["withClient"])
export const { withClient } = T.deriveAccess(PgClient)(["withClient"])

export const Live = pipe(
  T.accessService(PgConfig)((_) => new PG.Pool(_.config)),
  M.make((_) => T.fromPromiseDie(() => _.end())),
  M.map(
    (pool): PgClient => ({
      withClient: <R, E, A>(body: (_: PG.PoolClient) => T.Effect<R, E, A>) =>
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
