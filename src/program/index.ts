import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import { CryptoLive, PBKDF2ConfigLive } from "../crypto"
import { PgPoolLive } from "../db/PgPool"
import { TestContainersLive } from "../dev/containers"
import { PgConfigTest } from "../dev/db"
import * as HTTP from "../http"
import { CredentialPersistenceLive } from "../persistence/credential"
import { UserPersistenceLive } from "../persistence/user"
import { accessBarM, LiveBar } from "../program/Bar"
import { accessFooM, LiveFoo } from "../program/Foo"
import * as Auth from "./Auth"

export const addHome = HTTP.addRoute((r) => r.req.url === "/")(({ res }) =>
  accessFooM((foo) =>
    T.delay(200)(
      T.effectTotal(() => {
        res.end(foo)
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

export const App = pipe(HTTP.create, addHome, addBar, Auth.add, HTTP.drain)

const Bootstrap = pipe(
  L.allPar(HTTP.Live, LiveFoo, LiveBar, UserPersistenceLive, CredentialPersistenceLive),
  L.using(L.allPar(CryptoLive, PgPoolLive)),
  L.using(PgConfigTest("dev")),
  L.using(TestContainersLive("dev")),
  L.using(
    L.allPar(
      HTTP.config({
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
