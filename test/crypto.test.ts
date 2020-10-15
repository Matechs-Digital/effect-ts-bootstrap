import * as Ex from "@effect-ts/core/Effect/Exit"
import { pipe } from "@effect-ts/core/Function"

import {
  hashPassword,
  InvalidPassword,
  PBKDF2ConfigLive,
  PBKDF2ConfigTest,
  verifyPassword
} from "../src/crypto"
import { testRuntime } from "./utils/runtime"

describe("Crypto Suite", () => {
  describe("Live", () => {
    const { runPromise, runPromiseExit } = pipe(PBKDF2ConfigLive, testRuntime)()

    it("should encode and verify password", async () => {
      const password = "wuihfjierngjkrnjgwrgn"
      const hash = await runPromise(hashPassword(password))
      const verify = await runPromiseExit(verifyPassword(password, hash))

      expect(verify).toEqual(Ex.unit)
    })

    it("should encode and not verify password", async () => {
      const password = "wuihfjierngjkrnjgwrgn"
      const passwordBad = "wuIhfjierngjkrnjgwrgn"
      const hash = await runPromise(hashPassword(password))
      const verify = await runPromiseExit(verifyPassword(passwordBad, hash))

      expect(verify).toEqual(Ex.fail(new InvalidPassword()))
    })
  })
  describe("Test", () => {
    const { runPromise, runPromiseExit } = pipe(PBKDF2ConfigTest, testRuntime)()

    it("should encode and verify password", async () => {
      const password = "wuihfjierngjkrnjgwrgn"
      const hash = await runPromise(hashPassword(password))
      const verify = await runPromiseExit(verifyPassword(password, hash))

      expect(verify).toEqual(Ex.unit)
    })

    it("should encode and not verify password", async () => {
      const password = "wuihfjierngjkrnjgwrgn"
      const passwordBad = "wuIhfjierngjkrnjgwrgn"
      const hash = await runPromise(hashPassword(password))
      const verify = await runPromiseExit(verifyPassword(passwordBad, hash))

      expect(verify).toEqual(Ex.fail(new InvalidPassword()))
    })
  })
})
