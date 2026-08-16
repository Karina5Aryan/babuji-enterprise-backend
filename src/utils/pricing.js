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
//   distanceKm    — straight-line distance between warehouse and delivery
//                   pincode in km (0 if unknown → distance charge = ₹0)
//
// Formula (when courier selected):
//   charge = baseCharge + (extraKg × perKgCharge) + (distanceKm × perKmCharge)
//
// Formula (default, no courier):
//   charge = defaultBase + (totalWeightKg × perKgRate) + (distanceKm × perKmRate)
//
// Free shipping threshold always wins — returns 0 for large orders.
// ─────────────────────────────────────────────────────────────────────────
function calculateShipping(subtotal, totalWeightKg = 0, courier = null, distanceKm = 0) {
  const freeThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD || 5000);

  // Free shipping on large orders regardless of courier or distance
  if (subtotal >= freeThreshold) return 0;

  const safeDistance = typeof distanceKm === 'number' && !isNaN(distanceKm) ? distanceKm : 0;

  if (courier) {
    const baseCharge   = courier.baseCharge   ?? Number(process.env.COURIER_BASE_CHARGE   || 40);
    const perKgCharge  = courier.perKgCharge  ?? Number(process.env.COURIER_PER_KG_CHARGE || 10);
    const perKmCharge  = courier.perKmCharge  ?? Number(process.env.COURIER_PER_KM_CHARGE || 2);
    const freeWeightKg = courier.freeWeightKg ?? Number(process.env.MAX_FREE_WEIGHT_KG    || 5);

    const extraKg      = Math.max(0, totalWeightKg - freeWeightKg);
    const weightCharge = extraKg * perKgCharge;
    const distCharge   = safeDistance * perKmCharge;

    return Math.round(baseCharge + weightCharge + distCharge);
  }

  // Default logic (no courier selected):
  //   base + weight component + distance component
  const base         = Number(process.env.DEFAULT_SHIPPING_CHARGE || 60);
  const perKgRate    = Number(process.env.COURIER_PER_KG_CHARGE   || 10);
  const perKmRate    = Number(process.env.COURIER_PER_KM_CHARGE   || 2);

  const weightCharge = totalWeightKg * perKgRate;
  const distCharge   = safeDistance * perKmRate;

  return Math.round(base + weightCharge + distCharge);
}

// Sum total weight from an array of order items.
// Each item must have: { weightKg, quantity }
function calculateTotalWeight(orderItems) {
  return orderItems.reduce((sum, item) => {
    return sum + (item.weightKg || 1) * item.quantity;
  }, 0);
}

module.exports = { resolveUnitPrice, calculateShipping, calculateTotalWeight };
