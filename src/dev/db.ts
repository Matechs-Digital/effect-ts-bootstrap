import * as L from "@effect-ts/core/Effect/Layer"

import type { Databases } from "../db"
import { PgConfig } from "../db"
import type { Environments } from "./containers"
import { TestContainers } from "./containers"

function makeConfig<H extends Databases>(db: H) {
  return <K extends Environments>({ env }: TestContainers<K>): PgConfig<H> => {
    const container = env.getContainer(`${db}_1`)

    const port = container.getMappedPort(5432)
    const host = container.getContainerIpAddress()

    return {
      _tag: db,
      config: {
        port,
        host,
        user: "demouser",
        database: "demo",
        password: "demopass"
      }
    }
  }
}

export const PgConfigTest = <H extends Databases>(db: H) => <K extends Environments>(
  _name: K
) => L.fromConstructor(PgConfig(db))(makeConfig(db))(TestContainers(_name))
