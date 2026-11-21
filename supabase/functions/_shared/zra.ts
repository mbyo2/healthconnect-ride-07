// ZRA Smart Invoice (VSDC/OSDC) protocol library — TypeScript port of
// the proven Python library built for the Odoo module (spec: ZRA Smart
// Invoice VSDC API Specification v1.0.5 + the September 2026 saveSales
// delta adding custMblNo). Where the spec's field tables contradict its
// own JSON samples, the samples win (notably `orgInvcNo`, `sdcId`).
//
// This module is free of Deno-specific APIs on purpose: the vitest suite
// exercises the exact code the edge functions run. All money math is
// done on BigInt at 10^4 scale with round-half-up, mirroring the Python
// Decimal implementation — binary floats never get a vote.

// ---------------------------------------------------------------------------
// Tax bands (spec section 6.1, code class "04")
// ---------------------------------------------------------------------------
// band code -> { suffix (header field suffix), rate (% default), family }
// family: "vat" -> line fields vatCatCd / vatTaxblAmt / vatAmt
//         "ipl" -> line fields iplCatCd / iplTaxblAmt / iplAmt
//         "tl"  -> line fields tlCatCd / tlTaxblAmt / tlAmt
//         "excise" -> line fields exciseTxCatCd / exciseTaxblAmt / exciseTxAmt
export interface ZraBand {
  suffix: string;
  rate: number;
  family: "vat" | "ipl" | "tl" | "excise";
  name: string;
}

export const ZRA_BANDS: Record<string, ZraBand> = {
  A: { suffix: "A", rate: 16, family: "vat", name: "Standard Rated" },
  B: { suffix: "B", rate: 16, family: "vat", name: "Minimum Taxable Value (MTV)" },
  C1: { suffix: "C1", rate: 0, family: "vat", name: "Exports (zero-rated)" },
  C2: { suffix: "C2", rate: 0, family: "vat", name: "Zero-rating — Local Purchase Order" },
  C3: { suffix: "C3", rate: 0, family: "vat", name: "Zero-rated by nature" },
  D: { suffix: "D", rate: 0, family: "vat", name: "Exempt" },
  RVAT: { suffix: "Rvat", rate: 16, family: "vat", name: "Reverse VAT" },
  E: { suffix: "E", rate: 0, family: "vat", name: "Disbursement" },
  F: { suffix: "F", rate: 10, family: "vat", name: "Service Charge" },
  IPL1: { suffix: "Ipl1", rate: 5, family: "ipl", name: "Insurance Premium Levy" },
  IPL2: { suffix: "Ipl2", rate: 0, family: "ipl", name: "Re-Insurance Premium Levy" },
  TL: { suffix: "Tl", rate: 1.5, family: "tl", name: "Tourism Levy" },
  ECM: { suffix: "Ecm", rate: 5, family: "excise", name: "Excise on Coal" },
  EXEEG: { suffix: "Exeeg", rate: 3, family: "excise", name: "Excise Electricity" },
  TOT: { suffix: "Tot", rate: 0, family: "vat", name: "Turnover Tax" },
};

export const ZRA_BAND_ORDER = [
  "A", "B", "C1", "C2", "C3", "D", "Rvat", "E", "F",
  "Ipl1", "Ipl2", "Tl", "Ecm", "Exeeg", "Tot",
];

const BAND_BY_SUFFIX: Record<string, string> = Object.fromEntries(
  Object.entries(ZRA_BANDS).map(([code, b]) => [b.suffix, code]),
);

export const ZRA_SUCCESS_CODE = "000";

