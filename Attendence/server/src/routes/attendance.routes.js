import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { attendanceController } from '../controllers/attendance.controller.js';
import {
  markAttendanceRules,
  updateAttendanceRules,
} from '../validations/attendance.rules.js';

const router = Router();

// ★ Teachers mark their own classes; admins can view/manage everything.
//   Students are NOT allowed (they never mark or edit attendance).
router.use(requireAuth, requireRole('teacher', 'admin'));

router.get('/session', attendanceController.getSession);
router.get('/sessions', attendanceController.listSessions);
router.post('/', validate(markAttendanceRules), attendanceController.markAttendance);
router.put('/:id', validate(updateAttendanceRules), attendanceController.updateAttendance);

export default router;
