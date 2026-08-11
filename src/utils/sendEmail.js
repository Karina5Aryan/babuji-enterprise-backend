const nodemailer = require('nodemailer');

// Lazy-created transporter — only initialised when first called
let _transporter = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

/**
 * Send an email with an optional PDF attachment.
 *
 * @param {Object} options
 * @param {string}  options.to          - Recipient email
 * @param {string}  options.subject     - Email subject
 * @param {string}  options.html        - HTML body
 * @param {Buffer}  [options.pdfBuffer] - PDF attachment buffer
 * @param {string}  [options.pdfName]   - PDF filename e.g. "INV-1001.pdf"
 */
async function sendEmail({ to, subject, html, pdfBuffer, pdfName }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[sendEmail] SMTP credentials not configured — skipping email send.');
    return;
  }

  const transporter = getTransporter();

  const mailOptions = {
    from:    process.env.EMAIL_FROM || 'Babuji Enterprise <no-reply@babuji.com>',
    to,
    subject,
    html,
    attachments: pdfBuffer
      ? [{ filename: pdfName || 'invoice.pdf', content: pdfBuffer, contentType: 'application/pdf' }]
      : [],
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    // Log but don't crash the request — email is non-critical
    console.error('[sendEmail] Failed to send email:', err.message);
  }
}

/**
 * Builds the HTML body for an order confirmation email.
 */
function buildInvoiceEmailHtml(invoiceNumber, orderNumber, total) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1a3c5e;">Babuji Enterprise</h2>
      <p>Hi there,</p>
      <p>Thank you for your order! Your invoice <strong>${invoiceNumber}</strong>
         for order <strong>${orderNumber}</strong> is attached to this email.</p>
      <p><strong>Total: Rs. ${Number(total).toFixed(2)}</strong></p>
      <p>If you have any questions, please reply to this email.</p>
      <br/>
      <p style="color:#888;font-size:12px;">Babuji Enterprise — Wholesale & Retail Platform</p>
    </div>
  `;
}

module.exports = { sendEmail, buildInvoiceEmailHtml };
