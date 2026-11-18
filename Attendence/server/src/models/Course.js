import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Course - e.g. "Bachelor of Computer Applications" under department BCA.
 * Department 1 --- N Course
 * Course 1 --- N Semester, Course 1 --- N Subject, Course 1 --- N Class
 */
const courseSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'Code cannot exceed 30 characters'],
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    description: { type: String, default: '', maxlength: [1000, 'Description too long'] },
    durationYears: { type: Number, required: true, min: 1, max: 8, default: 3 },
    totalSemesters: { type: Number, required: true, min: 1, max: 24, default: 6 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Course = model('Course', courseSchema);
export default Course;
