import * as L from "@effect-ts/core/Effect/Layer"

import { PgConfig } from "../../src/db/PgConfig"
import type { Environments } from "./containers"
import { TestContainers } from "./containers"

function makeConfig<K extends Environments>({ env }: TestContainers<K>): PgConfig {
  const container = env.getContainer("postgres_1")

  const port = container.getMappedPort(5432)
  const host = container.getContainerIpAddress()

  return {
    config: {
      port,
      host,
      user: "demouser",
      database: "demo",
      password: "demopass"
    }
  }
}

export const PgConfigTest = <K extends Environments>(_name: K) =>
  L.fromConstructor(PgConfig)(makeConfig)(TestContainers(_name))
