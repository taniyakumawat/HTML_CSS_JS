/**
 * Central export for every Mongoose model.
 * Usage:  import { Student, Attendance } from '../models/index.js';
 */
export { default as User, USER_ROLES } from './User.js';
export { default as Student } from './Student.js';
export { default as Teacher } from './Teacher.js';
export { default as Department } from './Department.js';
export { default as Course } from './Course.js';
export { default as Subject } from './Subject.js';
export { default as Semester } from './Semester.js';
export { default as Class } from './Class.js';
export { default as Timetable, DAYS_OF_WEEK } from './Timetable.js';
export { default as Attendance, ATTENDANCE_STATUSES } from './Attendance.js';
export { default as LeaveRequest, LEAVE_TYPES, LEAVE_STATUS } from './LeaveRequest.js';
export { default as Notification, NOTIFICATION_TYPES } from './Notification.js';
