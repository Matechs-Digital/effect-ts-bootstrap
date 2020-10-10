import { has } from "@effect-ts/core/Classic/Has"
import type * as MIG from "node-pg-migrate/dist/migration"

export interface PgMigrations {
  migrations: MIG.RunMigration[]
}

export const PgMigrations = has<PgMigrations>()
