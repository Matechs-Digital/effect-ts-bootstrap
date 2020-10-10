import type * as MIG from "node-pg-migrate/dist/migration"

export interface Migrations {
  migrations: MIG.RunMigration[]
}
