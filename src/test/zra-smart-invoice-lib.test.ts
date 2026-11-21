// ZRA Smart Invoice protocol library — the TypeScript port of the
// library proven against the ZRA VSDC API Specification v1.0.5 in the
// Odoo build (24 unit tests + 54 live flow checks per version). These
// tests pin the spec's own worked examples to the cent, credit-note
// referencing, response parsing and the plain-language error mapping.
import { describe, it, expect } from "vitest";
import {
  buildSalesPayload,
  buildItemPayload,
  composeQrUrl,
  generateItemCode,
  backoffSeconds,
  parseEnvelope,
  parseSalesProof,
  plainResultMessage,
  splitTaxInclusive,
  zraPaymentTypeCode,
  ZraError,
  type ZraSalesInvoice,
  type ZraSalesLine,
} from "../../supabase/functions/_shared/zra";

function saleInvoice(lines: ZraSalesLine[], over: Partial<ZraSalesInvoice> = {}): ZraSalesInvoice {
  return {
    tpin: "9999999999",
    bhfId: "000",
    cisInvcNo: "INV/2026/0001",
    custTpin: "8888888888",
    custNm: "SMART CUSTOMER",
    custMobile: "+260977000000",
    rcptTyCd: "S",
    orgInvcNo: 0,
    pmtTyCd: "01",
    salesDt: "20261120",
    cfmDt: "20261120101500",
    currency: "ZMW",
    exchangeRt: "1",
    destnCountryCd: "ZM",
    regrId: "dococlock",
    regrNm: "Doc'O Clock",
    lines,
    ...over,
  };
}

function line(totAmt: number, taxes: ZraSalesLine["taxes"], over: Partial<ZraSalesLine> = {}): ZraSalesLine {
  return {
    itemCd: "ZM2EAU0000001",
    itemClsCd: "50102517",
    name: "Bread",
    barcode: "",
    pkgUnitCd: "BA",
    qtyUnitCd: "BE",
    qty: 1,
    totAmt,
    discount: 0,
    taxes,
    ...over,
  };
}

describe("ZRA worked examples (spec samples, exact to the cent)", () => {
  it("spec sample: bread K100 at 16% VAT", () => {
    const payload = buildSalesPayload(saleInvoice([
      line(100, [{ band: "A", rate: 16 }]),
    ])) as any;
    const item = payload.itemList[0];
    expect(item.prc).toBe(100);
    expect(item.splyAmt).toBe(100);
    expect(item.vatTaxblAmt).toBe(86.2069);
    expect(item.vatAmt).toBe(13.7931);
    expect(item.totAmt).toBe(100);
    expect(payload.taxblAmtA).toBe(86.2069);
    expect(payload.taxRtA).toBe(16);
    expect(payload.taxAmtA).toBe(13.7931);
    expect(payload.totTaxblAmt).toBe(86.2069);
    expect(payload.totTaxAmt).toBe(13.7931);
    expect(payload.totAmt).toBe(100);
    expect(payload.orgInvcNo).toBe(0);
    expect(payload.rcptTyCd).toBe("S");
  });

  it("K125 at 20% discount lands on the same split", () => {
    const payload = buildSalesPayload(saleInvoice([
      line(100, [{ band: "A", rate: 16 }], { discount: 20 }),
    ])) as any;
    const item = payload.itemList[0];
    expect(item.prc).toBe(125);
    expect(item.splyAmt).toBe(125);
    expect(item.dcRt).toBe(20);
    expect(item.dcAmt).toBe(25);
    expect(item.totAmt).toBe(100);
    expect(item.vatTaxblAmt).toBe(86.2069);
    expect(item.vatAmt).toBe(13.7931);
  });

  it("spec header sample: band A item + IPL2 item", () => {
    const payload = buildSalesPayload(saleInvoice([
      line(100, [{ band: "A", rate: 16 }]),
      line(100, [{ band: "IPL2", rate: 0 }], { name: "Reinsurance" }),
    ])) as any;
    expect(payload.taxblAmtA).toBe(86.2069);
    expect(payload.taxAmtA).toBe(13.7931);
    expect(payload.taxblAmtIpl2).toBe(100);
    expect(payload.totTaxblAmt).toBe(186.2069);
    expect(payload.totTaxAmt).toBe(13.7931);
    expect(payload.totAmt).toBe(200);
  });

  it("splitTaxInclusive matches the spec example", () => {
    expect(splitTaxInclusive(100, 16)).toEqual({ base: 86.2069, tax: 13.7931 });
    expect(splitTaxInclusive(50, 0)).toEqual({ base: 50, tax: 0 });
  });
});