// Spec section 6.13 response codes -> plain-language explanations.
// These strings are shown to institution staff; never show raw codes.
export const ZRA_RESULT_MESSAGES: Record<string, string> = {
  "000": "Accepted by ZRA.",
  "001": "ZRA has no matching record for this request.",
  "884": "The customer TPIN was rejected by ZRA. Check the customer's TPIN and try again.",
  "891": "The request could not be built. Please contact your system administrator.",
  "892": "The request could not be built. Please contact your system administrator.",
  "893": "The request could not be built. Please contact your system administrator.",
  "894": "ZRA could not be reached. The declaration will be retried automatically.",
  "895": "The request was refused by the ZRA controller.",
  "896": "The request was refused by the ZRA controller.",
  "899": "The ZRA controller reported a client error.",
  "900": "The ZRA controller is missing its header information. Check the device configuration.",
  "901": "ZRA does not recognise this device. Check the TPIN, branch ID and device serial, then initialise the device again.",
  "902": "This device is already installed at ZRA. Initialisation is only needed once.",
  "903": "Only a VSDC device can be verified this way. Check the controller type in the ZRA configuration.",
  "910": "ZRA rejected the declaration data. Check the invoice details (items, tax bands and amounts) and try again.",
  "911": "The request sent to ZRA was incomplete.",
  "912": "The request sent to ZRA used a wrong method.",
  "921": "ZRA cannot accept this sales declaration yet.",
  "922": "ZRA needs the sales data before the sales invoice data.",
  "930": "ZRA could not find the original invoice. Check that the original invoice was declared and that its ZRA receipt number is stored.",
  "931": "The credit note amount is greater than the original invoice amount for an item.",
  "932": "An item on the credit note does not exist on the original invoice.",
  "934": "The credit note quantity is greater than the quantity on the original invoice.",
  "935": "The credit note details do not match the original invoice held by ZRA.",
  "990": "ZRA reported too many requests. The declaration will be retried automatically.",
  "991": "ZRA could not register the data.",
  "992": "ZRA could not update the data.",
  "993": "ZRA could not delete the data.",
  "994": "ZRA already holds this data (duplicate).",
  "995": "ZRA could not find a downloaded file.",
  "999": "ZRA reported an unknown error. The declaration will be retried automatically.",
};

// Codes where retrying the identical payload can never succeed on its
// own (the cause is master data the institution must fix).
export const ZRA_PERMANENT_CODES = new Set([
  "884", "901", "903", "910", "930", "931", "932", "934", "935",
]);

export class ZraError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZraError";
  }
}

// ---------------------------------------------------------------------------
// Exact decimal helpers (BigInt at 10^4 scale, round-half-up)
// ---------------------------------------------------------------------------
const SCALE4 = 10000n;

function toScaled4(value: number): bigint {
  // Inputs are money values with at most 4 decimal places.
  const neg = value < 0;
  const scaled = BigInt(Math.round(Math.abs(value) * 10000));
  return neg ? -scaled : scaled;
}

function fromScaled4(scaled: bigint): number {
  return Number(scaled) / 10000;
}

function roundHalfUpDiv(a: bigint, b: bigint): bigint {
  // a, b >= 0
  return (2n * a + b) / (2n * b);
}

export function round4(value: number): number {
  return fromScaled4(toScaled4(value));
}

export function round2(value: number): number {
  const neg = value < 0;
  const scaled = BigInt(Math.round(Math.abs(value) * 100));
  return (neg ? -Number(scaled) : Number(scaled)) / 100;
}

/** Split a tax-inclusive amount into (exclusive base, tax amount).
 *  Spec worked example: 100.00 at 16% -> (86.2069, 13.7931). */
export function splitTaxInclusive(
  totalInclusive: number,
  ratePercent: number,
): { base: number; tax: number } {
  const total4 = toScaled4(totalInclusive);
  const rateHundredths = BigInt(Math.round(ratePercent * 100));
  if (rateHundredths === 0n) {
    return { base: fromScaled4(total4), tax: 0 };
  }
  // base = total / (1 + rate/100) = total * 10000 / (10000 + rateHundredths)
  const base4 = roundHalfUpDiv(total4 * SCALE4, SCALE4 + rateHundredths);
  const tax4 = total4 - base4;
  return { base: fromScaled4(base4), tax: fromScaled4(tax4) };
}

/** base * rate% at 4dp (rate in percent, up to 2dp). */
function taxOnBase(base: number, ratePercent: number): number {
  const base4 = toScaled4(base);
  const rateHundredths = BigInt(Math.round(ratePercent * 100));
  if (rateHundredths === 0n) return 0;
  return fromScaled4(roundHalfUpDiv(base4 * rateHundredths, SCALE4));
}

export function plainResultMessage(resultCd: string, _resultMsg = ""): string {
  if (resultCd === ZRA_SUCCESS_CODE) return ZRA_RESULT_MESSAGES["000"];
  const known = ZRA_RESULT_MESSAGES[String(resultCd)];
  if (known) return known;
  return `ZRA refused the declaration (code ${resultCd}).`;
}

