import type { Has } from "@effect-ts/core/Classic/Has"
import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as Q from "@effect-ts/core/Effect/Queue"
import { pipe } from "@effect-ts/core/Function"
import * as http from "http"

export interface HTTPServerConfig {
  config: {
    host: string
    port: number
  }
}

export const HTTPServerConfig = has<HTTPServerConfig>()

export const { config: accessConfigM } = T.deriveAccessM(HTTPServerConfig)(["config"])

export function makeHTTPServerConfig(
  config: HTTPServerConfig["config"]
): L.Layer<unknown, never, Has<HTTPServerConfig>> {
  return L.create(HTTPServerConfig).pure({ config })
}

export interface Request {
  req: http.IncomingMessage
  res: http.ServerResponse
}

export interface Server {
  server: http.Server
  queue: Q.Queue<Request>
}

export const Server = has<Server>()

export const { queue: accessQueueM, server: accessServerM } = T.deriveAccessM(Server)([
  "queue",
  "server"
])

export const Live = pipe(
  Q.makeUnbounded<Request>(),
  T.chain((queue) =>
    pipe(
      T.effectTotal(() =>
        http.createServer((req, res) => {
          T.run(queue.offer({ req, res }))
        })
      ),
      T.map((server): Server => ({ server, queue }))
    )
  ),
  T.tap(({ server }) =>
    accessConfigM(({ host, port }) =>
      T.effectAsync<unknown, never, void>((cb) => {
        function clean() {
          server.removeListener("error", onErr)
          server.removeListener("listening", onDone)
        }
        function onErr(err: Error) {
          clean()
          cb(T.die(err))
        }
        function onDone() {
          clean()
          cb(T.unit)
        }
        server.listen(port, host)

        server.once("error", onErr)
        server.once("listening", onDone)
      })
    )
  ),
  M.make(({ queue, server }) =>
    pipe(
      T.tuple(
        T.result(
          T.effectTotal(() => {
            T.effectAsync<unknown, never, void>((cb) => {
              server.close((err) => {
                if (err) {
                  cb(T.die(err))
                } else {
                  cb(T.unit)
                }
              })
            })
          })
        ),
        T.result(queue.shutdown)
      ),
      T.chain(([ea, eb]) => T.done(Ex.zip(eb)(ea)))
    )
  ),
  L.fromManaged(Server)
)
