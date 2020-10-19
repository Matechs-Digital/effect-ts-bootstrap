import "@effect-ts/core/Operators"

import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"

import { transaction } from "../db"
import type { Register } from "../model/api"
import { createCredential } from "./credential"
import { createUser } from "./user"

export const makeTransactions = () => ({
  register: ({ email, password }: Register) =>
    createUser({ email })
      ["|>"](T.tap((user) => createCredential({ userId: user.id, password })))
      ["|>"](transaction("main"))
})

export interface Transactions extends ReturnType<typeof makeTransactions> {}

export const Transactions = has<Transactions>()

export const TransactionsLive = L.fromConstructor(Transactions)(makeTransactions)()

export const { register } = T.deriveLifted(Transactions)(["register"], [], [])
