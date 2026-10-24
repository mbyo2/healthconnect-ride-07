// P1-26: POS sales are created through the create_pos_sale RPC, which
// prices every line from the dispensary's medication_inventory
// catalogue. The client sends item ids + quantities ONLY — unit
// prices and totals are derived server-side and any price fields a
// client might attach are stripped here and ignored there.

export interface PosCartLine {
  medication_inventory_id: string | null;
  quantity: number;
}

export const POS_DISCOUNT_BANDS = [0, 5, 10, 15] as const;

export function buildPosSaleItemsPayload(cart: PosCartLine[]) {
  return cart.map((item) => ({
    medication_inventory_id: item.medication_inventory_id,
    quantity: Math.max(1, Math.round(item.quantity) || 1),
  }));
}
