import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Timetable - weekly schedule entry.
 * One row = one period slot for a class: day + periodNumber is unique,
 * and a teacher cannot be double-booked across classes.
 *
 * Timetable N --- 1 Class, N --- 1 Subject, N --- 1 Teacher
 */
const timetableSchema = new Schema(
  {
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    day: {
      type: String,
      enum: { values: DAYS_OF_WEEK, message: 'Invalid day of week' },
      required: true,
      lowercase: true,
    },
    periodNumber: {
      type: Number,
      required: [true, 'Period number is required'],
      min: [1, 'Period must be >= 1'],
      max: [15, 'Period cannot exceed 15'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format'],
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher is required'],
    },
    room: { type: String, default: '', maxlength: [40, 'Room cannot exceed 40 characters'] },
    academicYear: {
      type: String,
      default: '',
      match: [/^$|^\d{4}-\d{4}$/, 'Academic year must look like 2025-2026'],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// A class cannot have two subjects in the same slot
timetableSchema.index(
  { class: 1, day: 1, periodNumber: 1 },
  { unique: true, name: 'uniq_class_slot' }
);

// A teacher cannot teach two classes in the same slot
timetableSchema.index(
  { teacher: 1, day: 1, periodNumber: 1 },
  { unique: true, name: 'uniq_teacher_slot' }
);

const Timetable = model('Timetable', timetableSchema);
export default Timetable;
