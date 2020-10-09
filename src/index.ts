import { main } from "./main"

// run the live program
const cancel = main()

// cancel execution on sigterm
process.on("SIGTERM", () => {
  cancel()
})

// cancel execution on ctrl+c
process.on("SIGINT", () => {
  cancel()
})
