import type { Has } from "@effect-ts/core/Classic/Has"
import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import type { Newtype } from "@effect-ts/core/Newtype"
import type { QueryResult, QueryResultRow } from "pg"

import type * as Pg from "./PgClient"
import { withPoolClientM } from "./PgPool"

export type Supported = number | string | Newtype<any, Supported> | null | undefined

export class LiveDb {
  constructor(readonly client: Pg.PgClient["client"]) {}

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

export interface Db extends LiveDb {}

export const Db = has<Db>()

export const provideDbFromPool = <R, E, A>(self: T.Effect<R & Has<Db>, E, A>) =>
  withPoolClientM((client) => pipe(self, T.provideService(Db)(new LiveDb(client))))

export const { query } = T.deriveLifted(Db)(["query"], [], [])

export function transaction<R, E, A>(
  body: T.Effect<R, E, A>
): T.Effect<R & Has<Db>, E, A> {
  return T.accessServiceM(Db)((_) => _.transaction(body))
}
