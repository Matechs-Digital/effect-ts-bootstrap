import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import type { _E, _R } from "@effect-ts/core/Utils"

export class GenEffect<K, A> {
  constructor(readonly op: K) {}

  *[Symbol.iterator](): Generator<GenEffect<K, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any) => {
  return new GenEffect(_)
}

export function gen<Eff extends GenEffect<any, any>, AEff>(
  f: (i: {
    <R, E, A>(_: T.Effect<R, E, A>): GenEffect<T.Effect<R, E, A>, A>
  }) => Generator<Eff, AEff, any>
): T.Effect<_R<Eff["op"]>, _E<Eff["op"]>, AEff> {
  return T.suspend(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): T.Effect<any, any, AEff> {
      if (state.done) {
        return T.succeed(state.value)
      }
      return T.chain_(state.value["op"], (val) => {
        const next = iterator.next(val)
        return run(next)
      })
    }

    return run(state)
  })
}

const program = gen(function* (_) {
  const a = yield* _(T.succeed(1))
  const b = yield* _(T.succeed(2))

  return a + b
})

pipe(
  program,
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  ),
  T.runMain
)
