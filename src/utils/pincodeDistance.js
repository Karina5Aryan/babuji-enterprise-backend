// ─────────────────────────────────────────────────────────────────────────────
// pincodeDistance.js
// Offline Indian pincode → straight-line distance (km) using the
// `pincode-distance` package (no external API, no API key needed).
//
// Usage:
//   const { getDistanceKm } = require('./pincodeDistance');
//   const km = getDistanceKm('380001', '110001'); // → ~777 km
// ─────────────────────────────────────────────────────────────────────────────

const PincodeDistance = require('pincode-distance').default || require('pincode-distance');

// Singleton — the class loads a large JSON dataset; instantiate once at boot.
let _instance = null;
function getInstance() {
  if (!_instance) _instance = new PincodeDistance();
  return _instance;
}

/**
 * Returns straight-line distance in km between two Indian pincodes.
 * Returns 0 if either pincode is not found in the dataset (no crash).
 *
 * @param {string|number} fromPincode  e.g. '380001'
 * @param {string|number} toPincode    e.g. '110001'
 * @returns {number}  distance in km (rounded to 2 decimals)
 */
function getDistanceKm(fromPincode, toPincode) {
  if (!fromPincode || !toPincode) return 0;

  try {
    const lib = getInstance();

    const from = lib.getlatLng(String(fromPincode));
    const to   = lib.getlatLng(String(toPincode));

    // getlatLng returns null/undefined for unknown pincodes
    if (!from || !to || (from.lat === 0 && from.lng === 0) || (to.lat === 0 && to.lng === 0)) {
      console.warn(`[pincodeDistance] Unknown pincode: ${fromPincode} or ${toPincode}. Defaulting to 0 km.`);
      return 0;
    }

    const distKm = lib.getDistance(String(fromPincode), String(toPincode));

    if (typeof distKm !== 'number' || isNaN(distKm)) return 0;

    return Math.round(distKm * 100) / 100; // round to 2 decimal places
  } catch (err) {
    console.error('[pincodeDistance] Error calculating distance:', err.message);
    return 0;
  }
}

module.exports = { getDistanceKm };
