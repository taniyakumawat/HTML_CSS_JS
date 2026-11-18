import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/** Per-student attendance statuses. */
export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'leave'];

/**
 * Attendance - ONE document per class + subject + date (duplicate prevented
 * by a unique index). Individual students live inside `records`.
 *
 * Percentage = present / conducted * 100 (computed per subject, Phase 5/6).
 * Corrections are appended to `auditHistory` (never silently overwritten).
 *
 * Attendance N --- 1 Class, N --- 1 Subject, N --- 1 Teacher (conducted by)
 * records.student N --- 1 Student
 */
const attendanceRecordSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    status: {
      type: String,
      enum: { values: ATTENDANCE_STATUSES, message: 'Invalid attendance status' },
      required: true,
    },
    note: { type: String, default: '', maxlength: [200, 'Note too long'] },
    markedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const auditChangeSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    from: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    to: { type: String, enum: ATTENDANCE_STATUSES, required: true },
  },
  { _id: false }
);

const auditEntrySchema = new Schema(
  {
    action: {
      type: String,
      enum: ['created', 'updated', 'corrected'],
      required: true,
    },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String, default: '', maxlength: [500, 'Reason too long'] },
    changes: { type: [auditChangeSchema], default: [] },
  },
  { _id: false }
);

const attendanceSchema = new Schema(
  {
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null, // who conducted the class
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      // stored as start-of-day; must be unique per class + subject
    },
    periodNumber: { type: Number, default: null, min: 1, max: 15 },

    // The roster snapshot marked for this session
    records: {
      type: [attendanceRecordSchema],
      default: [],
      validate: {
        validator: (records) => records.length > 0,
        message: 'Attendance must contain at least one student record',
      },
    },

    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submittedAt: { type: Date, default: Date.now },

    // Immutable history of every change made after creation
    auditHistory: { type: [auditEntrySchema], default: [] },
  },
  { timestamps: true }
);

// ★ Prevent duplicate attendance: one entry per class + subject + date
attendanceSchema.index(
  { class: 1, subject: 1, date: 1 },
  { unique: true, name: 'uniq_class_subject_date' }
);

// Common report queries
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ class: 1, date: -1 });
attendanceSchema.index({ subject: 1, date: -1 });
// Student's personal history
attendanceSchema.index({ 'records.student': 1, date: -1 });

/** Unique-index duplicate key code (used by controllers to return a friendly 409). */
attendanceSchema.statics.DUPLICATE_CODE = 11000;

const Attendance = model('Attendance', attendanceSchema);
export default Attendance;
