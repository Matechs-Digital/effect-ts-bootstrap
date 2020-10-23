import * as T from "@effect-ts/core/Effect"
import type * as C from "@effect-ts/core/Effect/Clock"
import * as L from "@effect-ts/core/Effect/Layer"
import type { Managed } from "@effect-ts/core/Effect/Managed"
import * as M from "@effect-ts/core/Effect/Managed"
import * as S from "@effect-ts/core/Effect/Schedule"
import { identity, pipe } from "@effect-ts/core/Function"
import { tag } from "@effect-ts/core/Has"
import * as PG from "pg"

import { deriveTenants } from "../tenants"
import { withConfig } from "./config"
import type { Databases } from "./database"
import { databases } from "./database"

export const pools = deriveTenants(databases)

export interface PgPool<K extends Databases> {
  _tag: K
  withPoolClientM: <R, E, A>(
    body: (_: PG.PoolClient) => T.Effect<R, E, A>
  ) => T.Effect<R & C.HasClock, E, A>
  managedClient: Managed<C.HasClock, never, PG.PoolClient>
}

export const PgPool = <K extends Databases>(_: K) => tag<PgPool<K>>().setKey(pools[_])

export function withPoolClientM<K extends Databases>(_: K) {
  return <R, E, A>(body: (_: PG.PoolClient) => T.Effect<R, E, A>) =>
    T.accessServiceM(PgPool(_))((_) => _.withPoolClientM(body))
}

export function clientFromPool<K extends Databases>(db: K) {
  return pipe(
    M.fromEffect(T.accessService(PgPool(db))((_) => _.managedClient)),
    M.chain(identity)
  )
}

export const PgPoolLive = <K extends Databases>(db: K) =>
  pipe(
    withConfig(db)((_) => new PG.Pool(_)),
    M.make((_) => T.fromPromiseDie(() => _.end())),
    M.map(
      (pool): PgPool<K> => ({
        _tag: db,
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
    L.fromManaged(PgPool(db))
  )
