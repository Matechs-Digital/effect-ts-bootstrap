import "@effect-ts/core/Operators"

import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as F from "@effect-ts/core/Effect/Fiber"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import { pipe } from "@effect-ts/core/Function"
import type { Erase } from "@effect-ts/core/Utils"

import { addAuthMiddleware, addRegistration, authenticatedUser } from "../api"
import { CryptoLive, PBKDF2ConfigLive } from "../crypto"
import { DbLive, PgClient, PgPoolLive, provideClient, TestMigration } from "../db"
import { TestContainersLive } from "../dev/containers"
import { PgConfigTest } from "../dev/db"
import * as HTTP from "../http"
import { CredentialPersistenceLive } from "../persistence/credential"
import { TransactionsLive } from "../persistence/transactions"
import { UserPersistenceLive } from "../persistence/user"

export const addHome = HTTP.addRoute((r) => r.req.url === "/")(({ res }) =>
  pipe(
    T.gen(function* (_) {
      const { client } = yield* _(PgClient("main"))

      const result = yield* _(
        T.fromPromiseDie(() =>
          client.query(
            "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = $1::text;",
            ["users"]
          )
        )
      )

      return result.rows
    }),
    provideClient("main"),
    T.result,
    T.chain((ex) =>
      T.effectTotal(() => {
        res.end(JSON.stringify(ex))
      })
    )
  )
)

export const App = pipe(
  HTTP.create,
  addHome,
  addRegistration,
  addAuthMiddleware,
  HTTP.drain
)

const Persistence = TransactionsLive["|>"](
  L.using(L.allPar(UserPersistenceLive, CredentialPersistenceLive))
)

const Crypto = CryptoLive["|>"](L.using(PBKDF2ConfigLive))

const Db = DbLive("main")
  ["|>"](L.using(TestMigration("main")))
  ["|>"](L.using(PgPoolLive("main")))
  ["|>"](L.using(PgConfigTest("main")("dev")))
  ["|>"](L.using(TestContainersLive("dev")))

const Server = HTTP.LiveHTTP["|>"](
  L.using(
    HTTP.serverConfig({
      host: "0.0.0.0",
      port: 8081
    })
  )
)

const Bootstrap = Persistence["|>"](L.using(Crypto))["|>"](
  L.using(L.allPar(Db, Server))
)

// main function (unsafe)
export function main() {
  return App["|>"](T.provideSomeLayer(Bootstrap))["|>"](T.runMain)
}
