import type { Has } from "@effect-ts/core/Classic/Has"
import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import type { QueryResult, QueryResultRow } from "pg"

import { deriveTenants } from "../tenants"
import type * as Pg from "./client"
import type { Databases } from "./database"
import { databases } from "./database"
import { withPoolClientM } from "./pool"

export const apis = deriveTenants(databases)

export type Supported = number | string | boolean | null | undefined

export class LiveDb<K extends Databases> {
  constructor(private readonly client: Pg.PgClient<K>["client"]) {}

  query(queryString: string, ...args: Supported[]) {
    return T.fromPromiseDie(
      (): Promise<QueryResult<QueryResultRow>> => this.client.query(queryString, args)
    )
  }

  transaction<R, E, A>(body: T.Effect<R, E, A>) {
    return T.bracketExit_(
      this.query("BEGIN"),
      () => body,
      (_, e) => (e._tag === "Success" ? this.query("COMMIT") : this.query("ROLLBACK"))
    )
  }
}

export interface Db<K extends Databases> extends LiveDb<K> {}

export const Db = <K extends Databases>(db: K) => has<Db<K>>().setKey(apis[db])

export const fromPool = <K extends Databases>(db: K) => <R, E, A>(
  self: T.Effect<R & Has<Db<K>>, E, A>
) =>
  withPoolClientM(db)((client) =>
    pipe(self, T.provideService(Db(db))(new LiveDb(client)))
  )

export function query<K extends Databases>(db: K) {
  return T.deriveLifted(Db(db))(["query"], [], []).query
}

export function transaction<K extends Databases>(db: K) {
  return <R, E, A>(body: T.Effect<R, E, A>): T.Effect<R & Has<Db<K>>, E, A> =>
    T.accessServiceM(Db(db))((_) => _.transaction(body))
}
