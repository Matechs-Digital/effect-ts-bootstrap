import { right } from "@effect-ts/core/Classic/Either"
import * as T from "@effect-ts/core/Classic/Sync"

import { decodeUser } from "../src/model/user"

it("decodes user", () => {
  expect(
    T.runEither(
      decodeUser({
        createdAt: "2020-10-10T14:50:17.184Z",
        id: 1,
        name: "Michael"
      })
    )
  ).toEqual(
    right({
      createdAt: new Date("2020-10-10T14:50:17.184Z"),
      id: 1,
      name: "Michael"
    })
  )
})
