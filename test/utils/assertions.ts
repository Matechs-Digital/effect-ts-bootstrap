import type * as Ex from "@effect-ts/core/Effect/Exit"
import { AssertionError } from "assert"

export function assertSuccess<E, A>(
  exit: Ex.Exit<E, A>
): asserts exit is Ex.Success<A> {
  if (exit._tag === "Failure") {
    throw new AssertionError({
      actual: exit,
      message: "Exit is a Failure"
    })
  }
}

export function assertFailure<E, A>(
  exit: Ex.Exit<E, A>
): asserts exit is Ex.Failure<E> {
  if (exit._tag === "Success") {
    throw new AssertionError({
      actual: exit,
      message: "Exit is a Success"
    })
  }
}
