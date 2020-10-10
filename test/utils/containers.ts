import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { Duration, TemporalUnit } from "node-duration"
import * as path from "path"
import type { StartedDockerComposeEnvironment } from "testcontainers"
import { DockerComposeEnvironment } from "testcontainers"

export const ref = {
  integration: Symbol()
}

export type Environments = keyof typeof ref

export interface TestContainers<K extends Environments> {
  name: K
  env: StartedDockerComposeEnvironment
}

export const TestContainers = <K extends Environments>(_name: K) =>
  has<TestContainers<K>>().setKey(ref[_name])

export const TestContainersLive = <K extends Environments>(_name: K) =>
  L.create(TestContainers(_name))
    .prepare(
      T.fromPromiseDie(async () => {
        const composeFilePath = path.resolve(__dirname, "../../environments")
        const composeFile = `${_name}.yaml`

        const env = await new DockerComposeEnvironment(composeFilePath, composeFile)
          .withStartupTimeout(new Duration(60, TemporalUnit.SECONDS))
          .up()

        return { env, name: _name }
      })
    )
    .release(({ env }) => T.fromPromiseDie(() => env.down()))