// ---------------------------------------------------------------------------
// Envelope / proof parsing
// ---------------------------------------------------------------------------
export interface ZraEnvelope {
  resultCd: string;
  resultMsg: string;
  data: unknown;
}

export function parseEnvelope(raw: unknown): ZraEnvelope {
  let body: unknown = raw;
  if (body === null || body === undefined) {
    throw new ZraError("No response was received from the ZRA controller.");
  }
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      throw new ZraError("The ZRA controller returned an unreadable response.");
    }
  }
  if (typeof body !== "object" || body === null || !("resultCd" in body)) {
    throw new ZraError("The ZRA controller returned an unexpected response.");
  }
  const env = body as Record<string, unknown>;
  return {
    resultCd: String(env.resultCd),
    resultMsg: typeof env.resultMsg === "string" ? env.resultMsg : "",
    data: env.data ?? null,
  };
}

export interface ZraSalesProof {
  rcptNo: number;
  intrlData: string;
  rcptSign: string;
  vsdcRcptPbctDate: string;
  sdcId: string;
  mrcNo: string;
  qrCodeUrl: string;
  totRcptNo: number | null;
}

export function parseSalesProof(data: unknown): ZraSalesProof {
  if (typeof data !== "object" || data === null) {
    throw new ZraError("ZRA accepted the request but returned no receipt details.");
  }
  const d = data as Record<string, unknown>;
  const proof: ZraSalesProof = {
    rcptNo: typeof d.rcptNo === "number" ? d.rcptNo : Number(d.rcptNo),
    intrlData: typeof d.intrlData === "string" ? d.intrlData : "",
    rcptSign: typeof d.rcptSign === "string" ? d.rcptSign : "",
    vsdcRcptPbctDate: typeof d.vsdcRcptPbctDate === "string" ? d.vsdcRcptPbctDate : "",
    sdcId: typeof d.sdcId === "string" ? d.sdcId : "",
    mrcNo: typeof d.mrcNo === "string" ? d.mrcNo : "",
    qrCodeUrl: typeof d.qrCodeUrl === "string" ? d.qrCodeUrl : "",
    totRcptNo: d.totRcptNo === undefined || d.totRcptNo === null ? null : Number(d.totRcptNo),
  };
  if (!Number.isFinite(proof.rcptNo)) {
    throw new ZraError("ZRA accepted the request but returned no receipt number.");
  }
  return proof;
}

/** Compose the receipt verification URL per the spec's QR format. */
export function composeQrUrl(
  portalBase: string,
  tpin: string,
  bhfId: string,
  rcptSign: string,
): string {
  if (!portalBase || !tpin || !bhfId || !rcptSign) return "";
  return `${portalBase.replace(/\/$/, "")}/common/link/ebm/receipt/indexEbmReceiptData?Data=${tpin}${bhfId}${rcptSign}`;
}

/** Portal host used when a controller does not return a qrCodeUrl. */
export function portalBaseFor(environment: string): string {
  return environment === "production"
    ? "https://portal.zra.org.zm"
    : "https://sandboxportal.zra.org.zm";
}

/** Default controller base URL when the institution has not set one. */
export function defaultControllerBaseUrl(
  controllerType: string,
  environment: string,
): string {
  if (environment !== "production") {
    return "https://api-sandbox.zra.org.zm/vsdc-api/v1";
  }
  // Production addresses are issued per taxpayer by ZRA; there is no
  // published default, so the institution must enter theirs.
  return "";
}

// ---------------------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------------------
function fmtDt14(dtStr: string | null | undefined): string {
  const digits = String(dtStr ?? "").replace(/\D/g, "");
  return (digits + "00000000000000").slice(0, 14);
}

function fmtDt8(dtStr: string | null | undefined): string {
  const digits = String(dtStr ?? "").replace(/\D/g, "");
  return (digits + "00000000").slice(0, 8);
}

/** Format a Date as yyyyMMddHHmmss in local (Africa/Lusaka) terms — the
 *  caller passes an ISO string already expressed in the desired zone. */
export function toZraDateTime(iso: string): string {
  return fmtDt14(iso);
}
export function toZraDate(iso: string): string {
  return fmtDt8(iso);
}

export interface ZraLineTax {
  band: string;
  rate: number;
}

export interface ZraSalesLine {
  itemCd: string;
  itemClsCd: string;
  name: string;
  barcode?: string;
  pkgUnitCd?: string;
  qtyUnitCd?: string;
  qty: number;
  /** Tax-inclusive line total AFTER discount (2dp). */
  totAmt: number;
  /** Discount percent applied to this line (0 when none). */
  discount?: number;
  taxes: ZraLineTax[];
}

