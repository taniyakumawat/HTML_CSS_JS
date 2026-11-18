import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;

/** All user roles supported by the system. */
export const USER_ROLES = ['admin', 'teacher', 'student'];

/**
 * User = login account.
 * - admin   -> no profile ref
 * - teacher -> `teacher` ref points to Teacher profile
 * - student -> `student` ref points to Student profile
 */
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned unless explicitly selected
    },
    role: {
      type: String,
      enum: { values: USER_ROLES, message: 'Role must be admin, teacher or student' },
      required: true,
      default: 'student',
    },
    // Profile links - exactly one is set according to role
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', default: null },
    student: { type: Schema.Types.ObjectId, ref: 'Student', default: null },

    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },

    // Forgot-password flow (Phase 3/9)
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

// ---------- Hash password automatically ----------
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/** Compare a plain password with the stored hash. */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ---------- Never expose secrets in API responses ----------
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.__v;
    return ret;
  },
});

const User = model('User', userSchema);
export default User;
