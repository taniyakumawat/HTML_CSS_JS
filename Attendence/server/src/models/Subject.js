import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Subject - taught within a course + semester (e.g. "Data Structures").
 * Course 1 --- N Subject, Semester 1 --- N Subject
 * Teacher assignment happens on Class.teachingAssignments.
 */
const subjectSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'Code cannot exceed 30 characters'],
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
    credits: { type: Number, min: 0, max: 10, default: 4 },
    type: {
      type: String,
      enum: { values: ['theory', 'practical', 'elective'], message: 'Invalid subject type' },
      default: 'theory',
    },
    description: { type: String, default: '', maxlength: [500, 'Description too long'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subjectSchema.index({ course: 1, semester: 1 });

const Subject = model('Subject', subjectSchema);
export default Subject;
