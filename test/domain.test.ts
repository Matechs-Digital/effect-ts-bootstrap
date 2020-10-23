import { left, right } from "@effect-ts/core/Classic/Either"
import * as T from "@effect-ts/core/Sync"
import { DecodeError } from "@effect-ts/morphic/Decoder/common"

import { decodeId } from "../src/model/common"
import { decodeUser } from "../src/model/user"

it("decodes user", () => {
  expect(
    T.runEither(
      decodeUser({
        createdAt: "2020-10-10T14:50:17.184Z",
        updatedAt: "2020-10-10T14:50:17.184Z",
        id: 1,
        email: "ma@example.org"
      })
    )
  ).toEqual(
    right({
      createdAt: new Date("2020-10-10T14:50:17.184Z"),
      updatedAt: new Date("2020-10-10T14:50:17.184Z"),
      id: 1,
      email: "ma@example.org"
    })
  )
})

it("fail to decode user", () => {
  expect(
    T.runEither(
      decodeUser({
        createdAt: "2020-10-10T14:50:17.184Z",
        updatedAt: "2020-10-10T14:50:17.184Z",
        id: 1,
        email: "example.org"
      })
    )
  ).toEqual(
    left(
      new DecodeError([
        {
          actual: "example.org",
          id: "email_shape",
          message: "email doesn't match the required pattern",
          name: "email"
        }
      ])
    )
  )
})

it("decodes id", () => {
  expect(
    T.runEither(
      decodeId({
        id: "bla"
      })
    )
  ).toEqual(
    left(
      new DecodeError([
        {
          actual: "bla",
          id: "bad_id_format",
          message: "id should be an integer",
          name: "id"
        }
      ])
    )
  )
})
