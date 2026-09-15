// Uint8Array hex methods: shipped in current browsers, not yet in TypeScript's
// lib. Delete this file once `lib.es*.d.ts` declares them.

interface Uint8Array {
  toHex(): string
}

interface Uint8ArrayConstructor {
  fromHex(hex: string): Uint8Array
}
