import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination } from '../utils/pagination.js';
import {
  buildReport,
  buildTrend,
  reportFilterOptions,
} from '../services/report.service.js';
import { REPORT_COLUMNS, REPORT_LABEL } from '../services/report.columns.js';
import { renderTablePdf } from '../services/pdf.js';
import { renderExcel } from '../services/excel.js';

const EXPORT_ROW_CAP = 5000;

const typeOf = (req) => String(req.query.type || 'sessions');

const filenameFor = (type, query, ext) => {
  const from = query.from || 'all';
  const to = query.to || 'today';
  return `attendance-${type}-${from}_to_${to}.${ext}`.replace(/[^\w.\-]/g, '_');
};

const metaFor = (query) => {
  const period = `${query.from || 'Beginning'} to ${query.to || 'Today'}`;
  const extras = [];
  if (query.class) extras.push('class filter');
  if (query.subject) extras.push('subject filter');
  if (query.semester) extras.push('semester filter');
  if (query.search) extras.push(`search "${query.search}"`);
  return `Period: ${period}${extras.length ? ' · Filters: ' + extras.join(', ') : ''}`;
};

const summaryLineFor = (summary) =>
  summary && summary.total
    ? `Present ${summary.present}  ·  Late ${summary.late}  ·  Absent ${summary.absent}  ·  Leave ${summary.leave}  ·  Total records ${summary.total}  ·  Overall ${summary.percentage}%`
    : 'No records match the selected filters.';

export const reportsController = {
  /** GET /api/reports - paginated report (sessions|students|subjects|classes). */
  getReport: async (req, res, next) => {
    try {
      const { page, limit } = getPagination(req);
      const result = await buildReport(req, req.query, { page, limit });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/reports/trend - daily percentages for charts (default last 90 days). */
  getTrend: async (req, res, next) => {
    try {
      const points = await buildTrend(req, req.query);
      sendSuccess(res, { points });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/reports/options - filter dropdown data (scoped by role). */
  getOptions: async (req, res, next) => {
    try {
      const options = await reportFilterOptions(req);
      sendSuccess(res, options);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/reports/export/pdf - full (uncapped page) PDF download. */
  exportPdf: async (req, res, next) => {
    try {
      const type = typeOf(req);
      const result = await buildReport(req, req.query, {
        page: 1,
        limit: EXPORT_ROW_CAP,
        maxLimit: EXPORT_ROW_CAP,
      });
      renderTablePdf({
        res,
        title: REPORT_LABEL[result.type] || 'Attendance Report',
        subtitle: 'Smart College Attendance Management System',
        metaLine: metaFor(req.query),
        summaryLine: summaryLineFor(result.summary),
        columns: REPORT_COLUMNS[result.type],
        rows: result.items,
        filename: filenameFor(result.type, req.query, 'pdf'),
      });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/reports/export/excel - full .xlsx download. */
  exportExcel: async (req, res, next) => {
    try {
      const type = typeOf(req);
      const result = await buildReport(req, req.query, {
        page: 1,
        limit: EXPORT_ROW_CAP,
        maxLimit: EXPORT_ROW_CAP,
      });
      await renderExcel({
        res,
        sheetName: REPORT_LABEL[result.type] || 'Report',
        title: REPORT_LABEL[result.type] || 'Attendance Report',
        metaLine: metaFor(req.query),
        summaryLine: summaryLineFor(result.summary),
        columns: REPORT_COLUMNS[result.type],
        rows: result.items,
        filename: filenameFor(result.type, req.query, 'xlsx'),
      });
    } catch (error) {
      next(error);
    }
  },
};
