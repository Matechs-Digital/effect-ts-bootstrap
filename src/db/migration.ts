import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import { tag } from "@effect-ts/core/Has"
import * as PGM from "node-pg-migrate"
import type * as MIG from "node-pg-migrate/dist/migration"
import * as path from "path"

import { deriveTenants } from "../tenants"
import type { Databases } from "./database"
import { databases } from "./database"
import { PgPool } from "./pool"

export const migrations = deriveTenants(databases)

export interface PgMigration<K extends Databases> {
  _tag: K
  migrations: MIG.RunMigration[]
}

export const PgMigration = <K extends Databases>(db: K) =>
  tag<PgMigration<K>>().setKey(migrations[db])

export function migrateUpDown<K extends Databases>(db: K) {
  return ({ withPoolClientM }: PgPool<K>) =>
    M.makeExit_(
      withPoolClientM((dbClient) => {
        const opts: PGM.RunnerOption = {
          migrationsTable: "migration",
          dir: path.join(__dirname, `../../migrations/${db}`),
          count: Number.MIN_SAFE_INTEGER,
          direction: "up",
          dbClient,
          verbose: false,
          logger: {
            ...console,
            info: () => {
              //
            }
          }
        }

        return T.fromPromiseDie(async () => {
          const migrations = await PGM.default(opts)
          return {
            _tag: db,
            migrations
          }
        })
      }),
      () =>
        withPoolClientM((dbClient) => {
          const opts: PGM.RunnerOption = {
            migrationsTable: "migration",
            dir: path.join(__dirname, `../../migrations/${db}`),
            count: Number.MIN_SAFE_INTEGER,
            direction: "down",
            dbClient,
            verbose: false,
            logger: {
              ...console,
              info: () => {
                //
              }
            }
          }

          return T.fromPromiseDie(() => PGM.default(opts))
        })
    )
}

export function migrateUp<K extends Databases>(db: K) {
  return ({ withPoolClientM }: PgPool<K>) =>
    M.fromEffect(
      withPoolClientM((dbClient) => {
        const opts: PGM.RunnerOption = {
          migrationsTable: "migration",
          dir: path.join(__dirname, `../../migrations/${db}`),
          count: Number.MIN_SAFE_INTEGER,
          direction: "up",
          dbClient,
          verbose: false,
          logger: {
            ...console,
            info: () => {
              //
            }
          }
        }

        return T.fromPromiseDie(async () => {
          const migrations = await PGM.default(opts)
          return { _tag: db, migrations }
        })
      })
    )
}

export const TestMigration = <K extends Databases>(db: K) =>
  L.fromConstructorManaged(PgMigration(db))(migrateUpDown(db))(PgPool(db))

export const LiveMigration = <K extends Databases>(db: K) =>
  L.fromConstructorManaged(PgMigration(db))(migrateUp(db))(PgPool(db))
