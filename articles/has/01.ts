import { has } from "@effect-ts/core/Classic/Has"

/**
 * Any interface or type alias
 */
interface Anything {
  a: string
}

/**
 * Tag<Anything>
 */
const Anything = has<Anything>()

/**
 * (r: Has<Anything>) => Anything
 */
const readFromEnv = Anything.read

/**
 * (_: Anything) => Has<Anything>
 */
const createEnv = Anything.of

const hasAnything = createEnv({ a: "foo" })

/**
 * Has<Anything> is fake, in reality we have:
 *
 * { [Symbol()]: { a: 'foo' } }
 */
console.log(hasAnything)

/**
 * The [Symbol()] is:
 */
console.log((hasAnything as any)[Anything.key])

/**
 * The same as:
 */
console.log(readFromEnv(hasAnything))

/**
 * In order to take ownership of the symbol used we can do:
 */
const mySymbol = Symbol()

const Anything_ = has<Anything>().setKey(mySymbol)

console.log((Anything_.of({ a: "bar" }) as any)[mySymbol])
