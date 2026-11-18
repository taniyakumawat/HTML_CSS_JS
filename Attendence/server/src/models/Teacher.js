import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Teacher - academic profile of a teacher.
 * Teacher N --- 1 User (login), N --- 1 Department
 * Assignments to subjects/classes live in Class.teachingAssignments.
 */
const teacherSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User account is required'],
      unique: true,
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'Employee ID cannot exceed 30 characters'],
    },
    name: {
      type: String,
      required: [true, 'Teacher name is required'],
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
    department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    qualification: { type: String, default: '', maxlength: [200, 'Qualification too long'] },
    subjects: { type: [String], default: [] }, // free-text expertise, e.g. ["DBMS", "OS"]
    joiningDate: { type: Date, default: Date.now },
    address: { type: String, default: '', maxlength: [300, 'Address too long'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

teacherSchema.index({ name: 'text', employeeId: 'text' });
teacherSchema.index({ department: 1, isActive: 1 });

const Teacher = model('Teacher', teacherSchema);
export default Teacher;
