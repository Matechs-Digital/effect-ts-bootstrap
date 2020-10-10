import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import { integer } from "fast-check"
import * as PGM from "node-pg-migrate"
import type * as MIG from "node-pg-migrate/dist/migration"
import * as path from "path"

import { PgPool } from "../../src/db/PgPool"

export interface Migrations {
  migrations: MIG.RunMigration[]
}

export const Migrations = has<Migrations>()

export function migrateUpDown({ withPoolClientM }: PgPool) {
  return M.makeExit_(
    withPoolClientM((dbClient) => {
      const opts: PGM.RunnerOption = {
        migrationsTable: "migration",
        dir: path.join(__dirname, "../../migrations"),
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
          migrations
        }
      })
    }),
    () =>
      withPoolClientM((dbClient) => {
        const opts: PGM.RunnerOption = {
          migrationsTable: "migration",
          dir: path.join(__dirname, "../../migrations"),
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

export const TestMigration = L.fromConstructorManaged(Migrations)(migrateUpDown)(PgPool)
