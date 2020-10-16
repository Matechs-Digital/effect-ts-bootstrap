import type { Tenants } from "../tenants"
import { makeTenants } from "../tenants"

export const databases = makeTenants("main", "read")

export type Databases = Tenants<typeof databases>
