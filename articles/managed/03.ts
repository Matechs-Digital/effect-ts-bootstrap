import * as Array from "@effect-ts/core/Classic/Array"
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

// simulate a connection to a message broker
export interface BrokerConnection {
  readonly send: (message: string) => T.UIO<void>
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

// connect to the database
export const managedBroker = pipe(
  Ref.makeRef(<Array.Array<string>>Array.empty),
  T.chain((ref) =>
    T.effectTotal(
      (): BrokerConnection => ({
        send: (message) =>
          pipe(ref, Ref.update<Array.Array<string>>(Array.snoc(message))),
        clear: pipe(
          ref.get,
          T.chain((messages) =>
            T.effectTotal(() => {
              console.log(`Flush:`)
              messages.forEach((message) => {
                console.log("- " + message)
              })
            })
          )
        )
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
  M.zip(managedBroker),
  M.use(([{ get, put }, { send }]) =>
    pipe(
      T.do,
      T.tap(() => put("ka", "a")),
      T.tap(() => put("kb", "b")),
      T.tap(() => put("kc", "c")),
      T.bind("a", () => get("ka")),
      T.bind("b", () => get("kb")),
      T.bind("c", () => get("kc")),
      T.map(({ a, b, c }) => `${a}-${b}-${c}`),
      T.tap(send)
    )
  )
)

// run the program and print the output
pipe(
  program,
  T.chain((s) =>
    T.effectTotal(() => {
      console.log(`Done: ${s}`)
    })
  ),
  T.runMain
)
