import "@effect-ts/core/Operators"

import * as Array from "@effect-ts/core/Classic/Array"
import * as Map from "@effect-ts/core/Classic/Map"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as Ref from "@effect-ts/core/Effect/Ref"
import type { _A } from "@effect-ts/core/Utils"
import { tag } from "@effect-ts/system/Has"

// make Database Live
export const makeDbLive = M.gen(function* (_) {
  const ref = yield* _(
    Ref.makeRef<Map.Map<string, string>>(Map.empty)["|>"](
      M.make((ref) => ref.set(Map.empty))
    )
  )

  return {
    get: (k: string) => ref.get["|>"](T.map(Map.lookup(k)))["|>"](T.chain(T.getOrFail)),
    put: (k: string, v: string) => ref["|>"](Ref.update(Map.insert(k, v)))
  }
})

// simulate a database connection to a key-value store
export interface DbConnection extends _A<typeof makeDbLive> {}

// Tag<DbConnection>
export const DbConnection = tag<DbConnection>()

// Database Live Layer
export const DbLive = L.fromManaged(DbConnection)(makeDbLive)

// make Broker Live
export const makeBrokerLive = M.gen(function* (_) {
  const ref = yield* _(
    Ref.makeRef<Array.Array<string>>(Array.empty)["|>"](
      M.make((ref) =>
        ref.get["|>"](
          T.chain((messages) =>
            T.effectTotal(() => {
              console.log(`Flush:`)
              messages.forEach((message) => {
                console.log("- " + message)
              })
            })
          )
        )
      )
    )
  )

  return {
    send: (message: string) => ref["|>"](Ref.update(Array.snoc(message)))
  }
})

// simulate a connection to a message broker
export interface BrokerConnection extends _A<typeof makeBrokerLive> {}

// Tag<BrokerConnection>
export const BrokerConnection = tag<BrokerConnection>()

// Broker Live Layer
export const BrokerLive = L.fromManaged(BrokerConnection)(makeBrokerLive)

// Main Live Layer
export const ProgramLive = L.all(DbLive, BrokerLive)

// Program Entry
export const main = T.gen(function* (_) {
  const { get, put } = yield* _(DbConnection)
  const { send } = yield* _(BrokerConnection)

  yield* _(put("ka", "a"))
  yield* _(put("kb", "b"))
  yield* _(put("kc", "c"))

  const a = yield* _(get("ka"))
  const b = yield* _(get("kb"))
  const c = yield* _(get("kc"))

  const s = `${a}-${b}-${c}`

  yield* _(send(s))

  return s
})

// run the program and print the output
main["|>"](T.provideSomeLayer(ProgramLive))["|>"](T.runMain)
