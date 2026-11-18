import { ApiError } from '../middleware/error.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, buildSearchFilter, paged } from '../utils/pagination.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';

const STUDENT_POPULATE = [
  { path: 'user', select: 'email role isActive lastLoginAt' },
  { path: 'department', select: 'name code' },
  { path: 'course', select: 'name code' },
  { path: 'semester', select: 'name number' },
  { path: 'class', select: 'name section' },
];
const TEACHER_POPULATE = [
  { path: 'user', select: 'email role isActive lastLoginAt' },
  { path: 'department', select: 'name code' },
];

const assertEmailFree = async (email, excludeUserId = null) => {
  const filter = { email };
  if (excludeUserId) filter._id = { $ne: excludeUserId };
  const exists = await User.findOne(filter);
  if (exists) throw new ApiError(409, 'An account with this email already exists');
};

// =====================================================
//  STUDENTS  (User account + Student profile)
// =====================================================
export const studentController = {
  list: async (req, res, next) => {
    try {
      const { page, limit, skip, search, sort } = getPagination(req);
      const filter = {
        ...buildSearchFilter(search, ['name', 'rollNumber', 'email']),
      };
      if (req.query.class) filter.class = req.query.class;
      if (req.query.course) filter.course = req.query.course;
      if (req.query.status === 'active') filter.isActive = true;
      if (req.query.status === 'inactive') filter.isActive = false;

      const [items, total] = await Promise.all([
        Student.find(filter).sort(sort).skip(skip).limit(limit).populate(STUDENT_POPULATE),
        Student.countDocuments(filter),
      ]);
      sendSuccess(res, paged(items, page, limit, total));
    } catch (error) {
      next(error);
    }
  },

  detail: async (req, res, next) => {
    try {
      const student = await Student.findById(req.params.id).populate(STUDENT_POPULATE);
      if (!student) throw new ApiError(404, 'Student not found');
      sendSuccess(res, student);
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const { password, ...profile } = req.body;
      await assertEmailFree(profile.email);

      const user = await User.create({
        name: profile.name,
        email: profile.email,
        password,
        role: 'student',
      });

      try {
        const student = await Student.create({ ...profile, user: user._id });
        await User.updateOne({ _id: user._id }, { student: student._id });
        const populated = await Student.findById(student._id).populate(STUDENT_POPULATE);
        sendSuccess(res, populated, 'Student created successfully', 201);
      } catch (error) {
        await User.deleteOne({ _id: user._id }); // no orphan accounts
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const { password, email, ...fields } = req.body;
      const student = await Student.findById(req.params.id);
      if (!student) throw new ApiError(404, 'Student not found');

      const user = await User.findById(student.user);
      if (!user) throw new ApiError(404, 'Linked user account not found');

      if (email && email !== user.email) {
        await assertEmailFree(email, user._id);
        user.email = email;
      }
      user.name = fields.name || user.name;
      if (password) user.password = password;
      if (typeof req.body.isActive === 'boolean') user.isActive = req.body.isActive;

      Object.assign(student, fields);
      if (email) student.email = email;

      await Promise.all([student.save(), user.save()]);
      const populated = await Student.findById(student._id).populate(STUDENT_POPULATE);
      sendSuccess(res, populated, 'Student updated successfully');
    } catch (error) {
      next(error);
    }
  },

  // Soft delete: keeps attendance history intact
  remove: async (req, res, next) => {
    try {
      const student = await Student.findById(req.params.id);
      if (!student) throw new ApiError(404, 'Student not found');

      student.isActive = false;
      await student.save();
      await User.updateOne({ _id: student.user }, { isActive: false });

      sendSuccess(res, { id: student._id }, 'Student deactivated successfully');
    } catch (error) {
      next(error);
    }
  },

  // Reactivate a deactivated student
  restore: async (req, res, next) => {
    try {
      const student = await Student.findById(req.params.id);
      if (!student) throw new ApiError(404, 'Student not found');

      student.isActive = true;
      await student.save();
      await User.updateOne({ _id: student.user }, { isActive: true });

      sendSuccess(res, { id: student._id }, 'Student reactivated successfully');
    } catch (error) {
      next(error);
    }
  },
};

// =====================================================
//  TEACHERS  (User account + Teacher profile)
// =====================================================
export const teacherController = {
  list: async (req, res, next) => {
    try {
      const { page, limit, skip, search, sort } = getPagination(req);
      const filter = {
        ...buildSearchFilter(search, ['name', 'employeeId', 'email']),
      };
      if (req.query.department) filter.department = req.query.department;
      if (req.query.status === 'active') filter.isActive = true;
      if (req.query.status === 'inactive') filter.isActive = false;

      const [items, total] = await Promise.all([
        Teacher.find(filter).sort(sort).skip(skip).limit(limit).populate(TEACHER_POPULATE),
        Teacher.countDocuments(filter),
      ]);
      sendSuccess(res, paged(items, page, limit, total));
    } catch (error) {
      next(error);
    }
  },

  detail: async (req, res, next) => {
    try {
      const teacher = await Teacher.findById(req.params.id).populate(TEACHER_POPULATE);
      if (!teacher) throw new ApiError(404, 'Teacher not found');
      sendSuccess(res, teacher);
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const { password, ...profile } = req.body;
      await assertEmailFree(profile.email);

      const user = await User.create({
        name: profile.name,
        email: profile.email,
        password,
        role: 'teacher',
      });

      try {
        const teacher = await Teacher.create({ ...profile, user: user._id });
        await User.updateOne({ _id: user._id }, { teacher: teacher._id });
        const populated = await Teacher.findById(teacher._id).populate(TEACHER_POPULATE);
        sendSuccess(res, populated, 'Teacher created successfully', 201);
      } catch (error) {
        await User.deleteOne({ _id: user._id });
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const { password, email, ...fields } = req.body;
      const teacher = await Teacher.findById(req.params.id);
      if (!teacher) throw new ApiError(404, 'Teacher not found');

      const user = await User.findById(teacher.user);
      if (!user) throw new ApiError(404, 'Linked user account not found');

      if (email && email !== user.email) {
        await assertEmailFree(email, user._id);
        user.email = email;
      }
      user.name = fields.name || user.name;
      if (password) user.password = password;
      if (typeof req.body.isActive === 'boolean') user.isActive = req.body.isActive;

      Object.assign(teacher, fields);
      if (email) teacher.email = email;
      if (fields.department === null) teacher.department = null;

      await Promise.all([teacher.save(), user.save()]);
      const populated = await Teacher.findById(teacher._id).populate(TEACHER_POPULATE);
      sendSuccess(res, populated, 'Teacher updated successfully');
    } catch (error) {
      next(error);
    }
  },

  remove: async (req, res, next) => {
    try {
      const teacher = await Teacher.findById(req.params.id);
      if (!teacher) throw new ApiError(404, 'Teacher not found');

      teacher.isActive = false;
      await teacher.save();
      await User.updateOne({ _id: teacher.user }, { isActive: false });

      sendSuccess(res, { id: teacher._id }, 'Teacher deactivated successfully');
    } catch (error) {
      next(error);
    }
  },

  restore: async (req, res, next) => {
    try {
      const teacher = await Teacher.findById(req.params.id);
      if (!teacher) throw new ApiError(404, 'Teacher not found');

      teacher.isActive = true;
      await teacher.save();
      await User.updateOne({ _id: teacher.user }, { isActive: true });

      sendSuccess(res, { id: teacher._id }, 'Teacher reactivated successfully');
    } catch (error) {
      next(error);
    }
  },
};
