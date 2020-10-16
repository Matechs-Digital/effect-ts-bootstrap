import * as A from "@effect-ts/core/Classic/Array"
import type { Option } from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Effect"
import { flow, pipe } from "@effect-ts/core/Function"
import type * as M from "@effect-ts/morphic"
import { decoder } from "@effect-ts/morphic/Decoder"
import type { DecodingError } from "@effect-ts/morphic/Decoder/common"
import { encoder } from "@effect-ts/morphic/Encoder"

import { allErrors } from "../../model/collectors"
import type { HTTPRouteException } from "../exceptions"
import { accessReqM, accessResM } from "../server"

export const readBody = accessReqM((req) =>
  T.effectAsyncInterrupt<unknown, never, Buffer>((cb) => {
    const body: Uint8Array[] = []

    function onData(chunk: Uint8Array) {
      body.push(chunk)
    }

    const onEnd = () => {
      cb(T.succeed(Buffer.concat(body)))
    }

    req.on("data", onData)
    req.on("end", onEnd)

    return T.effectTotal(() => {
      req.removeListener("data", onData)
      req.removeListener("end", onEnd)
    })
  })
)

export const readJsonBody = pipe(
  readBody,
  T.chain((b) =>
    T.effectPartial(
      (): HTTPRouteException => ({
        _tag: "HTTPRouteException",
        status: 400,
        message: "body cannot be parsed as json"
      })
    )(() => JSON.parse(b.toString("utf-8")))
  )
)

export function morphicBody<L, A>(
  _: M.M<{}, L, A>,
  collector: (_: DecodingError) => Option<string> = allErrors
) {
  const decode = decoder(_).decode

  return pipe(
    readJsonBody,
    T.chain(
      flow(
        decode,
        T.catchAll((_) => {
          const errors = A.filterMap_(_.errors, collector)
          return T.fail<HTTPRouteException>({
            _tag: "HTTPRouteException",
            status: 400,
            message: JSON.stringify({
              error: errors.length > 0 ? errors.join(", ") : "malformed body"
            })
          })
        })
      )
    )
  )
}

export function morphicResponse<L, A>(_: M.M<{}, L, A>) {
  const encode = encoder(_).encode

  return flow(
    encode,
    T.chain((l) =>
      accessResM((res) =>
        T.effectTotal(() => {
          res.setHeader("content-type", "application/json")
          res.end(JSON.stringify(l))
        })
      )
    )
  )
}
