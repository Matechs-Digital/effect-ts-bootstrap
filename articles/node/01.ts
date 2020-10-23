import "@effect-ts/core/Operators"

import * as A from "@effect-ts/core/Classic/Associative"
import * as T from "@effect-ts/core/Effect"
import * as M from "@effect-ts/core/Effect/Managed"
import * as S from "@effect-ts/core/Effect/Stream"
import * as O from "@effect-ts/system/Option"
import { makeRef } from "@effect-ts/system/Ref"
import type { Transducer } from "@effect-ts/system/Stream/Transducer"
import { transducer } from "@effect-ts/system/Stream/Transducer"
import * as fs from "fs"
import * as path from "path"

export const readFileStream = (path: string) =>
  S.gen(function* (_) {
    const fileStream = yield* _(
      T.effectTotal(() => fs.createReadStream(path))["|>"](
        S.bracket((fs) =>
          T.effectTotal(() => {
            fs.close()
          })
        )
      )
    )

    const bufferStream = yield* _(
      S.effectAsync<unknown, never, string>((cb) => {
        fileStream.on("data", (data: Buffer) => {
          cb(T.succeed([data.toString("utf-8")]))
        })
        fileStream.on("end", () => {
          cb(T.fail(O.none))
        })
        fileStream.on("error", (err) => {
          cb(T.die(err))
        })
      })
    )

    return bufferStream
  })

const splitString: Transducer<unknown, never, string, string> = transducer(
  M.gen(function* (_) {
    const left = yield* _(makeRef(""))

    return O.fold(
      () =>
        T.gen(function* (_) {
          const currentLeft = yield* _(left.get)

          yield* _(left.set(""))

          return currentLeft.length > 0 ? [currentLeft] : []
        }),
      (value) =>
        T.gen(function* (_) {
          const currentLeft = yield* _(left.get)
          const rest = A.fold(A.string)("")(value)
          const concat = currentLeft + rest
          if (concat.length === 0) {
            return []
          }

          if (concat.endsWith("\n")) {
            yield* _(left.set(""))
            return concat.split("\n").filter((_) => _.length > 0)
          } else {
            const all = concat.split("\n")

            if (all.length > 0) {
              const last = all.splice(all.length - 1)[0]

              yield* _(left.set(last))

              return all.filter((_) => _.length > 0)
            } else {
              return []
            }
          }
        })
    )
  })
)

readFileStream(path.join(__dirname, "../../tsconfig.json"))
  ["|>"](S.aggregate(splitString))
  ["|>"](S.runCollect)
  ["|>"](
    T.chain((a) =>
      T.effectTotal(() => {
        console.log(a)
      })
    )
  )
  ["|>"](T.runMain)