interface LineBandAmounts {
  fields: {
    vatCatCd: string | null;
    vatTaxblAmt: number;
    vatAmt: number;
    iplCatCd: string | null;
    iplTaxblAmt: number;
    iplAmt: number;
    tlCatCd: string | null;
    tlTaxblAmt: number;
    tlAmt: number;
    exciseTxCatCd: string | null;
    exciseTaxblAmt: number;
    exciseTxAmt: number;
  };
  buckets: Map<string, { base: number; tax: number; rate: number }>;
}

function lineBandAmounts(line: ZraSalesLine): LineBandAmounts {
  const totAmt = round2(line.totAmt);
  const taxes = line.taxes ?? [];
  for (const tax of taxes) {
    if (!(tax.band in ZRA_BANDS)) {
      throw new ZraError(
        `Tax band '${tax.band}' is not a ZRA Smart Invoice band. Map every tax on the invoice to a ZRA band first.`,
      );
    }
  }
  const totalRate = taxes.reduce((sum, t) => sum + t.rate, 0);
  const baseCommon = totalRate
    ? splitTaxInclusive(totAmt, totalRate).base
    : round4(totAmt);

  const fields: LineBandAmounts["fields"] = {
    vatCatCd: null, vatTaxblAmt: 0, vatAmt: 0,
    iplCatCd: null, iplTaxblAmt: 0, iplAmt: 0,
    tlCatCd: null, tlTaxblAmt: 0, tlAmt: 0,
    exciseTxCatCd: null, exciseTaxblAmt: 0, exciseTxAmt: 0,
  };
  const buckets = new Map<string, { base: number; tax: number; rate: number }>();
  for (const tax of taxes) {
    const band = ZRA_BANDS[tax.band];
    const amt = tax.rate ? taxOnBase(baseCommon, tax.rate) : 0;
    buckets.set(tax.band, { base: baseCommon, tax: amt, rate: tax.rate });
    if (band.family === "vat") {
      fields.vatCatCd = tax.band;
      fields.vatTaxblAmt = baseCommon;
      fields.vatAmt = amt;
    } else if (band.family === "ipl") {
      fields.iplCatCd = tax.band;
      fields.iplTaxblAmt = baseCommon;
      fields.iplAmt = amt;
    } else if (band.family === "tl") {
      fields.tlCatCd = tax.band;
      fields.tlTaxblAmt = baseCommon;
      fields.tlAmt = amt;
    } else {
      fields.exciseTxCatCd = tax.band;
      fields.exciseTaxblAmt = baseCommon;
      fields.exciseTxAmt = amt;
    }
  }
  if (taxes.length === 0) {
    // Untaxed line: ZRA still expects the amounts carried at zero tax.
    fields.vatTaxblAmt = round4(totAmt);
  }
  return { fields, buckets };
}

function buildItemLine(seq: number, line: ZraSalesLine): {
  item: Record<string, unknown>;
  buckets: Map<string, { base: number; tax: number; rate: number }>;
} {
  const qty = Number(line.qty || 0);
  const totAmt = round2(line.totAmt);
  const dcRt = Number(line.discount || 0);
  let splyAmt: number;
  if (dcRt > 0) {
    // splyAmt = totAmt / (1 - dcRt/100), exact at 2dp
    const tot2 = BigInt(Math.round(totAmt * 100));
    const denom = BigInt(10000 - Math.round(dcRt * 100));
    splyAmt = Number(roundHalfUpDiv(tot2 * 10000n, denom)) / 100;
  } else {
    splyAmt = totAmt;
  }
  const dcAmt = round2(splyAmt - totAmt);
  // prc = splyAmt / qty at 4dp: (splyAmt4 * 10^4) / qty4, half-up.
  const prc = qty
    ? fromScaled4(roundHalfUpDiv(toScaled4(splyAmt) * SCALE4, toScaled4(qty)))
    : round4(splyAmt);
  const { fields, buckets } = lineBandAmounts(line);
  const item: Record<string, unknown> = {
    itemSeq: seq,
    itemCd: line.itemCd || "",
    itemClsCd: line.itemClsCd || "",
    itemNm: (line.name || "").slice(0, 200),
    bcd: line.barcode || "",
    pkgUnitCd: line.pkgUnitCd || "EA",
    pkg: 0,
    qtyUnitCd: line.qtyUnitCd || "U",
    qty,
    prc,
    splyAmt,
    dcRt,
    dcAmt,
    isrccCd: "",
    isrccNm: "",
    isrcRt: 0,
    isrcAmt: 0,
    vatCatCd: fields.vatCatCd,
    iplCatCd: fields.iplCatCd,
    tlCatCd: fields.tlCatCd,
    exciseTxCatCd: fields.exciseTxCatCd,
    vatTaxblAmt: fields.vatTaxblAmt,
    vatAmt: fields.vatAmt,
    exciseTaxblAmt: fields.exciseTaxblAmt,
    exciseTxAmt: fields.exciseTxAmt,
    tlTaxblAmt: fields.tlTaxblAmt,
    tlAmt: fields.tlAmt,
    iplTaxblAmt: fields.iplTaxblAmt,
    iplAmt: fields.iplAmt,
    totAmt,
  };
  return { item, buckets };
}

