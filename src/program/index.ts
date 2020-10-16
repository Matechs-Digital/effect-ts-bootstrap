import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as F from "@effect-ts/core/Effect/Fiber"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import { pipe } from "@effect-ts/core/Function"

import { addRegister } from "../api"
import { CryptoLive, PBKDF2ConfigLive } from "../crypto"
import { accessClientM, PgPoolLive, provideClient, TestMigration } from "../db"
import { TestContainersLive } from "../dev/containers"
import { PgConfigTest } from "../dev/db"
import * as HTTP from "../http"
import { CredentialPersistenceLive } from "../persistence/credential"
import { TransactionsLive } from "../persistence/transactions"
import { UserPersistenceLive } from "../persistence/user"
import { accessBarM, LiveBar } from "../program/Bar"
import * as Auth from "./Auth"

export const addHome = HTTP.addRoute((r) => r.req.url === "/")(({ res }) =>
  pipe(
    accessClientM("main")((client) =>
      pipe(
        T.fromPromiseDie(() =>
          client.query(
            "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = $1::text;",
            ["users"]
          )
        ),
        T.map((_) => _.rows)
      )
    ),
    provideClient("main"),
    T.result,
    T.chain((ex) =>
      T.effectTotal(() => {
        res.end(JSON.stringify(ex))
      })
    )
  )
)

export const addBar = HTTP.addRoute((r) => r.req.url === "/bar")(
  Auth.authenticated(({ res, user }) =>
    accessBarM((bar) =>
      T.delay(200)(
        T.effectTotal(() => {
          res.end(`${user}: ${bar}`)
        })
      )
    )
  )
)

export const App = pipe(HTTP.create, addHome, addBar, addRegister, Auth.add, HTTP.drain)

export function makeAppFiber() {
  return pipe(
    App,
    T.fork,
    M.makeInterruptible(F.interrupt),
    M.map((fiber) => ({ fiber }))
  )
}

export interface AppFiber {
  fiber: F.FiberContext<never, never>
}

export const AppFiber = has<AppFiber>()

export const AppFiberLive = L.fromConstructorManaged(AppFiber)(makeAppFiber)()

const Bootstrap = pipe(
  TransactionsLive,
  L.using(
    L.allPar(HTTP.LiveHTTP, LiveBar, UserPersistenceLive, CredentialPersistenceLive)
  ),
  L.using(TestMigration("main")),
  L.using(L.allPar(CryptoLive, PgPoolLive("main"))),
  L.using(PgConfigTest("main")("dev")),
  L.using(TestContainersLive("dev")),
  L.using(
    L.allPar(
      HTTP.serverConfig({
        host: "0.0.0.0",
        port: 8081
      }),
      PBKDF2ConfigLive
    )
  )
)

// main function (unsafe)
export function main() {
  return pipe(App, T.provideSomeLayer(Bootstrap), T.runMain)
}
