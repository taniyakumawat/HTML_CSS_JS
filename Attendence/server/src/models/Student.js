import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Student - academic profile of a student.
 * Student N --- 1 User (login), N --- 1 Department/Course/Semester/Class
 */
const studentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User account is required'],
      unique: true,
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'Roll number cannot exceed 30 characters'],
    },
    enrollmentNumber: { type: String, default: null, trim: true, uppercase: true },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      default: '',
      match: [/^[0-9+\-\s()]{7,20}$/, 'Please provide a valid phone number'],
    },
    gender: {
      type: String,
      enum: { values: ['male', 'female', 'other'], message: 'Invalid gender' },
      default: 'other',
    },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, default: '', maxlength: [300, 'Address too long'] },
    guardianName: { type: String, default: '', maxlength: [120, 'Guardian name too long'] },
    photoUrl: { type: String, default: '' },

    // Academic placement
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    semester: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
    class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    academicYear: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{4}$/, 'Academic year must look like 2025-2026'],
    },

    admissionDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Search by name / roll number (student ID search feature)
studentSchema.index({ name: 'text', rollNumber: 'text' });
// Roster queries
studentSchema.index({ class: 1, isActive: 1 });
studentSchema.index({ course: 1, semester: 1 });

const Student = model('Student', studentSchema);
export default Student;
