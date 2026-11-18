import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const NOTIFICATION_TYPES = ['info', 'success', 'warning', 'error'];

/**
 * Notification - per-user in-app notification
 * (attendance updates, leave decisions, shortage alerts...).
 * Notification N --- 1 User
 */
const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: { values: NOTIFICATION_TYPES, message: 'Invalid notification type' },
      default: 'info',
    },
    // Optional link back to the related document
    relatedModel: {
      type: String,
      enum: {
        values: ['', 'Student', 'Teacher', 'Attendance', 'LeaveRequest', 'Class'],
        message: 'Invalid related model',
      },
      default: '',
    },
    relatedId: { type: Schema.Types.ObjectId, default: null },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = model('Notification', notificationSchema);
export default Notification;
