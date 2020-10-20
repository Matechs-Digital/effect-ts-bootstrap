import * as A from "@effect-ts/core/Classic/Array"
import * as O from "@effect-ts/core/Classic/Option"
import * as DSL from "@effect-ts/core/Prelude/DSL"
import { isOption } from "@effect-ts/core/Utils"

const adapter: {
  <A>(_: O.Option<A>): DSL.GenHKT<A.Array<A>, A>
  <A>(_: A.Array<A>): DSL.GenHKT<A.Array<A>, A>
} = (_: any) => {
  if (isOption(_)) {
    return new DSL.GenHKT(_._tag === "None" ? [] : [_.value])
  }
  return new DSL.GenHKT(_)
}

const gen = DSL.genWithHistoryF(A.Monad, { adapter })

const res = gen(function* (_) {
  const a = yield* _(O.some(0))
  const x = yield* _(A.range(a, 10))

  return yield* _(A.range(x, x + 10))
})

console.log(res)
