import * as A from "@effect-ts/core/Classic/Array"
import * as FA from "@effect-ts/core/Classic/FreeAssociative"
import * as T from "@effect-ts/core/Effect"
import type { Predicate } from "@effect-ts/core/Function"
import { flow, pipe } from "@effect-ts/core/Function"

import type { Request } from "../http"
import { accessQueueM } from "../http"

export class Empty<R, E> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _tag = "Empty"
}

export type RouteFn<R, E> = (_: Request, next: T.IO<E, void>) => T.Effect<R, E, void>

export type MiddleFn<R, E> = (route: RouteFn<R, E>) => RouteFn<R, E>

export class Middleware<R, E> {
  constructor(readonly middle: MiddleFn<R, E>) {}
}

export class Route<R, E> {
  readonly _tag = "Route"
  readonly _E!: () => E
  constructor(
    readonly route: RouteFn<R, any>,
    readonly middlewares = FA.init<Middleware<any, any>>()
  ) {}
  middleware<R2 extends R = R, E2 extends E = E>(): readonly Middleware<R2, E2>[] {
    return FA.toArray(this.middlewares)
  }
}

export class Concat<R, E> {
  readonly _tag = "Concat"
  constructor(readonly left: Routes<R, E>, readonly right: Routes<R, E>) {}
}

export type Routes<R, E> = Route<R, E> | Concat<R, E> | Empty<R, E>

export function route<R2, E2, R, E>(
  f: (request: Request, next: T.Effect<R2, E2, void>) => T.Effect<R, E, void>
) {
  return (self: Routes<R2, E2>): Routes<R, E> =>
    new Concat(self, new Route(f as any) as any) as any
}

export function match(path: Predicate<string>) {
  return <R, E>(f: (request: Request) => T.Effect<R, E, void>) => <R2, E2>(
    self: Routes<R2, E2>
  ): Routes<R & R2, E | E2> =>
    pipe(
      self,
      route(
        (_, n): T.Effect<R & R2, E | E2, void> =>
          _.req.url ? (path(_.req.url) ? f(_) : n) : n
      )
    )
}

export function middleware<R2, R, E, E2>(
  middle: (
    cont: RouteFn<R2, E2>
  ) => (_: Request, next: T.IO<E2, void>) => T.Effect<R, E, void>
) {
  return (self: Routes<R2, E2>): Routes<R, E> => {
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

export function toArray<R, E>(_: Routes<R, E>): readonly RouteFn<R, E>[] {
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

export const init: Routes<unknown, never> = new Empty()

export function run<R>(_: Routes<R, never>) {
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
