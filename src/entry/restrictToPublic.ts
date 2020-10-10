import * as L from "@effect-ts/core/Effect/Layer"

import { UserPersistence } from "../api/user"
import { PgPool } from "../db/PgPool"

export const restrictToPublic = L.restrict(UserPersistence, PgPool)
