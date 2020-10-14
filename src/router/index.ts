import * as A from "@effect-ts/core/Classic/Array"
import * as T from "@effect-ts/core/Effect"
import { flow, pipe } from "@effect-ts/core/Function"

import type { Request } from "../http"
import { accessQueueM } from "../http"

export class Empty<R> {
  readonly _R!: (_: R) => void
  readonly _tag = "Empty"
}

export type RouteFn<R> = (_: Request, next: T.UIO<void>) => T.RIO<R, void>

export class Route<R> {
  readonly _tag = "Route"
  constructor(readonly route: RouteFn<R>) {}
}

export class Concat<R> {
  readonly _tag = "Concat"
  constructor(readonly left: Routes<R>, readonly right: Routes<R>) {}
}

export type Routes<R> = Route<R> | Concat<R> | Empty<R>

export function route<R>(
  route: (request: Request, next: T.UIO<void>) => T.RIO<R, void>
) {
  return <R2>(self: Routes<R2>): Routes<R & R2> =>
    new Concat<R & R2>(self, new Route(route))
}

export type ProcessFn = (_: Request) => T.UIO<void>

export function toArray<R>(_: Routes<R>): readonly RouteFn<R>[] {
  switch (_._tag) {
    case "Empty": {
      return []
    }
    case "Route": {
      return [_.route]
    }
    case "Concat": {
      return [...toArray(_.left), ...toArray(_.right)]
    }
  }
}

export const init: Routes<unknown> = new Empty()

export function run<R>(_: Routes<R>) {
  const routes = toArray(_)

  const processFn = T.accessM((r: R) =>
    T.effectTotal(() =>
      A.reduce_(
        routes,
        <ProcessFn>((_: Request) =>
          T.effectTotal(() => {
            _.res.statusCode = 404
            _.res.end()
          })),
        (b, a) => (_) => T.provideAll_(a(_, b(_)), r)
      )
    )
  )

  return pipe(
    processFn,
    T.chain((process) =>
      accessQueueM((queue) =>
        pipe(queue.take, T.chain(flow(process, T.fork)), T.forever)
      )
    )
  )
}
