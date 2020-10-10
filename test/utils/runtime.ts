import type { DefaultEnv } from "@effect-ts/core/Effect"
import * as T from "@effect-ts/core/Effect"
import * as C from "@effect-ts/core/Effect/Cause"
import { FiberFailure } from "@effect-ts/core/Effect/Cause"
import * as Ex from "@effect-ts/core/Effect/Exit"
import type { Layer } from "@effect-ts/core/Effect/Layer"
import type { ReleaseMap } from "@effect-ts/core/Effect/Managed"
import * as M from "@effect-ts/core/Effect/Managed"
import { releaseAll } from "@effect-ts/core/Effect/Managed"
import { pipe, tuple } from "@effect-ts/core/Function"
import { AtomicReference } from "@effect-ts/system/Support/AtomicReference"

export interface TestRuntime<R> {
  runPromise: <E, A>(self: T.Effect<R & DefaultEnv, E, A>) => Promise<A>
  runPromiseExit: <E, A>(self: T.Effect<R & DefaultEnv, E, A>) => Promise<Ex.Exit<E, A>>
}

export function testRuntime<R>(self: Layer<T.DefaultEnv, never, R>): TestRuntime<R> {
  const env = new AtomicReference<R | undefined>(undefined)
  const relMap = new AtomicReference<ReleaseMap | undefined>(undefined)

  beforeAll(async () => {
    const res = await pipe(
      T.do,
      T.bind("rm", () => M.makeReleaseMap),
      T.bind("res", ({ rm }) =>
        T.provideSome_(self.build.effect, (r: DefaultEnv) => tuple(r, rm))
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

      throw new FiberFailure(res.cause)
    }
  })

  afterAll(async () => {
    const rm = relMap.get
    if (rm) {
      const res = await T.runPromiseExit(
        releaseAll(Ex.succeed(undefined), T.sequential)(rm)
      )
      if (res._tag === "Failure") {
        console.log(C.pretty(res.cause))

        throw new FiberFailure(res.cause)
      }
    }
  })

  return {
    runPromise: <E, A>(self: T.Effect<R & DefaultEnv, E, A>) =>
      T.runPromise(
        T.suspend(() =>
          pipe(env.get, (e) =>
            e != null ? T.provide_(self, e) : T.die("environment not ready")
          )
        )
      ),
    runPromiseExit: <E, A>(self: T.Effect<R & DefaultEnv, E, A>) =>
      T.runPromiseExit(
        T.suspend(() =>
          pipe(env.get, (e) =>
            e != null ? T.provide_(self, e) : T.die("environment not ready")
          )
        )
      )
  }
}
