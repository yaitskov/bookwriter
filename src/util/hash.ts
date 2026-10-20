export class Sha1 {
  private constructor(readonly hex: string) {
    if (!/^[0-9a-f]{40}$/.test(hex)) {
      throw new Error(`[hash] invalid sha1 hex: ${hex}`);
    }
  }

  static async fromBytes(content: Uint8Array<ArrayBuffer>): Promise<Sha1> {
    const digest = await crypto.subtle.digest("SHA-1", content);
    const hex = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    return new Sha1(hex);
  }

  static fromHex(hex: string): Sha1 {
    return new Sha1(hex);
  }

  toString(): string {
    return this.hex;
  }

  equals(other: Sha1): boolean {
    return this.hex === other.hex;
  }
}
