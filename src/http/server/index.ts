import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as Q from "@effect-ts/core/Effect/Queue"
import { pipe } from "@effect-ts/core/Function"
import type { Has } from "@effect-ts/core/Has"
import { tag } from "@effect-ts/core/Has"
import { intersect } from "@effect-ts/core/Utils"
import * as http from "http"

export interface HTTPServerConfig {
  config: {
    host: string
    port: number
  }
}

export const HTTPServerConfig = tag<HTTPServerConfig>()

export const { config: accessServerConfigM } = T.deriveAccessM(HTTPServerConfig)([
  "config"
])

export function serverConfig(
  config: HTTPServerConfig["config"]
): L.Layer<unknown, never, Has<HTTPServerConfig>> {
  return L.create(HTTPServerConfig).pure({ config })
}

export interface Request {
  req: http.IncomingMessage
  res: http.ServerResponse
}

export const Request = tag<Request>()

export const { req: accessReqM, res: accessResM } = T.deriveAccessM(Request)([
  "req",
  "res"
])

export interface Server {
  server: http.Server
}

export interface RequestQueue {
  queue: Q.Queue<Request>
}

export const Server = tag<Server>()
export const RequestQueue = tag<RequestQueue>()

export const { queue: accessQueueM } = T.deriveAccessM(RequestQueue)(["queue"])
export const { server: accessServerM } = T.deriveAccessM(Server)(["server"])

export const LiveHTTP = pipe(
  Q.makeUnbounded<Request>(),
  T.chain((queue) =>
    pipe(
      T.effectTotal(() =>
        http.createServer((req, res) => {
          T.run(queue.offer({ req, res }))
        })
      ),
      T.map((server): Server & RequestQueue => ({ server, queue }))
    )
  ),
  T.tap(({ server }) =>
    accessServerConfigM(({ host, port }) =>
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
          T.effectAsync<unknown, never, void>((cb) => {
            server.close((err) => {
              if (err) {
                cb(T.die(err))
              } else {
                cb(T.unit)
              }
            })
          })
        ),
        T.result(queue.shutdown)
      ),
      T.chain(([ea, eb]) => T.done(Ex.zip(eb)(ea)))
    )
  ),
  M.map((_) => intersect(Server.of(_), RequestQueue.of(_))),
  L.fromRawManaged
)
