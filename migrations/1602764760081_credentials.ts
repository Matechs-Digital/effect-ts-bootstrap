import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate"

export const shorthands: ColumnDefinitions | undefined = undefined

export function up(pgm: MigrationBuilder) {
  pgm.createTable("credentials", {
    id: {
      type: "SERIAL",
      notNull: true,
      primaryKey: true
    },
    userId: {
      type: "BIGSERIAL",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE"
    },
    password: { type: "text", notNull: true },
    salt: { type: "text", notNull: true },
    createdAt: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  })

  pgm.createIndex("credentials", "userId")
}

export function down(pgm: MigrationBuilder) {
  pgm.dropIndex("credentials", "userId")
  pgm.dropTable("credentials")
}
