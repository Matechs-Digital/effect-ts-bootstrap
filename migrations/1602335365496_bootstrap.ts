import type * as P from "node-pg-migrate"

export const shorthands = undefined

export function up(pgm: P.MigrationBuilder) {
  pgm.createTable("users", {
    id: {
      type: "SERIAL",
      notNull: true,
      primaryKey: true
    },
    name: { type: "TEXT", notNull: true },
    createdAt: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  })

  pgm.createTable("posts", {
    id: {
      type: "SERIAL",
      notNull: true,
      primaryKey: true
    },
    userId: {
      type: "SERIAL",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE"
    },
    body: { type: "text", notNull: true },
    createdAt: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  })

  pgm.createIndex("posts", "userId")
}

export function down(pgm: P.MigrationBuilder) {
  pgm.dropIndex("posts", "userId")
  pgm.dropTable("posts")
  pgm.dropTable("users")
}
