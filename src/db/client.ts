import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import { pipe } from "@effect-ts/core/Function"
import * as PG from "pg"

export interface PgConfig {
  config: PG.ClientConfig
}

export const PgConfig = has<PgConfig>()

export interface PgClient {
  client: <R, E, A>(_: (_: PG.PoolClient) => T.Effect<R, E, A>) => T.Effect<R, E, A>
}

export const PgClient = has<PgClient>()

export const { client: accessClientM } = T.deriveAccessM(PgClient)(["client"])
export const { client: accessClient } = T.deriveAccess(PgClient)(["client"])

export const Live = pipe(
  T.accessService(PgConfig)((_) => new PG.Pool(_.config)),
  M.make((_) => T.fromPromiseDie(() => _.end())),
  M.map((pool) => ({
    client: <R, E, A>(_: (_: PG.PoolClient) => T.Effect<R, E, A>) =>
      T.bracket_(
        T.fromPromiseDie(() => pool.connect()),
        (p) => _(p),
        (p) => T.effectTotal(() => p.release())
      )
  })),
  L.fromManaged(PgClient)
)
