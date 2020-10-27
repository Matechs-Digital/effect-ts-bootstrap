import "@effect-ts/core/Operators"

import * as Arr from "@effect-ts/core/Classic/Array"
import * as E from "@effect-ts/core/Classic/Either"
import * as T from "@effect-ts/core/Effect"
import * as F from "@effect-ts/core/Effect/Fiber"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as Q from "@effect-ts/core/Effect/Queue"
import * as Ref from "@effect-ts/core/Effect/Ref"
import * as S from "@effect-ts/core/Effect/Stream"
import { pipe } from "@effect-ts/core/Function"
import { tag } from "@effect-ts/core/Has"
import type { _A } from "@effect-ts/core/Utils"
import * as O from "@effect-ts/system/Option"
import { transducer } from "@effect-ts/system/Stream/Transducer"
import * as fs from "fs"
import * as path from "path"

export function readFileStreamBuffer(path: string) {
  return new S.Stream(
    M.gen(function* (_) {
      const nodeStream = yield* _(
        T.effectTotal(() => fs.createReadStream(path))["|>"](
          M.makeExit((rs) =>
            T.effectTotal(() => {
              rs.close()
              //console.debug("CLOSED FILE HANDLE")
            })
          )
        )
      )

      const queue = yield* _(
        Q.makeUnbounded<E.Either<O.Option<Error>, Buffer>>()["|>"](
          M.makeExit((q) => q.shutdown)
        )
      )

      yield* _(
        T.effectTotal(() => {
          nodeStream.on("data", (chunk: Buffer) => {
            T.run(queue.offer(E.right(chunk)))
          })
          nodeStream.on("end", () => {
            T.run(queue.offer(E.left(O.none)))
          })
          nodeStream.on("error", (err) => {
            T.run(queue.offer(E.left(O.some(err))))
          })
        })["|>"](
          M.makeExit(() =>
            T.effectTotal(() => {
              nodeStream.removeAllListeners()
            })
          )
        )
      )

      return queue.take["|>"](T.chain(E.fold(T.fail, (a) => T.succeed([a]))))
    })
  )
}

const transduceMessages = transducer<unknown, never, Buffer, string, unknown>(
  M.gen(function* (_) {
    const leftover = yield* _(Ref.makeRef(""))

    return (o) =>
      T.gen(function* (_) {
        if (O.isSome(o)) {
          yield* _(
            leftover["|>"](
              Ref.update((l) => `${l}${Buffer.concat([...o.value]).toString("utf-8")}`)
            )
          )
        }

        const current = yield* _(leftover.get)

        if (current.length === 0) {
          return []
        }

        if (current.endsWith("\n")) {
          const output = current.split("\n")

          yield* _(leftover.set(""))

          return output
        }

        const split = current.split("\n")

        if (split.length === 1) {
          yield* _(leftover.set(split[0]))

          return []
        } else {
          yield* _(leftover.set(split[split.length - 1]))

          const init = Arr.init(split)

          if (O.isSome(init)) {
            return init.value
          }
        }

        return []
      })
  })
)

export const makeMessageQueue = (path: string) =>
  M.gen(function* (_) {
    const queue = yield* _(
      Q.makeUnbounded<string>()["|>"](M.makeExit((q) => q.shutdown))
    )

    const messageStream = pipe(
      readFileStreamBuffer(path),
      S.aggregate(transduceMessages),
      S.chain((s) => S.fromEffect(queue.offer(s)))
    )

    yield* _(
      messageStream["|>"](S.runDrain)["|>"](T.fork)["|>"](M.makeExit(F.interrupt))
    )

    return { queue }
  })

export interface MessageQueue extends _A<ReturnType<typeof makeMessageQueue>> {}

export const MessageQueue = tag<MessageQueue>()

export const LiveMessageQueue = (path: string) =>
  L.fromManaged(MessageQueue)(makeMessageQueue(path))

export const program = T.gen(function* (_) {
  const { queue } = yield* _(MessageQueue)

  while (true) {
    const message = yield* _(queue.take)

    yield* _(
      T.effectTotal(() => {
        console.log(message)
      })
    )
  }
})

const interrupt = pipe(
  program,
  T.provideSomeLayer(LiveMessageQueue(path.join(__dirname, "messages.log"))),
  T.runMain
)

process.once("SIGTERM", () => {
  interrupt()
})
process.once("SIGINT", () => {
  interrupt()
})
