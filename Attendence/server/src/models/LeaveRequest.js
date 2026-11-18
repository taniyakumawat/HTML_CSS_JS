import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const LEAVE_TYPES = ['sick', 'personal', 'emergency', 'other'];
export const LEAVE_STATUS = ['pending', 'approved', 'rejected'];

/**
 * LeaveRequest - student applies for leave, teacher/admin approves.
 * LeaveRequest N --- 1 Student, reviewedBy N --- 1 User
 */
const leaveRequestSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    type: {
      type: String,
      enum: { values: LEAVE_TYPES, message: 'Invalid leave type' },
      default: 'other',
    },
    fromDate: { type: Date, required: [true, 'From date is required'] },
    toDate: { type: Date, required: [true, 'To date is required'] },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: { values: LEAVE_STATUS, message: 'Invalid leave status' },
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewComment: { type: String, default: '', maxlength: [500, 'Comment too long'] },
    attachmentUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

leaveRequestSchema.pre('validate', function (next) {
  if (this.fromDate && this.toDate && this.toDate < this.fromDate) {
    this.invalidate('toDate', 'To date must be after from date');
  }
  next();
});

leaveRequestSchema.index({ student: 1, status: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });

const LeaveRequest = model('LeaveRequest', leaveRequestSchema);
export default LeaveRequest;
