import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

// define a module
export interface ConsoleModule {
  log: (message: string) => T.UIO<void>
}

// define a tag for the service
export const ConsoleModule = has<ConsoleModule>()

// access the module from environment
export const { log } = T.deriveLifted(ConsoleModule)(["log"], [], [])

// T.Effect<Has<ConsoleModule>, never, void>
export const program = pipe(
  log("hello"),
  T.andThen(log("world")),
  T.andThen(log("hello")),
  T.andThen(log("eatrh"))
)

// Run the program providing a concrete implementation
pipe(
  program,
  T.provideService(ConsoleModule)({
    log: (message) =>
      T.effectTotal(() => {
        console.log(message)
      })
  }),
  T.runMain
)
