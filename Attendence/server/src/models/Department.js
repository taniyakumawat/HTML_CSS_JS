import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Department - BCA, BBA, BCom, etc.
 * Department 1 --- N Course
 */
const departmentSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Code cannot exceed 20 characters'],
    },
    description: { type: String, default: '', maxlength: [500, 'Description too long'] },
    head: { type: Schema.Types.ObjectId, ref: 'Teacher', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

departmentSchema.index({ name: 'text', code: 'text' });

const Department = model('Department', departmentSchema);
export default Department;
