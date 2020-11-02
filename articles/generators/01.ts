function* constant<A>(a: A): Generator<A, A, A> {
  return yield a
}

function* countTo(n: number) {
  let i = 0
  while (i < n) {
    const a = yield* constant(i++)

    console.log(a)
  }
}

const iterator = countTo(10)

let current = iterator.next()

while (!current.done) {
  current = iterator.next(current.value)
}
