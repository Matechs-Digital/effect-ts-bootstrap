import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

// define a module
export interface ConsoleModule {
  prefix: T.UIO<string>
  end: string
  log: (message: string) => T.UIO<void>
}

// define a tag for the service
export const ConsoleModule = has<ConsoleModule>()

// access the module from environment
export const { end, log, prefix } = T.deriveLifted(ConsoleModule)(
  ["log"],
  ["prefix"],
  ["end"]
)

// T.Effect<Has<ConsoleModule>, never, void>
export const program = pipe(
  prefix,
  T.chain(log),
  T.andThen(log("world")),
  T.andThen(log("hello")),
  T.andThen(pipe(end, T.chain(log)))
)

// Run the program providing a concrete implementation
pipe(
  program,
  T.provideService(ConsoleModule)({
    log: (message) =>
      T.effectTotal(() => {
        console.log(message)
      }),
    prefix: T.succeed("hello"),
    end: "earth"
  }),
  T.runMain
)
