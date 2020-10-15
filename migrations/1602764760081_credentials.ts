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
      type: "SERIAL",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE"
    },
    hash: { type: "text", notNull: true },
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

  pgm.createIndex("credentials", "userId")
  pgm.createTrigger(
    "credentials",
    "credentials_modified",
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

export function down(pgm: MigrationBuilder) {
  pgm.dropIndex("credentials", "userId")
  pgm.dropTrigger("credentials", "credentials_modified")
  pgm.dropTable("credentials")
}