describe("multi-band invoices", () => {
  it("zero-rated export line carries base at zero tax", () => {
    const payload = buildSalesPayload(saleInvoice([
      line(400, [{ band: "C1", rate: 0 }]),
    ])) as any;
    const item = payload.itemList[0];
    expect(item.vatCatCd).toBe("C1");
    expect(item.vatTaxblAmt).toBe(400);
    expect(item.vatAmt).toBe(0);
    expect(payload.taxblAmtC1).toBe(400);
    expect(payload.taxRtC1).toBe(0);
  });

  it("mixed invoice buckets sum per band", () => {
    const payload = buildSalesPayload(saleInvoice([
      line(116, [{ band: "A", rate: 16 }]),
      line(50, [{ band: "D", rate: 0 }], { name: "Exempt item" }),
      line(105, [{ band: "IPL1", rate: 5 }], { name: "Insurance" }),
    ])) as any;
    expect(payload.taxblAmtA).toBe(100);
    expect(payload.taxAmtA).toBe(16);
    expect(payload.taxblAmtD).toBe(50);
    expect(payload.taxAmtD).toBe(0);
    expect(payload.taxblAmtIpl1).toBe(100);
    expect(payload.taxAmtIpl1).toBe(5);
    expect(payload.totAmt).toBe(271);
    const ins = payload.itemList[2];
    expect(ins.iplCatCd).toBe("IPL1");
    expect(ins.iplTaxblAmt).toBe(100);
    expect(ins.iplAmt).toBe(5);
  });

  it("stacked VAT + tourism levy share one base", () => {
    const payload = buildSalesPayload(saleInvoice([
      line(117.5, [{ band: "A", rate: 16 }, { band: "TL", rate: 1.5 }], { name: "Hotel night" }),
    ])) as any;
    const item = payload.itemList[0];
    expect(item.vatTaxblAmt).toBe(100);
    expect(item.vatAmt).toBe(16);
    expect(item.tlTaxblAmt).toBe(100);
    expect(item.tlAmt).toBe(1.5);
    expect(payload.taxAmtTl).toBe(1.5);
  });

  it("quantity line derives the unit price", () => {
    const payload = buildSalesPayload(saleInvoice([
      line(300, [{ band: "A", rate: 16 }], { qty: 3 }),
    ])) as any;
    expect(payload.itemList[0].prc).toBe(100);
    expect(payload.itemList[0].qty).toBe(3);
  });

  it("untaxed line still carries its base at zero tax", () => {
    const payload = buildSalesPayload(saleInvoice([
      line(75, []),
    ])) as any;
    expect(payload.itemList[0].vatTaxblAmt).toBe(75);
    expect(payload.totTaxblAmt).toBe(75);
    expect(payload.totTaxAmt).toBe(0);
  });

  it("sends custMblNo when the customer has a mobile (Sept 2026 delta)", () => {
    const payload = buildSalesPayload(saleInvoice([
      line(100, [{ band: "A", rate: 16 }]),
    ])) as any;
    expect(payload.custMblNo).toBe("+260977000000");
    const noMobile = buildSalesPayload(saleInvoice(
      [line(100, [{ band: "A", rate: 16 }])],
      { custMobile: null },
    )) as any;
    expect("custMblNo" in noMobile).toBe(false);
  });
});

describe("credit notes", () => {
  it("reference the original receipt number and device", () => {
    const payload = buildSalesPayload(saleInvoice(
      [line(100, [{ band: "A", rate: 16 }])],
      {
        rcptTyCd: "R",
        orgInvcNo: 101,
        orgSdcId: "SDC0010000553",
        rfdRsnCd: "06",
        rfdDt: "20261120120000",
        cisInvcNo: "INV/2026/0001R1",
      },
    )) as any;
    expect(payload.rcptTyCd).toBe("R");
    expect(payload.orgInvcNo).toBe(101);
    expect(payload.orgSdcId).toBe("SDC0010000553");
    expect(payload.rfdRsnCd).toBe("06");
    expect(payload.rfdDt).toBe("20261120120000");
  });

  it("refuse to build a credit note without the original receipt", () => {
    expect(() => buildSalesPayload(saleInvoice(
      [line(100, [{ band: "A", rate: 16 }])],
      { rcptTyCd: "R", orgInvcNo: 0, orgSdcId: "SDC0010000553" },
    ))).toThrow(ZraError);
    expect(() => buildSalesPayload(saleInvoice(
      [line(100, [{ band: "A", rate: 16 }])],
      { rcptTyCd: "R", orgInvcNo: 101, orgSdcId: "" },
    ))).toThrow(ZraError);
  });
});

