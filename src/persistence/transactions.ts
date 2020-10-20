import "@effect-ts/core/Operators"

import { has } from "@effect-ts/core/Classic/Has"
import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"

import { Db } from "../db"
import type { Register } from "../model/api"
import { CredentialPersistence } from "./credential"
import { UserPersistence } from "./user"

export const makeTransactions = (
  { createCredential }: CredentialPersistence,
  { createUser }: UserPersistence,
  { transaction }: Db<"main">
) => ({
  register: ({ email, password }: Register) =>
    createUser({ email })
      ["|>"](T.tap((user) => createCredential({ userId: user.id, password })))
      ["|>"](transaction)
})

export interface Transactions extends ReturnType<typeof makeTransactions> {}

export const Transactions = has<Transactions>()

export const TransactionsLive = L.fromConstructor(Transactions)(makeTransactions)(
  CredentialPersistence,
  UserPersistence,
  Db("main")
)

export const { register } = T.deriveLifted(Transactions)(["register"], [], [])
