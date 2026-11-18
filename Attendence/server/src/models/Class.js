import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Class = a section of students (e.g. "BCA-1-A": BCA, 1st year, section A).
 *
 * - Roster: students reference their Class via Student.class
 * - Teacher assignment: teachingAssignments pairs subjects with teachers,
 *   which is what attendance authorization checks against (Phase 5).
 *
 * Course 1 --- N Class, Semester 1 --- N Class, Teacher 1 --- N Class (classTeacher)
 */
const teachingAssignmentSchema = new Schema(
  {
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required in teaching assignment'],
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher is required in teaching assignment'],
    },
  },
  { _id: false }
);

const classSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      unique: true,
      trim: true,
      maxlength: [60, 'Class name cannot exceed 60 characters'],
      // e.g. BCA-1-A
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    semester: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester is required'],
    },
    section: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: [10, 'Section cannot exceed 10 characters'],
      default: 'A',
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      match: [/^\d{4}-\d{4}$/, 'Academic year must look like 2025-2026'],
      // e.g. 2025-2026
    },
    classTeacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    teachingAssignments: {
      type: [teachingAssignmentSchema],
      default: [],
    },
    room: { type: String, default: '', maxlength: [40, 'Room cannot exceed 40 characters'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Quick lookup: subjects/teachers assigned to a class
classSchema.index({ 'teachingAssignments.subject': 1, 'teachingAssignments.teacher': 1 });

const Class = model('Class', classSchema);
export default Class;
