import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, paged } from '../utils/pagination.js';
import { ApiError } from '../middleware/error.js';
import Notification from '../models/Notification.js';

const isMine = (doc, userId) => String(doc.recipient) === String(userId);

export const notificationController = {
  /**
   * GET /api/notifications - my notifications (newest first) + unread count.
   * The recipient always comes from the JWT - never from the query string.
   */
  getMyNotifications: async (req, res, next) => {
    try {
      const { page, limit, skip } = getPagination(req, 15);
      const filter = { recipient: req.user.id };
      const [items, total, unreadCount] = await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(filter),
        Notification.countDocuments({ ...filter, isRead: false }),
      ]);
      sendSuccess(res, { ...paged(items, page, limit, total), unreadCount });
    } catch (error) {
      next(error);
    }
  },

  /** PUT /api/notifications/:id/read - mark ONE of my notifications read. */
  markRead: async (req, res, next) => {
    try {
      const doc = await Notification.findById(req.params.id);
      if (!doc || !isMine(doc, req.user.id)) {
        throw new ApiError(404, 'Notification not found');
      }
      if (!doc.isRead) {
        doc.isRead = true;
        doc.readAt = new Date();
        await doc.save();
      }
      sendSuccess(res, doc, 'Marked as read');
    } catch (error) {
      next(error);
    }
  },

  /** PUT /api/notifications/read-all - mark ALL of my notifications read. */
  markAllRead: async (req, res, next) => {
    try {
      const result = await Notification.updateMany(
        { recipient: req.user.id, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
      sendSuccess(res, { modified: result.modifiedCount }, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  },
};
