import "reflect-metadata"
// @ts-expect-error
BigInt.prototype.toJSON = function () {
  return `${this.toString()}`
}
