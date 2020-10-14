import * as A from "@effect-ts/core/Classic/Array"
import * as FA from "@effect-ts/core/Classic/FreeAssociative"
import * as T from "@effect-ts/core/Effect"
import { flow, pipe } from "@effect-ts/core/Function"
import { AtomicReference } from "@effect-ts/system/Support/AtomicReference"

import type { Request } from "../http"
import { accessQueueM } from "../http"

export class Empty<R> {
  readonly _R!: (_: R) => void
  readonly _tag = "Empty"
}

export type RouteFn<R> = (_: Request, next: T.UIO<void>) => T.RIO<R, void>

export type MiddleFn<R> = (route: RouteFn<R>) => RouteFn<R>

export class Middleware<R> {
  constructor(readonly middle: MiddleFn<R>) {}
}

export class Route<R> {
  readonly _tag = "Route"
  constructor(
    readonly route: RouteFn<R>,
    readonly middlewares = FA.init<Middleware<any>>()
  ) {}
  middleware<R2 extends R = R>(): readonly Middleware<R2>[] {
    return FA.toArray(this.middlewares)
  }
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

export function middleware<R2, R>(middle: (cont: RouteFn<R2>) => RouteFn<R>) {
  return (self: Routes<R2>): Routes<R> => {
    switch (self._tag) {
      case "Empty": {
        return self as any
      }
      case "Route": {
        return new Route(
          self.route,
          FA.append(new Middleware(middle as any))(self.middlewares)
        ) as any
      }
      case "Concat": {
        return new Concat(middleware(middle)(self.left), middleware(middle)(self.right))
      }
    }
  }
}

export type ProcessFn = (_: Request) => T.UIO<void>

export function toArray<R>(_: Routes<R>): readonly RouteFn<R>[] {
  switch (_._tag) {
    case "Empty": {
      return []
    }
    case "Route": {
      const middlewares = _.middleware()
      if (A.isNonEmpty(middlewares)) {
        return [A.reduce_(middlewares, _.route, (b, m) => (r, n) => m.middle(b)(r, n))]
      }
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
