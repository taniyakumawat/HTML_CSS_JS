import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { teacherController } from '../controllers/teacher.controller.js';

const router = Router();

// ★ Every /api/teacher/* route requires a logged-in TEACHER
router.use(requireAuth, requireRole('teacher'));

router.get('/classes', teacherController.getMyClasses);
router.get('/classes/:id/students', teacherController.getClassStudents);
router.get('/subjects', teacherController.getMySubjects);
router.get('/timetable', teacherController.getMyTimetable);
router.get('/stats', teacherController.getMyStats);

export default router;
