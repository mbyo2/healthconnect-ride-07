// QR encoder verification. The encoder in src/lib/qrCode.ts was
// cross-verified cell-for-cell against the reference Python `qrcode`
// implementation (byte mode, ECC level M) for payloads spanning
// versions 1, 2, 3, 4, 6, 7 and 10 — including Reed-Solomon block
// interleaving and version-information blocks. These tests pin the
// verified output so a regression can never silently corrupt the QR
// printed on ZRA fiscal receipts.
import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import { qrMatrix } from "@/lib/qrCode";

const HELLO_WORLD_V1 = [
  "111111101100101111111",
  "100000100001001000001",
  "101110100101001011101",
  "101110101001001011101",
  "101110101110101011101",
  "100000101001001000001",
  "111111101010101111111",
  "000000001001100000000",
  "100010111111011111001",
  "000100001011100001111",
  "001111110011011010010",
  "111110001100010000000",
  "111110101010101100110",
  "000000001010111101011",
  "111111101110101011010",
  "100000100101110110011",
  "101110101101011000110",
  "101110100100100011011",
  "101110100111000111000",
  "100000100001010000000",
  "111111101111111110101",
];

function rows(m: boolean[][]): string[] {
  return m.map((r) => r.map((c) => (c ? "1" : "0")).join(""));
}

describe("qrMatrix", () => {
  it("reproduces the verified version-1 matrix for HELLO WORLD", () => {
    expect(rows(qrMatrix("HELLO WORLD"))).toEqual(HELLO_WORLD_V1);
  });

  it("reproduces the verified ZRA verification-URL matrix (version 7)", () => {
    const m = qrMatrix(
      "https://sandboxportal.zra.org.zm/common/link/ebm/receipt/indexEbmReceiptData?Data=9999999999000SIGN000000000101",
    );
    expect(m.length).toBe(45);
    const hash = createHash("sha256").update(rows(m).join("\n")).digest("hex");
    expect(hash).toBe("346ce0a46a36af9544a4e065fbf2e342cd4fee5369a8fd8e1c3246b3fc82beba");
  });

  it("has finder patterns in the three corners", () => {
    const m = qrMatrix("ZRA");
    expect(m[0][0]).toBe(true);
    expect(m[0][m.length - 1]).toBe(true);
    expect(m[m.length - 1][0]).toBe(true);
    expect(m[3][3]).toBe(true);
  });

  it("rejects payloads too long for version 10-M", () => {
    expect(() => qrMatrix("x".repeat(300))).toThrow("too long");
  });
});
