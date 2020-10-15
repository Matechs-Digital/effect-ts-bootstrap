import type * as P from "node-pg-migrate"

export const shorthands = undefined

export function up(pgm: P.MigrationBuilder) {
  pgm.createTable("users", {
    id: {
      type: "SERIAL",
      notNull: true,
      primaryKey: true
    },
    email: { type: "TEXT", notNull: true },
    createdAt: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  })
}

export function down(pgm: P.MigrationBuilder) {
  pgm.dropTable("users")
}
