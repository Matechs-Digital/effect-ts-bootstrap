import type { UnionToIntersection } from "@effect-ts/core/Utils"

import type { Compute } from "./tool"

export function makeTenants<T extends readonly string[]>(
  ..._: T
): Compute<
  UnionToIntersection<
    {
      [k in keyof T]: T[k] extends string
        ? {
            [h in T[k]]: symbol
          }
        : never
    }[number]
  >
> {
  const o = <any>{}
  for (const k of _) {
    o[k] = Symbol()
  }
  return o
}

export function deriveTenants<T extends { [k in keyof T]: symbol }>(_: T): T {
  const o = <any>{}
  for (const k of Object.keys(_)) {
    o[k] = Symbol()
  }
  return o
}

export type Tenants<T extends { [k in keyof T]: symbol }> = keyof T
