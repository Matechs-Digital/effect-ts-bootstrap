import * as L from "@effect-ts/core/Effect/Layer"

import { PgConfig } from "../../src/db/PgConfig"
import { TestContainers } from "./containers"

const makeConfig = ({ env }: TestContainers): PgConfig => {
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

export const PgConfigTest = L.fromConstructor(PgConfig)(makeConfig)(TestContainers)
