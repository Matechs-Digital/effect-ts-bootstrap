import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import { pipe } from "@effect-ts/core/Function"
import { Duration, TemporalUnit } from "node-duration"
import * as path from "path"
import { DockerComposeEnvironment } from "testcontainers"

import { PgConfig } from "../../src/db/client"

export const TestContainerPg = pipe(
  T.fromPromiseDie(async () => {
    const composeFilePath = path.resolve(__dirname, "../../")
    const composeFile = "docker-compose.yaml"

    const env = await new DockerComposeEnvironment(composeFilePath, composeFile)
      .withStartupTimeout(new Duration(60, TemporalUnit.SECONDS))
      .up()

    return env
  }),
  M.makeExit((d) =>
    T.fromPromiseDie(async () => {
      await d.down()
    })
  ),
  M.map(
    (env): PgConfig => {
      const postgresContainer = env.getContainer("postgres_1")

      const port = postgresContainer.getMappedPort(5432)
      const host = postgresContainer.getContainerIpAddress()

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
  ),
  L.fromManaged(PgConfig)
)
