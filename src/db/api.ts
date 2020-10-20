import type { Has } from "@effect-ts/core/Classic/Has"
import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import type { QueryResult, QueryResultRow } from "pg"

import { deriveTenants } from "../tenants"
import * as Pg from "./client"
import type { Databases } from "./database"
import { databases } from "./database"

export const apis = deriveTenants(databases)

export type Supported = number | string | boolean | null | undefined

export function makeLiveDb<K extends Databases>(db: K): () => Db<K> {
  const query = (queryString: string, ...args: Supported[]) =>
    Pg.accessClientM(db)((client) =>
      T.fromPromiseDie(
        (): Promise<QueryResult<QueryResultRow>> => client.query(queryString, args)
      )
    )

  const transaction = <R, E, A>(body: T.Effect<R, E, A>) =>
    T.bracketExit_(
      query("BEGIN"),
      () => body,
      (_, e) => (e._tag === "Success" ? query("COMMIT") : query("ROLLBACK"))
    )

  return () => ({
    query,
    transaction
  })
}

export interface Db<K extends Databases> {
  query: (
    queryString: string,
    ...args: Supported[]
  ) => T.RIO<Has<Pg.PgClient<K>>, QueryResult<QueryResultRow>>

  transaction: <R, E, A>(
    body: T.Effect<R, E, A>
  ) => T.Effect<R & Has<Pg.PgClient<K>>, E, A>
}

export const Db = <K extends Databases>(db: K) => has<Db<K>>().setKey(apis[db])

export const DbLive = <K extends Databases>(db: K) =>
  L.fromConstructor(Db(db))(makeLiveDb(db))()
