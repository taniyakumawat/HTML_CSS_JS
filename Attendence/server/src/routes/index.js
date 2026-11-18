import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import teacherRoutes from './teacher.routes.js';
import attendanceRoutes from './attendance.routes.js';
import studentRoutes from './student.routes.js';
import reportsRoutes from './reports.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

/**
 * Health check - used to verify the API is up.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Attendance API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ---------- Phase 3: authentication ----------
router.use('/auth', authRoutes);

// ---------- Phase 4: admin management modules ----------
router.use('/admin', adminRoutes);

// ---------- Phase 5: teacher workspace + attendance marking ----------
router.use('/teacher', teacherRoutes);
router.use('/attendance', attendanceRoutes);

// ---------- Phase 6: student workspace (read-only) ----------
router.use('/student', studentRoutes);

// ---------- Phase 7: reports + analytics + PDF/Excel export ----------
router.use('/reports', reportsRoutes);

// ---------- Phase 8: in-app notifications (all roles, JWT-scoped) ----------
router.use('/notifications', notificationRoutes);

// Phase 9+: /notifications is live; nothing else pending.

export default router;
