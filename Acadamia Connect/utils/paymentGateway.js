/**
 * Payment Gateway Integration for Academia Connect V2
 * Integrates with Chapa (Ethiopian payment gateway) for school fee processing.
 * 
 * Chapa API docs: https://developer.chapa.co/
 * 
 * To use in production:
 * 1. Sign up at https://chapa.co
 * 2. Get your secret key from the dashboard
 * 3. Set CHAPA_SECRET_KEY in your .env file
 */

const https = require('https');

const CHAPA_BASE_URL = 'https://api.chapa.co/v1';
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST-demo-key';

/**
 * Initialize a Chapa payment transaction
 * @param {Object} params - Payment parameters
 * @returns {Promise<Object>} - { success, checkout_url, tx_ref }
 */
async function initializePayment(params) {
  const {
    amount,
    currency = 'ETB',
    email,
    first_name,
    last_name,
    phone_number,
    tx_ref,
    callback_url,
    return_url,
    customization = {}
  } = params;

  const payload = JSON.stringify({
    amount: String(amount),
    currency,
    email,
    first_name,
    last_name,
    phone_number,
    tx_ref,
    callback_url,
    return_url,
    customization: {
      title: customization.title || 'School Fee Payment',
      description: customization.description || 'Academia Connect School Fee',
      logo: customization.logo || ''
    }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.chapa.co',
      path: '/v1/transaction/initialize',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'success') {
            resolve({
              success: true,
              checkout_url: parsed.data?.checkout_url,
              tx_ref
            });
          } else {
            resolve({
              success: false,
              message: parsed.message || 'Payment initialization failed'
            });
          }
        } catch (e) {
          resolve({ success: false, message: 'Invalid response from payment gateway' });
        }
      });
    });

    req.on('error', (e) => {
      // In demo/test mode, simulate a successful response
      if (CHAPA_SECRET_KEY.includes('demo')) {
        resolve({
          success: true,
          checkout_url: `https://checkout.chapa.co/checkout/payment/${tx_ref}`,
          tx_ref,
          demo: true
        });
      } else {
        resolve({ success: false, message: 'Payment gateway connection failed: ' + e.message });
      }
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Verify a Chapa payment transaction
 * @param {string} tx_ref - Transaction reference
 * @returns {Promise<Object>} - { success, status, amount }
 */
async function verifyPayment(tx_ref) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.chapa.co',
      path: `/v1/transaction/verify/${tx_ref}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CHAPA_SECRET_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'success' && parsed.data?.status === 'success') {
            resolve({
              success: true,
              status: 'paid',
              amount: parsed.data?.amount,
              currency: parsed.data?.currency
            });
          } else {
            resolve({
              success: false,
              status: parsed.data?.status || 'failed',
              message: parsed.message || 'Payment verification failed'
            });
          }
        } catch (e) {
          resolve({ success: false, status: 'error', message: 'Invalid response' });
        }
      });
    });

    req.on('error', (e) => {
      // Demo mode: simulate successful verification
      if (CHAPA_SECRET_KEY.includes('demo')) {
        resolve({ success: true, status: 'paid', amount: 0, demo: true });
      } else {
        resolve({ success: false, status: 'error', message: e.message });
      }
    });

    req.end();
  });
}

/**
 * Generate a unique transaction reference
 */
function generateTxRef(paymentId, schoolId) {
  return `AC-${schoolId}-${paymentId}-${Date.now()}`;
}

/**
 * Generate a simple HTML receipt
 */
function generateReceipt(payment, student, school) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - Academia Connect</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #C49A6C; padding-bottom: 20px; margin-bottom: 20px; }
    .logo { font-size: 1.5rem; font-weight: bold; color: #C49A6C; }
    .receipt-title { font-size: 1.2rem; color: #333; margin-top: 8px; }
    .receipt-no { color: #666; font-size: 0.9rem; }
    .details { margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .label { color: #666; }
    .value { font-weight: bold; }
    .status-paid { color: #2E7D32; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Academia Connect</div>
    <div class="receipt-title">Payment Receipt</div>
    <div class="receipt-no">Receipt #${payment.receipt_no || payment.id}</div>
  </div>
  <div class="details">
    <div class="detail-row"><span class="label">School</span><span class="value">${school?.name || 'N/A'}</span></div>
    <div class="detail-row"><span class="label">Student</span><span class="value">${student?.full_name || 'N/A'}</span></div>
    <div class="detail-row"><span class="label">Fee Type</span><span class="value">${payment.fee_type}</span></div>
    <div class="detail-row"><span class="label">Amount</span><span class="value">${payment.amount} ETB</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${payment.paid_date || new Date().toLocaleDateString()}</span></div>
    <div class="detail-row"><span class="label">Status</span><span class="value status-paid">PAID</span></div>
  </div>
  <div class="footer">
    <p>Thank you for your payment. This is an official receipt from Academia Connect.</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;
}

module.exports = {
  initializePayment,
  verifyPayment,
  generateTxRef,
  generateReceipt
};