export interface ZraSalesInvoice {
  tpin: string;
  bhfId: string;
  cisInvcNo: string;
  custTpin?: string | null;
  custNm?: string | null;
  custMobile?: string | null;
  rcptTyCd: "S" | "R" | "D";
  orgInvcNo?: number;
  orgSdcId?: string;
  pmtTyCd?: string;
  salesDt: string;
  cfmDt: string;
  currency?: string;
  exchangeRt?: string;
  destnCountryCd?: string;
  lpoNumber?: string | null;
  rfdRsnCd?: string | null;
  rfdDt?: string | null;
  remark?: string;
  regrId?: string;
  regrNm?: string;
  lines: ZraSalesLine[];
}

export function buildSalesPayload(inv: ZraSalesInvoice): Record<string, unknown> {
  const rcptTy = inv.rcptTyCd || "S";
  const items: Record<string, unknown>[] = [];
  const bandTotals = new Map<string, { taxbl: bigint; rate: number; tax: bigint }>();
  let totTaxbl = 0n;
  let totTax = 0n;
  let totAmt = 0;

  inv.lines.forEach((line, idx) => {
    const { item, buckets } = buildItemLine(idx + 1, line);
    items.push(item);
    totAmt += Number(item.totAmt);
    if (buckets.size === 0) {
      totTaxbl += toScaled4(Number(item.totAmt));
    }
    for (const [band, { base, tax, rate }] of buckets) {
      const suffix = ZRA_BANDS[band].suffix;
      const entry = bandTotals.get(suffix) ?? { taxbl: 0n, rate, tax: 0n };
      entry.taxbl += toScaled4(base);
      entry.tax += toScaled4(tax);
      bandTotals.set(suffix, entry);
      totTaxbl += toScaled4(base);
      totTax += toScaled4(tax);
    }
  });

  const payload: Record<string, unknown> = {
    tpin: inv.tpin || "",
    bhfId: inv.bhfId || "000",
    orgInvcNo: Math.trunc(inv.orgInvcNo || 0),
    cisInvcNo: inv.cisInvcNo || "",
    custTpin: inv.custTpin || null,
    custNm: inv.custNm || null,
    salesTyCd: "N",
    rcptTyCd: rcptTy,
    pmtTyCd: inv.pmtTyCd || "01",
    salesSttsCd: "02",
    cfmDt: fmtDt14(inv.cfmDt),
    salesDt: fmtDt8(inv.salesDt || inv.cfmDt),
    stockRlsDt: null,
    cnclReqDt: null,
    cnclDt: null,
    rfdDt: rcptTy === "R" && inv.rfdDt ? fmtDt14(inv.rfdDt) : null,
    rfdRsnCd: rcptTy === "R" ? inv.rfdRsnCd || null : null,
    totItemCnt: items.length,
  };
  for (const suffix of ZRA_BAND_ORDER) {
    const entry = bandTotals.get(suffix);
    const bandCode = BAND_BY_SUFFIX[suffix];
    payload[`taxblAmt${suffix}`] = entry ? fromScaled4(entry.taxbl) : 0;
    payload[`taxRt${suffix}`] = entry ? entry.rate : ZRA_BANDS[bandCode].rate;
    payload[`taxAmt${suffix}`] = entry ? fromScaled4(entry.tax) : 0;
  }
  Object.assign(payload, {
    totTaxblAmt: fromScaled4(totTaxbl),
    totTaxAmt: fromScaled4(totTax),
    totAmt: round2(totAmt),
    prchrAcptcYn: "Y",
    remark: (inv.remark || "").slice(0, 400),
    regrId: inv.regrId || "dococlock",
    regrNm: inv.regrNm || "Doc'O Clock",
    modrId: inv.regrId || "dococlock",
    modrNm: inv.regrNm || "Doc'O Clock",
    saleCtyCd: "1",
    lpoNumber: inv.lpoNumber || null,
    currencyTyCd: inv.currency || "ZMW",
    exchangeRt: String(inv.exchangeRt || "1"),
    destnCountryCd: inv.destnCountryCd || "ZM",
    dbtRsnCd: "",
    invcAdjustReason: "",
    itemList: items,
  });
  if (rcptTy === "R" || rcptTy === "D") {
    if (!payload.orgInvcNo) {
      throw new ZraError(
        "This note refers to an original invoice that has no ZRA receipt number yet. Declare the original invoice first, then retry this note.",
      );
    }
    payload.orgSdcId = inv.orgSdcId || "";
    if (!payload.orgSdcId) {
      throw new ZraError(
        "The original invoice has no ZRA device ID stored, so this note cannot be linked to it. Declare the original invoice first, then retry this note.",
      );
    }
  }
  if (inv.custMobile) {
    // September 2026 spec addition (reward campaigns). Optional field.
    payload.custMblNo = String(inv.custMobile).slice(0, 20);
  }
  return payload;
}

