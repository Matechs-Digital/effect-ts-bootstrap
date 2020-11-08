import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import { pipe } from "@effect-ts/core/Function"

import {
  CryptoLive,
  hashPassword,
  InvalidPassword,
  PBKDF2ConfigLive,
  PBKDF2ConfigTest,
  verifyPassword
} from "../src/crypto"
import { testRuntime } from "./utils/runtime"

describe("Crypto Suite", () => {
  describe("Live", () => {
    const { it } = testRuntime(CryptoLive["<<<"](PBKDF2ConfigLive))()

    it("should hash and verify password", () =>
      T.gen(function* (_) {
        const password = "wuihfjierngjkrnjgwrgn"
        const hash = yield* _(hashPassword(password))
        const verify = yield* _(T.result(verifyPassword(password, hash)))

        expect(verify).toEqual(Ex.unit)
      }))

    it("should hash and not verify password", () =>
      T.gen(function* (_) {
        const password = "wuihfjierngjkrnjgwrgn"
        const passwordBad = "wuIhfjierngjkrnjgwrgn"
        const hash = yield* _(hashPassword(password))
        const verify = yield* _(T.result(verifyPassword(passwordBad, hash)))

        expect(verify).toEqual(Ex.fail(new InvalidPassword()))
      }))
  })

  describe("Test", () => {
    const { runPromise, runPromiseExit } = pipe(
      CryptoLive,
      L.using(PBKDF2ConfigTest),
      testRuntime
    )()

    it("should hash and verify password", async () => {
      const password = "wuihfjierngjkrnjgwrgn"
      const hash = await runPromise(hashPassword(password))
      const verify = await runPromiseExit(verifyPassword(password, hash))

      expect(verify).toEqual(Ex.unit)
    })

    it("should hash and not verify password", async () => {
      const password = "wuihfjierngjkrnjgwrgn"
      const passwordBad = "wuIhfjierngjkrnjgwrgn"
      const hash = await runPromise(hashPassword(password))
      const verify = await runPromiseExit(verifyPassword(passwordBad, hash))

      expect(verify).toEqual(Ex.fail(new InvalidPassword()))
    })
  })
})
