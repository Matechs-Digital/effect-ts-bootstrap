import type { Has } from "@effect-ts/core/Classic/Has"
import { has } from "@effect-ts/core/Classic/Has"
import type { Effect } from "@effect-ts/core/Effect"
import * as T from "@effect-ts/core/Effect"
import type { Clock } from "@effect-ts/core/Effect/Clock"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import type * as PG from "pg"

import { PgPool, withPoolClientM } from "./PgPool"

export interface PgClient {
  client: PG.ClientBase
}

export const PgClient = has<PgClient>()

export const { client: access } = T.deriveAccess(PgClient)(["client"])
export const { client: accessM } = T.deriveAccessM(PgClient)(["client"])

export function provide<R, E, A>(
  self: Effect<R & Has<PgClient>, E, A>
): Effect<R & Has<Clock> & Has<PgPool>, E, A> {
  return withPoolClientM((_) => T.provideService(PgClient)({ client: _ })(self))
}

export const Live = L.fromConstructorManaged(PgClient)(({ managedClient }: PgPool) =>
  M.map_(managedClient, (client) => ({ client }))
)(PgPool)
