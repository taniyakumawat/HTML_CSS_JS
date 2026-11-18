import PDFDocument from 'pdfkit';

const MARGIN = 40;
const ROW_H = 17;
const HEADER_FILL = '#4f46e5';

/** Truncate so a single-line cell never bleeds into the next column. */
const clip = (text, maxChars) => {
  const s = String(text ?? '');
  return s.length > maxChars ? s.slice(0, Math.max(1, maxChars - 1)) + '…' : s;
};

/**
 * Render a paginated A4 PDF table straight to the response stream.
 * columns: [{ header, key, width(%), align?, accessor?, percent?, dateCol? }]
 * Rows are rendered in order; header row repeats on every page.
 */
export const renderTablePdf = ({
  res,
  title,
  subtitle = '',
  metaLine = '',
  summaryLine = '',
  columns,
  rows,
  filename,
}) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
  doc.pipe(res);

  const contentWidth = doc.page.width - MARGIN * 2;
  const widths = columns.map((c) => (c.width / 100) * contentWidth);
  const bottomLimit = () => doc.page.height - MARGIN - 20;

  // ---------- title block ----------
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16).text(title);
  doc.moveDown(0.15);
  doc.fillColor('#475569').font('Helvetica').fontSize(9).text(subtitle);
  if (metaLine) doc.fillColor('#64748b').fontSize(8.5).text(metaLine);
  if (summaryLine) {
    doc.moveDown(0.2);
    doc.fillColor('#312e81').font('Helvetica-Bold').fontSize(9.5).text(summaryLine);
  }
  doc.moveDown(0.7);

  const drawHeader = (y) => {
    doc.save().rect(MARGIN, y, contentWidth, ROW_H).fill(HEADER_FILL).restore();
    let x = MARGIN;
    columns.forEach((c, i) => {
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(c.header, x + 4, y + 4.5, {
          width: widths[i] - 8,
          align: c.align || 'left',
          lineBreak: false,
        });
      x += widths[i];
    });
    return y + ROW_H;
  };

  let y = drawHeader(doc.y + 2);

  rows.forEach((row, idx) => {
    if (y + ROW_H > bottomLimit()) {
      doc.addPage();
      y = drawHeader(MARGIN);
    }
    if (idx % 2 === 1) {
      doc.save().rect(MARGIN, y, contentWidth, ROW_H).fill('#f8fafc').restore();
    }
    let x = MARGIN;
    columns.forEach((c, i) => {
      const raw = c.accessor ? c.accessor(row) : row[c.key];
      const maxChars = Math.max(5, Math.floor(widths[i] / 4.7));
      doc
        .fillColor('#1f2937')
        .font('Helvetica')
        .fontSize(8)
        .text(clip(raw, maxChars), x + 4, y + 4.5, {
          width: widths[i] - 8,
          align: c.align || 'left',
          lineBreak: false,
        });
      x += widths[i];
    });
    doc
      .save()
      .moveTo(MARGIN, y + ROW_H)
      .lineTo(MARGIN + contentWidth, y + ROW_H)
      .lineWidth(0.4)
      .strokeColor('#e2e8f0')
      .stroke()
      .restore();
    y += ROW_H;
  });

  if (!rows.length) {
    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(10)
      .text('No records match the selected filters.', MARGIN, y + 6);
  }

  // ---------- footers (buffered pages) ----------
  const range = doc.bufferedPageRange();
  const stamp = new Date().toLocaleString('en-IN');
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc
      .fillColor('#94a3b8')
      .font('Helvetica')
      .fontSize(7.5)
      .text(`Page ${i - range.start + 1} of ${range.count}   ·   Smart College Attendance   ·   Generated ${stamp}`, MARGIN, doc.page.height - 28, {
        width: contentWidth,
        align: 'center',
        lineBreak: false,
      });
  }

  doc.end();
};
