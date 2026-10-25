// Legacy pharmacy_sales completion: PharmacyManagement POS Board sales
// are created through the create_pharmacy_sale RPC, which prices every
// line from the selling pharmacy's pharmacy_inventory catalogue and
// computes subtotal / tax / total server-side. The client sends item
// ids + quantities ONLY — unit prices and totals are derived
// server-side and any price fields a client might attach are stripped
// here and ignored there.

export interface PharmacyCartLine {
  pharmacy_inventory_id: string | null;
  quantity: number;
}

/** The POS Board's openly displayed tax rule — now a server constant in
 *  create_pharmacy_sale. Kept here only so the cart preview can show the
 *  same figures the RPC will charge; the receipt uses the RPC response. */
export const PHARMACY_SALE_TAX_RATE = 0.16;

export function buildPharmacySaleItemsPayload(cart: PharmacyCartLine[]) {
  return cart.map((item) => ({
    pharmacy_inventory_id: item.pharmacy_inventory_id,
    quantity: Math.max(1, Math.round(item.quantity) || 1),
  }));
}

export function pharmacySalePreview(subtotal: number) {
  const tax = Math.round(subtotal * PHARMACY_SALE_TAX_RATE * 100) / 100;
  return { subtotal, tax, total: subtotal + tax };
}
