import type { Effect } from "@effect-ts/core/Effect"
import * as T from "@effect-ts/core/Effect"
import type { Clock } from "@effect-ts/core/Effect/Clock"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import type { Has } from "@effect-ts/core/Has"
import { tag } from "@effect-ts/core/Has"
import type * as PG from "pg"

import { deriveTenants } from "../tenants"
import type { Databases } from "./database"
import { databases } from "./database"
import { PgPool, withPoolClientM } from "./pool"

export const clients = deriveTenants(databases)

export interface PgClient<K> {
  _tag: K
  client: PG.ClientBase
}

export const PgClient = <K extends Databases>(db: K) =>
  tag<PgClient<K>>().setKey(clients[db])

export function accessClient<K extends Databases>(db: K) {
  return T.deriveAccess(PgClient(db))(["client"]).client
}

export function accessClientM<K extends Databases>(db: K) {
  return T.deriveAccessM(PgClient(db))(["client"]).client
}

export function withPoolClient<K extends Databases>(db: K) {
  return <R, E, A>(
    self: Effect<R & Has<PgClient<K>>, E, A>
  ): Effect<R & Has<Clock> & Has<PgPool<K>>, E, A> =>
    withPoolClientM(db)((_) =>
      T.provideService(PgClient(db))({ _tag: db, client: _ })(self)
    )
}

export const PgClientLive = <K extends Databases>(db: K) =>
  L.fromConstructorManaged(PgClient(db))(({ managedClient }: PgPool<K>) =>
    M.map_(managedClient, (client) => ({ client, _tag: db }))
  )(PgPool(db))
