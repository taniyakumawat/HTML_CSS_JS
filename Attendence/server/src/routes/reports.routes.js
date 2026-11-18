import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { reportsController } from '../controllers/reports.controller.js';

const router = Router();

// ★ Admin: full access. Teacher: automatically limited to assigned
//   classes/subjects inside the service (403 on foreign class/subject).
//   Students can NEVER enter here - they use /api/student/report/pdf.
router.use(requireAuth, requireRole('admin', 'teacher'));

router.get('/', reportsController.getReport);
router.get('/trend', reportsController.getTrend);
router.get('/options', reportsController.getOptions);
router.get('/export/pdf', reportsController.exportPdf);
router.get('/export/excel', reportsController.exportExcel);

export default router;
