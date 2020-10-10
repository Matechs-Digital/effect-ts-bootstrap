import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { Duration, TemporalUnit } from "node-duration"
import * as path from "path"
import type { StartedDockerComposeEnvironment } from "testcontainers"
import { DockerComposeEnvironment } from "testcontainers"

export interface TestContainers {
  env: StartedDockerComposeEnvironment
}

export const TestContainers = has<TestContainers>()

export const TestContainersLive = L.create(TestContainers)
  .prepare(
    T.fromPromiseDie(async () => {
      const composeFilePath = path.resolve(__dirname, "../../")
      const composeFile = "docker-compose.yaml"

      const env = await new DockerComposeEnvironment(composeFilePath, composeFile)
        .withStartupTimeout(new Duration(60, TemporalUnit.SECONDS))
        .up()

      return <TestContainers>{ env }
    })
  )
  .release(({ env }) => T.fromPromiseDie(() => env.down()))
