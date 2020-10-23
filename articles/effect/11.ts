import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import { tag } from "@effect-ts/core/Has"

// define a module
export interface ConsoleModule {
  prefix: string
  end: string
  log: (message: string) => T.UIO<void>
}

// define a tag for the service
export const ConsoleModule = tag<ConsoleModule>()

// access the module from environment
export const { log } = T.deriveLifted(ConsoleModule)(["log"], [], [])

export const { end: accessEndM, prefix: accessPrefixM } = T.deriveAccessM(
  ConsoleModule
)(["end", "prefix"])

// T.Effect<Has<ConsoleModule>, never, void>
export const program = pipe(
  accessPrefixM(log),
  T.andThen(log("world")),
  T.andThen(log("hello")),
  T.andThen(accessEndM(log))
)

// Run the program providing a concrete implementation
pipe(
  program,
  T.provideService(ConsoleModule)({
    log: (message) =>
      T.effectTotal(() => {
        console.log(message)
      }),
    prefix: "hello",
    end: "earth"
  }),
  T.runMain
)