describe("responses", () => {
  it("parses the envelope and the sales proof", () => {
    const env = parseEnvelope(JSON.stringify({
      resultCd: "000",
      resultMsg: "It is succeeded",
      resultDt: "20261120101500",
      data: {
        rcptNo: 101,
        intrlData: "INTRLDATA00000000000101",
        rcptSign: "SIGN000000000101",
        vsdcRcptPbctDate: "20261120101500",
        sdcId: "SDC0010000553",
        mrcNo: "WIS00001092",
        qrCodeUrl: "https://sandboxportal.zra.org.zm/common/link/ebm/receipt/indexEbmReceiptData?Data=9999999999000SIGN000000000101",
      },
    }));
    expect(env.resultCd).toBe("000");
    const proof = parseSalesProof(env.data);
    expect(proof.rcptNo).toBe(101);
    expect(proof.sdcId).toBe("SDC0010000553");
    expect(proof.mrcNo).toBe("WIS00001092");
  });

  it("rejects malformed bodies with plain language", () => {
    expect(() => parseEnvelope(null)).toThrow("No response was received");
    expect(() => parseEnvelope("not json")).toThrow("unreadable response");
    expect(() => parseEnvelope({ hello: 1 })).toThrow("unexpected response");
    expect(() => parseSalesProof(null)).toThrow("no receipt details");
    expect(() => parseSalesProof({})).toThrow("no receipt number");
  });

  it("composes the QR verification URL in the spec format", () => {
    expect(composeQrUrl("https://sandboxportal.zra.org.zm", "9999999999", "000", "SIGN000000000101"))
      .toBe("https://sandboxportal.zra.org.zm/common/link/ebm/receipt/indexEbmReceiptData?Data=9999999999000SIGN000000000101");
    expect(composeQrUrl("", "9999999999", "000", "X")).toBe("");
  });

  it("maps result codes to plain language, never raw system text", () => {
    expect(plainResultMessage("000")).toBe("Accepted by ZRA.");
    expect(plainResultMessage("901")).toContain("does not recognise this device");
    expect(plainResultMessage("930")).toContain("could not find the original invoice");
    expect(plainResultMessage("777")).toBe("ZRA refused the declaration (code 777).");
  });
});

describe("items, codes and queue behaviour", () => {
  it("generates item codes per spec 6.16", () => {
    expect(generateItemCode("ZM", "2", "NT", "BA", 12)).toBe("ZM2NTBA0000012");
    expect(generateItemCode("ZM", "3", "EA", "U", 1)).toBe("ZM3EAU0000001");
  });

  it("builds a saveItem payload with the device identity", () => {
    const payload = buildItemPayload(
      { tpin: "9999999999", bhfId: "000" },
      { itemCd: "ZM3EAU0000001", itemClsCd: "84111506", itemTyCd: "3", name: "Consultation", vatCatCd: "A", defaultPrice: 250 },
    ) as any;
    expect(payload.tpin).toBe("9999999999");
    expect(payload.itemCd).toBe("ZM3EAU0000001");
    expect(payload.itemTyCd).toBe("3");
    expect(payload.dftPrc).toBe(250);
    expect(payload.useYn).toBe("Y");
  });

  it("backs off exponentially with a 12h cap", () => {
    expect(backoffSeconds(1)).toBe(300);
    expect(backoffSeconds(2)).toBe(600);
    expect(backoffSeconds(3)).toBe(1200);
    expect(backoffSeconds(20)).toBe(43200);
  });

  it("maps Doc payment modes to ZRA payment type codes", () => {
    expect(zraPaymentTypeCode("cash")).toBe("01");
    expect(zraPaymentTypeCode("card")).toBe("05");
    expect(zraPaymentTypeCode("mobile_money")).toBe("06");
    expect(zraPaymentTypeCode("bank_transfer")).toBe("08");
    expect(zraPaymentTypeCode("cheque")).toBe("04");
    expect(zraPaymentTypeCode("insurance")).toBe("07");
    expect(zraPaymentTypeCode(null)).toBe("01");
  });
});
