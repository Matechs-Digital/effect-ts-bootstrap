import * as T from "@effect-ts/core/Effect"
import { tag } from "@effect-ts/core/Has"
import type * as PG from "pg"

import { deriveTenants } from "../tenants"
import type { Databases } from "./database"
import { databases } from "./database"

export const configs = deriveTenants(databases)

export interface PgConfig<K extends Databases> {
  _tag: K
  config: PG.ClientConfig
}

export const PgConfig = <K extends Databases>(_: K) =>
  tag<PgConfig<K>>().setKey(configs[_])

export function withConfig<K extends Databases>(_: K) {
  return T.deriveAccess(PgConfig(_))(["config"]).config
}