export interface ZraItemRegistration {
  itemCd: string;
  itemClsCd: string;
  itemTyCd?: string;
  name: string;
  pkgUnitCd?: string;
  qtyUnitCd?: string;
  vatCatCd?: string;
  defaultPrice?: number;
  barcode?: string;
}

export function buildItemPayload(
  conn: { tpin: string; bhfId: string },
  product: ZraItemRegistration,
): Record<string, unknown> {
  return {
    tpin: conn.tpin || "",
    bhfId: conn.bhfId || "000",
    itemCd: product.itemCd || "",
    itemClsCd: product.itemClsCd || "",
    itemTyCd: product.itemTyCd || "2",
    itemNm: (product.name || "").slice(0, 200),
    itemStdNm: (product.name || "").slice(0, 200),
    orgnNatCd: "ZM",
    pkgUnitCd: product.pkgUnitCd || "EA",
    qtyUnitCd: product.qtyUnitCd || "U",
    vatCatCd: product.vatCatCd || "A",
    iplCatCd: null,
    tlCatCd: null,
    exciseTxCatCd: null,
    btchNo: null,
    bcd: product.barcode || "",
    dftPrc: Number(product.defaultPrice || 0),
    addInfo: "",
    sftyQty: 0,
    isrcAplcbYn: "N",
    useYn: "Y",
    regrNm: "Doc'O Clock",
    regrId: "dococlock",
    modrNm: "Doc'O Clock",
    modrId: "dococlock",
  };
}

/** Spec section 6.16 item code: ZM + type + pkg unit + qty unit + serial. */
export function generateItemCode(
  orgnNatCd: string,
  itemTyCd: string,
  pkgUnitCd: string,
  qtyUnitCd: string,
  serial: number,
): string {
  return `${(orgnNatCd || "ZM").slice(0, 2).toUpperCase()}${itemTyCd || "2"}${(pkgUnitCd || "EA").slice(0, 2).toUpperCase()}${(qtyUnitCd || "U").slice(0, 2).toUpperCase()}${String(Math.trunc(serial || 1)).padStart(7, "0")}`;
}

/** Exponential backoff for the submission queue: 5 min, doubling, 12 h cap. */
export function backoffSeconds(attempts: number): number {
  const n = Math.max(1, Math.trunc(attempts));
  return Math.min(300 * 2 ** (n - 1), 43200);
}

/** Map a Doc'O Clock billing payment_mode to a ZRA pmtTyCd (spec 6.9). */
export function zraPaymentTypeCode(paymentMode: string | null | undefined): string {
  switch (paymentMode) {
    case "cash": return "01";
    case "card": return "05";
    case "mobile_money": return "06";
    case "bank_transfer": return "08";
    case "cheque": return "04";
    case "insurance": return "07";
    default: return "01";
  }
}
