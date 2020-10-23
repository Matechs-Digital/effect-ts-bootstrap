import * as T from "@effect-ts/core/Effect"
import type { Clock } from "@effect-ts/core/Effect/Clock"
import * as L from "@effect-ts/core/Effect/Layer"
import type { Has } from "@effect-ts/core/Has"
import { tag } from "@effect-ts/core/Has"
import type { QueryResult, QueryResultRow } from "pg"

import { deriveTenants } from "../tenants"
import * as Pg from "./client"
import type { Databases } from "./database"
import { databases } from "./database"
import { PgPool } from "./pool"

export const apis = deriveTenants(databases)

export type Supported = number | string | boolean | null | undefined

export function makeLiveDb<K extends Databases>(db: K) {
  return T.gen(function* (_) {
    const { withPoolClientM } = yield* _(PgPool(db))

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

    function withPoolClient<R, E, A>(self: T.Effect<R & Has<Pg.PgClient<K>>, E, A>) {
      return withPoolClientM((_) =>
        T.provideService(Pg.PgClient(db))({ _tag: db, client: _ })(self)
      )
    }

    return {
      query,
      transaction,
      withPoolClient
    }
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

  withPoolClient: <R, E, A>(
    self: T.Effect<R & Has<Pg.PgClient<K>>, E, A>
  ) => T.Effect<R & Has<Clock> & Has<PgPool<K>>, E, A>
}

export const Db = <K extends Databases>(db: K) => tag<Db<K>>().setKey(apis[db])

export const DbLive = <K extends Databases>(db: K) =>
  L.fromEffect(Db(db))(makeLiveDb(db))
