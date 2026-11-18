import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getAdminStats } from '../controllers/adminStats.controller.js';
import {
  departmentController,
  courseController,
  semesterController,
  subjectController,
  classController,
  timetableController,
} from '../controllers/academic.controller.js';
import { studentController, teacherController } from '../controllers/people.controller.js';
import {
  departmentRules,
  courseRules,
  semesterRules,
  subjectRules,
  classRules,
  timetableRules,
} from '../validations/academic.rules.js';
import {
  studentCreateRules,
  studentUpdateRules,
  teacherCreateRules,
  teacherUpdateRules,
} from '../validations/people.rules.js';

const router = Router();

// ★ Every /api/admin/* route requires a logged-in ADMIN
router.use(requireAuth, requireRole('admin'));

/** Wire the standard 5 REST handlers for a resource. */
const resource = (path, controller, createRules, updateRules = createRules) => {
  router.get(path, controller.list);
  router.get(`${path}/:id`, controller.detail);
  router.post(path, validate(createRules), controller.create);
  router.put(`${path}/:id`, validate(updateRules), controller.update);
  router.delete(`${path}/:id`, controller.remove);
};

// ---------- Dashboard ----------
router.get('/stats', getAdminStats);

// ---------- Academic structure ----------
resource('/departments', departmentController, departmentRules);
resource('/courses', courseController, courseRules);
resource('/semesters', semesterController, semesterRules);
resource('/subjects', subjectController, subjectRules);
resource('/classes', classController, classRules);
resource('/timetable', timetableController, timetableRules);

// ---------- People (User + profile) ----------
resource('/students', studentController, studentCreateRules, studentUpdateRules);
resource('/teachers', teacherController, teacherCreateRules, teacherUpdateRules);

// Soft-delete reversal
router.post('/students/:id/restore', studentController.restore);
router.post('/teachers/:id/restore', teacherController.restore);

// ---------- User account management ----------
router.get('/users', async (req, res, next) => {
  try {
    const { page, limit, skip, search } = getPagination(req);
    const User = (await import('../models/User.js')).default;
    const filter = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
      : {};
    if (req.query.role) filter.role = req.query.role;
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    sendSuccess(res, {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
