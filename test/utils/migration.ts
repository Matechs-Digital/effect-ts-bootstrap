import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as PGM from "node-pg-migrate"
import type * as MIG from "node-pg-migrate/dist/migration"
import * as path from "path"

import { PgClient } from "../../src/db/client"

export interface Migrations {
  migrations: MIG.RunMigration[]
}

export const Migrations = has<Migrations>()

export function migrateUpDown(n: number) {
  return ({ withClientM }: PgClient) =>
    M.makeExit_(
      withClientM((dbClient) => {
        const opts: PGM.RunnerOption = {
          migrationsTable: "migration",
          dir: path.join(__dirname, "../../migrations"),
          count: n,
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
            migrations
          }
        })
      }),
      () =>
        withClientM((dbClient) => {
          const opts: PGM.RunnerOption = {
            migrationsTable: "migration",
            dir: path.join(__dirname, "../../migrations"),
            count: n,
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

export const TestMigration = (n: number) =>
  L.fromConstructorManaged(Migrations)(migrateUpDown(n))(PgClient)
