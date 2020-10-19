import * as Map from "@effect-ts/core/Classic/Map"
import * as T from "@effect-ts/core/Effect"
import * as M from "@effect-ts/core/Effect/Managed"
import * as Ref from "@effect-ts/core/Effect/Ref"
import { pipe } from "@effect-ts/core/Function"
import type { NoSuchElementException } from "@effect-ts/system/GlobalExceptions"

// simulate a database connection to a key-value store
export interface DbConnection {
  readonly put: (k: string, v: string) => T.UIO<void>
  readonly get: (k: string) => T.IO<NoSuchElementException, string>
  readonly clear: T.UIO<void>
}

// connect to the database
export const managedDb = pipe(
  Ref.makeRef(<Map.Map<string, string>>Map.empty),
  T.chain((ref) =>
    T.effectTotal(
      (): DbConnection => ({
        get: (k) => pipe(ref.get, T.map(Map.lookup(k)), T.chain(T.getOrFail)),
        put: (k, v) => pipe(ref, Ref.update(Map.insert(k, v))),
        clear: ref.set(Map.empty)
      })
    )
  ),
  // release the connection via managed
  M.make((_) => _.clear)
)

// write a program that use the database
export const program = pipe(
  // use the managed DbConnection
  managedDb,
  M.use((_) =>
    pipe(
      T.do,
      T.tap(() => _.put("ka", "a")),
      T.tap(() => _.put("kb", "b")),
      T.tap(() => _.put("kc", "c")),
      T.bind("a", () => _.get("ka")),
      T.bind("b", () => _.get("kb")),
      T.bind("c", () => _.get("kc")),
      T.map(({ a, b, c }) => `${a}-${b}-${c}`)
    )
  )
)

// run the program and print the output
pipe(
  program,
  T.chain((s) =>
    T.effectTotal(() => {
      console.log(s)
    })
  ),
  T.runMain
)
