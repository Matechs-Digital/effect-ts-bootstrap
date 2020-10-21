import "@effect-ts/core/Operators"

import * as T from "@effect-ts/core/Effect"
import * as C from "@effect-ts/core/Effect/Cause"
import { pretty } from "@effect-ts/core/Effect/Cause"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import * as Pr from "@effect-ts/core/Effect/Promise"
import { pipe, tuple } from "@effect-ts/core/Function"
import { None } from "@effect-ts/system/Fiber"

export interface TestRuntime<R> {
  runPromise: <E, A>(self: T.Effect<R & T.DefaultEnv, E, A>) => Promise<A>
  runPromiseExit: <E, A>(
    self: T.Effect<R & T.DefaultEnv, E, A>
  ) => Promise<Ex.Exit<E, A>>
  provide: <R2, E, A>(self: T.Effect<R & R2, E, A>) => T.Effect<R2, E, A>
}

export function testRuntime<R>(self: L.Layer<T.DefaultEnv, never, R>) {
  return ({
    close = 120_000,
    open = 120_000
  }: {
    open?: number
    close?: number
  } = {}): TestRuntime<R> => {
    const promiseEnv = Pr.unsafeMake<never, R>(None)
    const promiseRelMap = Pr.unsafeMake<never, M.ReleaseMap>(None)

    beforeAll(async () => {
      await pipe(
        T.do,
        T.bind("rm", () => M.makeReleaseMap),
        T.tap(({ rm }) => promiseRelMap["|>"](Pr.succeed(rm))),
        T.bind("res", ({ rm }) =>
          T.provideSome_(L.build(self).effect, (r: T.DefaultEnv) => tuple(r, rm))
        ),
        T.map(({ res }) => res[1]),
        T.result,
        T.chain((ex) => promiseEnv["|>"](Pr.complete(T.done(ex)))),
        T.runPromise
      )
    }, open)

    afterAll(async () => {
      const res = await promiseRelMap["|>"](Pr.await)
        ["|>"](T.chain((rm) => M.releaseAll(Ex.succeed(undefined), T.sequential)(rm)))
        ["|>"](T.runPromiseExit)

      if (res._tag === "Failure") {
        throw new Error(pretty(res.cause))
      }
    }, close)

    return {
      runPromise: (self) =>
        pipe(
          promiseEnv,
          Pr.await,
          T.chain((r) => self["|>"](T.provide(r))),
          T.runPromise
        ),
      runPromiseExit: (self) =>
        pipe(
          promiseEnv,
          Pr.await,
          T.chain((r) => self["|>"](T.provide(r))),
          T.runPromiseExit
        ),
      provide: (self) =>
        pipe(
          promiseEnv,
          Pr.await,
          T.chain((r) => self["|>"](T.provide(r)))
        )
    }
  }
}
