const PDFDocument = require('pdfkit');

/**
 * Generates a PDF buffer for a given invoice.
 *
 * @param {Object} invoice  - Invoice document (Mongoose or plain object)
 * @param {Object} order    - Order document (for address + orderNumber)
 * @param {Object} user     - User document (for email)
 * @returns {Promise<Buffer>} PDF as a Buffer
 */
async function generateInvoicePdf(invoice, order, user) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data',  (chunk) => buffers.push(chunk));
      doc.on('end',   ()      => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const isCredit = invoice.type === 'credit_note';

      // ── Company Header ────────────────────────────────────────────────
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('BABUJI ENTERPRISE', { align: 'left' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#555555')
        .text('Wholesale & Retail Platform  |  Gujarat, India', { align: 'left' });

      doc.moveDown(0.3);

      // Invoice title (right-aligned)
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(isCredit ? '#c0392b' : '#1a3c5e')
        .text(isCredit ? 'CREDIT NOTE' : 'TAX INVOICE', { align: 'right' });

      doc.fillColor('#000000');

      // Horizontal rule
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke('#cccccc');
      doc.moveDown(0.6);

      // ── Invoice Meta ──────────────────────────────────────────────────
      const metaY = doc.y;
      const leftX  = 50;
      const rightX = 350;

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#333');
      doc.text('Invoice Number:', leftX, metaY);
      doc.text('Order Number:',   leftX, metaY + 16);
      doc.text('Date Issued:',    leftX, metaY + 32);

      doc.font('Helvetica').fillColor('#000');
      doc.text(invoice.invoiceNumber, leftX + 120, metaY);
      doc.text(order.orderNumber,     leftX + 120, metaY + 16);
      doc.text(
        new Date(invoice.issuedAt).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        }),
        leftX + 120, metaY + 32
      );

      // ── Bill To ───────────────────────────────────────────────────────
      const addr = order.address || {};
      doc.font('Helvetica-Bold').text('Bill To:', rightX, metaY);
      doc.font('Helvetica').fillColor('#444');
      doc.text(addr.name    || user.name,  rightX, metaY + 16);
      doc.text(addr.line1   || '',          rightX, metaY + 28);
      doc.text(
        [addr.city, addr.state].filter(Boolean).join(', ') +
          (addr.pincode ? ' - ' + addr.pincode : ''),
        rightX, metaY + 40
      );
      doc.text('Ph: ' + (addr.phone || ''),  rightX, metaY + 52);
      doc.text(user.email || '',              rightX, metaY + 64);

      doc.fillColor('#000');
      doc.moveDown(5.5);

      // ── Divider ───────────────────────────────────────────────────────
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke('#cccccc');
      doc.moveDown(0.5);

      // ── Table Header ──────────────────────────────────────────────────
      const col = { no: 50, name: 75, qty: 310, unitPrice: 380, lineTotal: 470 };
      const tableHeaderY = doc.y;

      doc
        .rect(50, tableHeaderY - 4, 495, 18)
        .fill('#1a3c5e');

      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
      doc.text('#',           col.no,        tableHeaderY);
      doc.text('Product',     col.name,      tableHeaderY);
      doc.text('Qty',         col.qty,       tableHeaderY);
      doc.text('Unit Price',  col.unitPrice, tableHeaderY);
      doc.text('Amount',      col.lineTotal, tableHeaderY);

      doc.moveDown(0.9);

      // ── Table Rows ────────────────────────────────────────────────────
      const items = invoice.items || [];
      items.forEach((item, i) => {
        const rowY = doc.y;
        const bgColor = i % 2 === 0 ? '#f9f9f9' : '#ffffff';
        doc.rect(50, rowY - 3, 495, 16).fill(bgColor);

        doc.fillColor('#000000').font('Helvetica').fontSize(9);
        doc.text(String(i + 1),                              col.no,        rowY);
        doc.text(item.name || '',                            col.name,      rowY, { width: 220 });
        doc.text(`${item.quantity} ${item.unit || ''}`.trim(), col.qty,     rowY);
        doc.text(`Rs. ${Number(item.unitPrice).toFixed(2)}`, col.unitPrice, rowY);
        doc.text(
          `Rs. ${(Number(item.unitPrice) * Number(item.quantity)).toFixed(2)}`,
          col.lineTotal, rowY
        );
        doc.moveDown(0.8);
      });

      // ── Divider ───────────────────────────────────────────────────────
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke('#cccccc');
      doc.moveDown(0.5);

      // ── Totals ────────────────────────────────────────────────────────
      const totalsX      = 360;
      const totalsLabelW = 110;
      const totalsValX   = totalsX + totalsLabelW + 10;

      const drawRow = (label, value, bold = false) => {
        const y = doc.y;
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(bold ? 11 : 9)
          .fillColor('#333333')
          .text(label, totalsX, y);
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(bold ? 11 : 9)
          .fillColor('#000000')
          .text(value, totalsValX, y, { align: 'left' });
        doc.moveDown(bold ? 0.6 : 0.45);
      };

      drawRow('Subtotal:',        `Rs. ${Number(invoice.subtotal).toFixed(2)}`);
      drawRow('Shipping Charge:', `Rs. ${Number(invoice.shippingCharge || 0).toFixed(2)}`);
      if (Number(invoice.tax) > 0) {
        drawRow('Tax (GST):', `Rs. ${Number(invoice.tax).toFixed(2)}`);
      }

      doc.moveDown(0.2);
      doc.moveTo(totalsX, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke('#999');
      doc.moveDown(0.3);
      drawRow('TOTAL:', `Rs. ${Number(invoice.total).toFixed(2)}`, true);

      // ── Credit Note Notice ────────────────────────────────────────────
      if (isCredit) {
        doc.moveDown(0.8);
        doc
          .fontSize(9)
          .fillColor('#c0392b')
          .font('Helvetica-Bold')
          .text(
            'This credit note has been issued against a cancelled order. ' +
            'Refund will be processed to the original payment method within 5-7 business days.',
            50, doc.y, { width: 495 }
          );
        doc.fillColor('#000000');
      }

      // ── Footer ────────────────────────────────────────────────────────
      const pageHeight = doc.page.height;
      doc.fontSize(8).font('Helvetica').fillColor('#888888');
      doc.text(
        'This is a computer-generated document. No signature is required.',
        50, pageHeight - 80,
        { align: 'center', width: 495 }
      );
      doc.text(
        'Thank you for shopping with Babuji Enterprise!',
        50, pageHeight - 68,
        { align: 'center', width: 495 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePdf };
