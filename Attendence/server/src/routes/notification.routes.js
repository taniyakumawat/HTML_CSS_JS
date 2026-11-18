import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { notificationController } from '../controllers/notification.controller.js';

const router = Router();

// Every signed-in role has a bell; recipients are always taken from the JWT.
router.use(requireAuth);

router.get('/', notificationController.getMyNotifications);
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markRead);

export default router;
