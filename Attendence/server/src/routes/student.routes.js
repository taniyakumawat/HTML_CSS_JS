import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { studentController } from '../controllers/student.controller.js';

const router = Router();

// ★ Students can only ever read THEIR OWN data - profile id comes from the
//   token, never from the query string. No write endpoints exist here:
//   students can never mark or edit attendance.
router.use(requireAuth, requireRole('student'));

router.get('/stats', studentController.getMyStats);
router.get('/attendance', studentController.getMyAttendance);
router.get('/calendar', studentController.getMyCalendar);
router.get('/timetable', studentController.getMyTimetable);
router.get('/report/pdf', studentController.downloadMyReportPdf);

export default router;
