import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import type * as PG from "pg"

export interface PgConfig {
  config: PG.ClientConfig
}

export const PgConfig = has<PgConfig>()

export const { config: withConfig } = T.deriveAccess(PgConfig)(["config"])
