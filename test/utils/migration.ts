import type { Tag } from "@effect-ts/core/Classic/Has"
import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as PGM from "node-pg-migrate"
import * as path from "path"

import type { Migrations } from "../../src/db/Migrations"
import { PgPool } from "../../src/db/PgPool"

export function migrateUpDown<Mig extends Migrations>(
  _: Tag<Mig>,
  f: (_: Migrations) => Mig
) {
  return (dir: string) => ({ withPoolClientM }: PgPool) =>
    M.makeExit_(
      withPoolClientM((dbClient) => {
        const opts: PGM.RunnerOption = {
          migrationsTable: "migration",
          dir: path.join(__dirname, `../../migrations/${dir}`),
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
          return f({
            migrations
          })
        })
      }),
      () =>
        withPoolClientM((dbClient) => {
          const opts: PGM.RunnerOption = {
            migrationsTable: "migration",
            dir: path.join(__dirname, `../../migrations/${dir}`),
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

export const TestMigration = <Mig extends Migrations>(
  _: Tag<Mig>,
  f: (_: Migrations) => Mig
) => (dir: string) => L.fromConstructorManaged(_)(migrateUpDown(_, f)(dir))(PgPool)
