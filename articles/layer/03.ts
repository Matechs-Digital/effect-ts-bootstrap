import * as Array from "@effect-ts/core/Classic/Array"
import * as Map from "@effect-ts/core/Classic/Map"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as Ref from "@effect-ts/core/Effect/Ref"
import { pipe } from "@effect-ts/core/Function"
import type { NoSuchElementException } from "@effect-ts/system/GlobalExceptions"
import { tag } from "@effect-ts/system/Has"

// simulate a database connection to a key-value store
export interface DbConnection {
  readonly put: (k: string, v: string) => T.UIO<void>
  readonly get: (k: string) => T.IO<NoSuchElementException, string>
  readonly clear: T.UIO<void>
}

export const DbConnection = tag<DbConnection>()

// simulate a connection to a message broker
export interface BrokerConnection {
  readonly send: (message: string) => T.UIO<void>
  readonly clear: T.UIO<void>
}

export const BrokerConnection = tag<BrokerConnection>()

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

export function makeProgram({ get, put }: DbConnection, { send }: BrokerConnection) {
  return {
    main: pipe(
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
  }
}

export interface Program extends ReturnType<typeof makeProgram> {}

export const Program = tag<Program>()

export const ProgramLive = L.fromConstructor(Program)(makeProgram)(
  DbConnection,
  BrokerConnection
)

export const MainLive = pipe(ProgramLive, L.using(L.all(DbLive, BrokerLive)))

export const { main } = T.deriveLifted(Program)([], ["main"], [])

// run the program and print the output
pipe(
  main,
  T.chain((s) =>
    T.effectTotal(() => {
      console.log(`Done: ${s}`)
    })
  ),
  // provide the layer to program
  T.provideSomeLayer(MainLive),
  T.runMain
)
