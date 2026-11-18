import ExcelJS from 'exceljs';

/**
 * Render a styled .xlsx report to the response.
 * columns: [{ header, key, excelWidth?, accessor?, percent?, dateCol? }]
 * - percent columns stay NUMERIC (format 0"%") so Excel can sort/sum them
 * - date columns stay real Dates (format dd-mmm-yyyy)
 */
export const renderExcel = async ({
  res,
  sheetName = 'Report',
  title,
  metaLine = '',
  summaryLine = '',
  columns,
  rows,
  filename,
}) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(String(sheetName).slice(0, 31));

  ws.columns = columns.map((c) => ({
    key: c.key,
    width: c.excelWidth || Math.max(9, c.width || 14),
  }));

  const titleRow = ws.addRow([title]);
  titleRow.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  if (metaLine) ws.addRow([metaLine]).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  if (summaryLine) ws.addRow([summaryLine]).font = { bold: true, size: 10, color: { argb: 'FF4338CA' } };
  ws.addRow([]);

  const headerRow = ws.addRow(columns.map((c) => c.header));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  headerRow.alignment = { vertical: 'middle' };

  const bandFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  const border = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  rows.forEach((row, idx) => {
    const cells = columns.map((c) => {
      if (c.dateCol) return row[c.key] instanceof Date ? new Date(row[c.key]) : row[c.key];
      if (c.percent) return Number(row[c.key]) || 0;
      return c.accessor ? c.accessor(row) : (row[c.key] ?? '');
    });
    const r = ws.addRow(cells);
    r.alignment = { vertical: 'middle' };
    r.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.border = border;
      const col = columns[colNum - 1];
      if (idx % 2 === 1) cell.fill = bandFill;
      if (col?.percent) cell.numFmt = '0"%"';
      if (col?.dateCol && cell.value instanceof Date) cell.numFmt = 'dd-mmm-yyyy';
      if (col && col.align === 'center') cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.end(Buffer.from(buffer));
};
