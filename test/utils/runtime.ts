import * as T from "@effect-ts/core/Effect"
import * as C from "@effect-ts/core/Effect/Cause"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import * as M from "@effect-ts/core/Effect/Managed"
import { pipe, tuple } from "@effect-ts/core/Function"
import { AtomicReference } from "@effect-ts/system/Support/AtomicReference"

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
    const env = new AtomicReference<R | undefined>(undefined)
    const relMap = new AtomicReference<M.ReleaseMap | undefined>(undefined)

    beforeAll(async () => {
      const res = await pipe(
        T.do,
        T.bind("rm", () => M.makeReleaseMap),
        T.bind("res", ({ rm }) =>
          T.provideSome_(L.build(self).effect, (r: T.DefaultEnv) => tuple(r, rm))
        ),
        T.tap(({ res, rm }) =>
          T.effectTotal(() => {
            env.set(res[1])
            relMap.set(rm)
          })
        ),
        T.runPromiseExit
      )

      if (res._tag === "Failure") {
        console.log(C.pretty(res.cause))

        throw new C.FiberFailure(res.cause)
      }
    }, open)

    afterAll(async () => {
      const rm = relMap.get
      if (rm) {
        const res = await T.runPromiseExit(
          M.releaseAll(Ex.succeed(undefined), T.sequential)(rm)
        )
        if (res._tag === "Failure") {
          console.log(C.pretty(res.cause))

          throw new C.FiberFailure(res.cause)
        }
      }
    }, close)

    return {
      runPromise: (self) =>
        T.runPromise(
          T.suspend(() =>
            pipe(env.get, (e) =>
              e != null ? T.provide_(self, e) : T.die("environment not ready")
            )
          )
        ),
      runPromiseExit: (self) =>
        T.runPromiseExit(
          T.suspend(() =>
            pipe(env.get, (e) =>
              e != null ? T.provide_(self, e) : T.die("environment not ready")
            )
          )
        ),
      provide: (self) =>
        pipe(env.get, (e) =>
          e != null ? T.provide_(self, e) : T.die("environment not ready")
        )
    }
  }
}
