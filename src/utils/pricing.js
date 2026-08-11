// Centralised pricing & shipping rules so the API is the source of truth.

// Per-unit price: wholesale price applies only in wholesale mode AND when the
// ordered quantity meets the product's minimum wholesale quantity.
function resolveUnitPrice(product, quantity, buyMode) {
  const wholesaleEligible =
    buyMode === 'wholesale' && quantity >= (product.minWholesaleQty || 1);
  return wholesaleEligible ? product.wholesalePrice : product.price;
}

// ─────────────────────────────────────────────────────────────────────────
// calculateShipping
//   subtotal      — order subtotal in ₹
//   totalWeightKg — total weight of all items in kg (pass 0 if unknown)
//   courier       — CourierPartner document or null
//
// When a courier partner is provided, their specific charge rules are used.
// Otherwise falls back to the slab-based default.
// ─────────────────────────────────────────────────────────────────────────
function calculateShipping(subtotal, totalWeightKg = 0, courier = null) {
  const freeThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD || 5000);

  // Free shipping on large orders regardless of courier
  if (subtotal >= freeThreshold) return 0;

  if (courier) {
    const baseCharge   = courier.baseCharge   ?? Number(process.env.COURIER_BASE_CHARGE   || 40);
    const perKgCharge  = courier.perKgCharge  ?? Number(process.env.COURIER_PER_KG_CHARGE || 10);
    const freeWeightKg = courier.freeWeightKg ?? Number(process.env.MAX_FREE_WEIGHT_KG    || 5);

    const extraKg = Math.max(0, totalWeightKg - freeWeightKg);
    return Math.round(baseCharge + extraKg * perKgCharge);
  }

  // Default slab-based logic (no courier selected)
  const base = Number(process.env.DEFAULT_SHIPPING_CHARGE || 60);
  if (subtotal >= 2000) return 100;
  return base;
}

// Sum total weight from an array of order items.
// Each item must have: { weightKg, quantity }
function calculateTotalWeight(orderItems) {
  return orderItems.reduce((sum, item) => {
    return sum + (item.weightKg || 1) * item.quantity;
  }, 0);
}

module.exports = { resolveUnitPrice, calculateShipping, calculateTotalWeight };
