import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Semester - belongs to a course (e.g. "Semester 1", year 1).
 * Course 1 --- N Semester
 */
const semesterSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    number: {
      type: Number,
      required: [true, 'Semester number is required'],
      min: [1, 'Semester number must be >= 1'],
      max: [24, 'Semester number cannot exceed 24'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1, 'Year must be >= 1'],
      max: [8, 'Year cannot exceed 8'],
    },
    name: {
      type: String,
      required: [true, 'Semester name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// A semester number can exist only once per course
semesterSchema.index({ course: 1, number: 1 }, { unique: true });

const Semester = model('Semester', semesterSchema);
export default Semester;
