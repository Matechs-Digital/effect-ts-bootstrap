import * as Array from "@effect-ts/core/Classic/Array"
import * as Map from "@effect-ts/core/Classic/Map"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as Ref from "@effect-ts/core/Effect/Ref"
import { pipe } from "@effect-ts/core/Function"
import type { NoSuchElementException } from "@effect-ts/system/GlobalExceptions"
import { has } from "@effect-ts/system/Has"

// simulate a database connection to a key-value store
export interface DbConnection {
  readonly put: (k: string, v: string) => T.UIO<void>
  readonly get: (k: string) => T.IO<NoSuchElementException, string>
  readonly clear: T.UIO<void>
}

export const DbConnection = has<DbConnection>()

// simulate a connection to a message broker
export interface BrokerConnection {
  readonly send: (message: string) => T.UIO<void>
  readonly clear: T.UIO<void>
}

export const BrokerConnection = has<BrokerConnection>()

// connect to the database
export const DbLive = pipe(
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
  M.make((_) => _.clear),
  // construct the layer
  L.fromManaged(DbConnection)
)

// connect to the database
export const BrokerLive = pipe(
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
  M.make((_) => _.clear),
  // construct the layer
  L.fromManaged(BrokerConnection)
)

export const ProgramLive = L.all(DbLive, BrokerLive)

export const { get, put } = T.deriveLifted(DbConnection)(["get", "put"], [], [])

export const { send } = T.deriveLifted(BrokerConnection)(["send"], [], [])

// write a program that use the database
export const program = pipe(
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

// run the program and print the output
pipe(
  program,
  T.chain((s) =>
    T.effectTotal(() => {
      console.log(`Done: ${s}`)
    })
  ),
  // provide the layer to program
  T.provideSomeLayer(ProgramLive),
  T.runMain
)
