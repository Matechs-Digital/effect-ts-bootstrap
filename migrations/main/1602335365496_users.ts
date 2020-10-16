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
    },
    updatedAt: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp")
    }
  })

  pgm.createTrigger(
    "users",
    "users_modified",
    {
      when: "BEFORE",
      level: "ROW",
      operation: "UPDATE",
      language: "plpgsql",
      replace: true
    },
    `BEGIN
      NEW."updatedAt" = NOW();
      RETURN NEW;
    END`
  )
}

export function down(pgm: P.MigrationBuilder) {
  pgm.dropTrigger("users", "users_modified")
  pgm.dropTable("users")
}
