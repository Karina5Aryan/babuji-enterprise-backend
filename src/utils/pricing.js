// Centralised pricing & shipping rules so the API is the source of truth.

// Per-unit price: wholesale price applies only in wholesale mode AND when the
// ordered quantity meets the product's minimum wholesale quantity.
function resolveUnitPrice(product, quantity, buyMode) {
  const wholesaleEligible =
    buyMode === 'wholesale' && quantity >= (product.minWholesaleQty || 1);
  return wholesaleEligible ? product.wholesalePrice : product.price;
}

// Slab-based shipping. Free over the configured threshold.
function calculateShipping(subtotal) {
  const freeThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD || 5000);
  const base = Number(process.env.DEFAULT_SHIPPING_CHARGE || 60);

  if (subtotal >= freeThreshold) return 0;
  if (subtotal >= 2000) return 100;
  return base;
}

module.exports = { resolveUnitPrice, calculateShipping };
