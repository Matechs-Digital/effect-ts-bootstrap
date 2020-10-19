import "@effect-ts/core/Operators"

import * as Array from "@effect-ts/core/Classic/Array"
import * as Map from "@effect-ts/core/Classic/Map"
import * as T from "@effect-ts/core/Effect"
import * as F from "@effect-ts/core/Effect/Fiber"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as Ref from "@effect-ts/core/Effect/Ref"
import type { NoSuchElementException } from "@effect-ts/system/GlobalExceptions"
import { has } from "@effect-ts/system/Has"

// simulate a database connection to a key-value store
export interface DbConnection {
  readonly put: (k: string, v: string) => T.UIO<void>
  readonly get: (k: string) => T.IO<NoSuchElementException, string>
  readonly clear: T.UIO<void>
}

// Tag<DbConnection>
export const DbConnection = has<DbConnection>()

// simulate a connection to a message broker
export interface BrokerConnection {
  readonly send: (message: string) => T.UIO<void>
  readonly clear: T.UIO<void>
}

// Tag<BrokerConnection>
export const BrokerConnection = has<BrokerConnection>()

// Database Live Layer
export const DbLive = T.gen(function* (_) {
  const ref = yield* _(Ref.makeRef<Map.Map<string, string>>(Map.empty))

  const DbConnection: DbConnection = {
    get: (k) => ref.get["|>"](T.map(Map.lookup(k)))["|>"](T.chain(T.getOrFail)),
    put: (k, v) => ref["|>"](Ref.update(Map.insert(k, v))),
    clear: ref.set(Map.empty)
  }

  return DbConnection
})
  ["|>"](M.make((_) => _.clear)) // make managed
  ["|>"](L.fromManaged(DbConnection)) // construct layer

// Broket Live Layer
export const BrokerLive = T.gen(function* (_) {
  const ref = yield* _(Ref.makeRef<Array.Array<string>>(Array.empty))

  const BrokerConnection: BrokerConnection = {
    send: (message) => ref["|>"](Ref.update(Array.snoc(message))),
    clear: ref.get["|>"](
      T.chain((messages) =>
        T.effectTotal(() => {
          console.log(`Flush:`)
          messages.forEach((message) => {
            console.log("- " + message)
          })
        })
      )
    )
  }

  return BrokerConnection
})
  ["|>"](M.make((_) => _.clear)) // make managed
  ["|>"](L.fromManaged(BrokerConnection)) // construct layer

// Main Program
export function makeProgram({ get, put }: DbConnection, { send }: BrokerConnection) {
  return {
    main: T.gen(function* (_) {
      yield* _(put("ka", "a"))
      yield* _(put("kb", "b"))
      yield* _(put("kc", "c"))

      const a = yield* _(get("ka"))
      const b = yield* _(get("kb"))
      const c = yield* _(get("kc"))

      const s = `${a}-${b}-${c}`

      yield* _(T.sleep(20_000))

      yield* _(send(s))

      return s
    })
  }
}

// Main Program Type
export interface Program extends ReturnType<typeof makeProgram> {}

// Tag<Program>
export const Program = has<Program>()

// Live Program
export const ProgramLive = L.fromConstructor(Program)(makeProgram)(
  // wrap Db
  DbConnection,
  // wrap Broker
  BrokerConnection
)

// Main Live Layer
export const MainLive = ProgramLive["|>"](L.using(L.all(DbLive, BrokerLive)))

// Program Entry
export const { main } = T.deriveLifted(Program)([], ["main"], [])

// Generic Listen for process sigterm & sigint
export function listenForProcessExit<R, E, A>(self: T.Effect<R, E, A>) {
  return T.gen(function* (_) {
    // fork the self effect returning a fiber
    const fiber = yield* _(T.fork(self))

    // handler to bind in process listeners
    const handler = () => {
      // shut down the fiber
      T.run(fiber["|>"](F.interrupt))
    }

    // add process listeners
    const addHandlers = T.effectTotal(() => {
      process.once("SIGINT", handler)
      process.once("SIGTERM", handler)
    })

    // remove listeners when done
    const removeHandlers = () =>
      T.effectTotal(() => {
        process.removeListener("SIGINT", handler)
        process.removeListener("SIGTERM", handler)
      })

    // allocates a managed of wich release is deferred
    yield* _(addHandlers["|>"](M.make(removeHandlers)))

    // join the fiber waiting for an exit
    return yield* _(F.join(fiber))
  })
}

// run the program and print the output
main["|>"](T.provideSomeLayer(MainLive))["|>"](listenForProcessExit)["|>"](T.runMain)
