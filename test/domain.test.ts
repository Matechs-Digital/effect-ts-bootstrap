import { left, right } from "@effect-ts/core/Classic/Either"
import * as T from "@effect-ts/core/Classic/Sync"
import { DecodeError } from "@effect-ts/morphic/Decoder/common"

import { decodeId, encodeId } from "../src/model/common"
import { decodeUser } from "../src/model/user"

it("decodes user", () => {
  expect(
    T.runEither(
      decodeUser({
        createdAt: "2020-10-10T14:50:17.184Z",
        id: "1",
        name: "Michael"
      })
    )
  ).toEqual(
    right({
      createdAt: new Date("2020-10-10T14:50:17.184Z"),
      id: BigInt(1),
      name: "Michael"
    })
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
          message: "id should be a big integer encoded as a string",
          name: "id"
        }
      ])
    )
  )
})
