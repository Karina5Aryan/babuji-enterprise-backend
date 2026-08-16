// ─────────────────────────────────────────────────────────────────────────────
// delhivery.js — Delhivery API Client
//
// Wraps all Delhivery REST API calls used by Babuji Enterprise.
// Reads DELHIVERY_ENV to switch between staging and production automatically.
//
// Staging base URL  : https://staging-express.delhivery.com
// Production base URL: https://track.delhivery.com
// ─────────────────────────────────────────────────────────────────────────────

const https = require('https');
const http  = require('http');
const url   = require('url');

// ── Resolve base URL from env ────────────────────────────────────────────────
function getBaseUrl() {
  return process.env.DELHIVERY_ENV === 'production'
    ? 'https://track.delhivery.com'
    : 'https://staging-express.delhivery.com';
}

function getToken() {
  return process.env.DELHIVERY_API_TOKEN || '';
}

// ── Minimal HTTP helper (no external deps — uses Node built-ins) ─────────────
function request(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const baseUrl  = getBaseUrl();
    const fullUrl  = `${baseUrl}${endpoint}`;
    const parsed   = url.parse(fullUrl);
    const isHttps  = parsed.protocol === 'https:';
    const lib      = isHttps ? https : http;

    const headers = {
      Authorization: `Token ${getToken()}`,
      Accept:        'application/json',
    };

    let bodyBuffer = null;
    if (body) {
      bodyBuffer = Buffer.from(body, 'utf8');
      // Delhivery create-shipment expects application/x-www-form-urlencoded
      headers['Content-Type']   = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = bodyBuffer.length;
    }

    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.path,
      method,
      headers,
    };

    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });

    req.on('error', reject);
    if (bodyBuffer) req.write(bodyBuffer);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// checkServiceability(pincode)
//
// Returns whether the pincode is serviceable by Delhivery.
// Response shape: { serviceable: bool, cod: bool, prepaid: bool, pincode }
// ─────────────────────────────────────────────────────────────────────────────
async function checkServiceability(pincode) {
  const { status, data } = await request(
    'GET',
    `/c/api/pin-codes/json/?filter_codes=${pincode}`
  );

  if (status !== 200) {
    throw new Error(`Delhivery serviceability check failed (HTTP ${status})`);
  }

  // data.delivery_codes is an array; first element has the pincode details
  const entry = Array.isArray(data.delivery_codes) ? data.delivery_codes[0] : null;
  if (!entry) {
    return { serviceable: false, cod: false, prepaid: false, pincode };
  }

  const postal = entry.postal_code || {};
  return {
    serviceable: true,
    cod:         postal.cod  === 'Y',
    prepaid:     postal.pre_paid === 'Y',
    pincode:     String(pincode),
    city:        postal.city  || '',
    state:       postal.state || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// createShipment(order, options)
//
// Manifests an order in Delhivery and returns the AWB number.
//
// @param order     — Mongoose Order document (populated with address + items)
// @param options   — { paymentMode: 'Prepaid'|'COD', totalWeight, totalValue,
//                     sellerName, sellerPhone, sellerAddress, sellerPincode }
// @returns         — { awb, shipmentId, success }
// ─────────────────────────────────────────────────────────────────────────────
async function createShipment(order, options = {}) {
  const warehouseName = process.env.DELHIVERY_WAREHOUSE_NAME || 'Babuji Enterprise';

  const {
    paymentMode  = order.payment?.method === 'cod' ? 'COD' : 'Prepaid',
    totalWeight  = 0.5,  // kg — default 500g if not provided
    totalValue   = order.total || 0,
    sellerName   = warehouseName,
    sellerPhone  = '',
    sellerAddress= '',
    sellerPincode= process.env.WAREHOUSE_PINCODE || '',
  } = options;

  const addr = order.address || {};

  // Build the Delhivery shipment payload
  const shipmentData = {
    name:           addr.name  || 'Customer',
    add:            addr.line1 || '',
    city:           addr.city  || '',
    state:          addr.state || '',
    pin:            addr.pincode || '',
    country:        'India',
    phone:          addr.phone || '',
    order:          order.orderNumber,
    payment_mode:   paymentMode,
    cod_amount:     paymentMode === 'COD' ? totalValue : 0,
    total_amount:   totalValue,
    order_date:     new Date(order.createdAt || Date.now()).toISOString().slice(0, 10),
    weight:         Math.round(totalWeight * 1000),    // grams
    shipment_width: 20,   // cm default
    shipment_height:10,   // cm default
    shipment_length:30,   // cm default
    seller_name:    sellerName,
    seller_add:     sellerAddress,
    seller_pin:     sellerPincode,
    seller_phone:   sellerPhone,
    pickup_location:warehouseName,
    products_desc:  order.items?.map((i) => i.name).join(', ') || 'Grocery items',
    quantity:       order.items?.reduce((s, i) => s + i.quantity, 0) || 1,
  };

  // Delhivery expects: format=json&data=<JSON-of-shipments-array>
  const payload = `format=json&data=${JSON.stringify({
    shipments: [shipmentData],
  })}`;

  const { status, data } = await request('POST', '/api/cmu/create.json', payload);

  if (status !== 200 && status !== 201) {
    throw new Error(`Delhivery shipment creation failed (HTTP ${status}): ${JSON.stringify(data)}`);
  }

  // Delhivery returns packages array in response
  const pkg = Array.isArray(data.packages) ? data.packages[0] : null;
  if (!pkg) {
    throw new Error(`Delhivery did not return package data: ${JSON.stringify(data)}`);
  }

  if (!data.success) {
    throw new Error(`Delhivery rejected shipment: ${data.rmk || JSON.stringify(data)}`);
  }

  return {
    awb:        pkg.waybill    || '',
    shipmentId: pkg.refnum     || '',
    success:    true,
    raw:        data,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// trackShipment(awbNumber)
//
// Polls Delhivery for the latest tracking data of a given AWB.
// Returns the raw Delhivery tracking response.
// ─────────────────────────────────────────────────────────────────────────────
async function trackShipment(awbNumber) {
  const { status, data } = await request(
    'GET',
    `/api/v1/packages/json/?waybill=${awbNumber}&verbose=1`
  );

  if (status !== 200) {
    throw new Error(`Delhivery tracking failed (HTTP ${status})`);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// mapDelhiveryStatus(rawStatus)
//
// Maps a Delhivery scan status string to our internal SHIPMENT_STATUSES.
// ─────────────────────────────────────────────────────────────────────────────
function mapDelhiveryStatus(rawStatus = '') {
  const s = rawStatus.toLowerCase();

  if (s.includes('manifest') || s.includes('pickup schedul') || s.includes('booked'))
    return 'label_created';
  if (s.includes('picked up') || s.includes('pickup done'))
    return 'picked_up';
  if (s.includes('in transit') || s.includes('transit') || s.includes('reached'))
    return 'in_transit';
  if (s.includes('out for delivery') || s.includes('ofd'))
    return 'out_for_delivery';
  if (s.includes('delivered'))
    return 'delivered';
  if (s.includes('rto') || s.includes('return'))
    return 'returned';
  if (s.includes('failed') || s.includes('undelivered') || s.includes('nd-'))
    return 'failed_delivery';

  // Default: keep current status (caller handles this)
  return null;
}

module.exports = {
  checkServiceability,
  createShipment,
  trackShipment,
  mapDelhiveryStatus,
  getBaseUrl,
};
