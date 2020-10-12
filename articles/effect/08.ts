import * as T from "@effect-ts/core/Effect"
import * as R from "@effect-ts/core/Effect/Ref"
import { pipe } from "@effect-ts/core/Function"

// define a module
export interface ConsoleModule {
  log: (message: string) => T.UIO<void>
}

// access the module from environment
export function log(message: string) {
  return T.accessM((_: ConsoleModule) => _.log(message))
}

// T.Effect<ConsoleModule, never, void>
export const program = pipe(
  log("hello"),
  T.andThen(log("world")),
  T.andThen(log("hello")),
  T.andThen(log("eatrh"))
)

// Run the program providing a concrete implementation
pipe(
  T.do,
  T.bind("ref", () => R.makeRef(<string[]>[])),
  T.bind("prog", ({ ref }) =>
    pipe(
      program,
      T.provide<ConsoleModule>({
        log: (message) =>
          pipe(
            ref,
            R.update((messages) => [...messages, message])
          )
      })
    )
  ),
  T.chain(({ ref }) => ref.get),
  T.tap((messages) =>
    messages.length === 4 ? T.succeed(messages) : T.fail("wrong number of messages")
  ),
  T.runMain
)
