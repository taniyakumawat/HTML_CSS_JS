# Database models (Mongoose schemas) — Phase 2 ✅

All 12 schemas are implemented here. Import them from the barrel:

```js
import { Student, Attendance, Class } from '../models/index.js';
```

## Files

| File               | Model          | Key fields / rules                                              |
| ------------------ | -------------- | --------------------------------------------------------------- |
| `User.js`          | **User**       | email unique · bcrypt pre-save hash · `comparePassword()` · role `admin/teacher/student` · password hidden (`select:false`), stripped by `toJSON` · reset-token fields for forgot-password |
| `Student.js`       | **Student**    | rollNumber **unique** · N→1 User/Department/Course/Semester/Class · text index on name+rollNumber (ID search) |
| `Teacher.js`       | **Teacher**    | employeeId **unique** · N→1 User/Department                      |
| `Department.js`    | **Department** | name + code **unique** (BCA, BBA, BCom...) · optional head teacher |
| `Course.js`        | **Course**     | code **unique** · N→1 Department · durationYears/totalSemesters   |
| `Semester.js`      | **Semester**   | **unique (course + number)** · year · date range                  |
| `Subject.js`       | **Subject**    | code **unique** · N→1 Course + Semester · credits · type theory/practical/elective |
| `Class.js`         | **Class**      | name **unique** (BCA-1-A) · N→1 Course/Semester · classTeacher · `teachingAssignments: [{subject, teacher}]` ← authorization source for attendance |
| `Timetable.js`     | **Timetable**  | **unique (class + day + period)** · **unique (teacher + day + period)** (no double booking) · HH:mm times |
| `Attendance.js`    | **Attendance** | ★ **unique (class + subject + date)** — prevents duplicates · `records: [{student, status}]` with status `present/absent/late/leave` · `auditHistory[]` keeps every correction · `markedBy` user |
| `LeaveRequest.js`  | **LeaveRequest** | N→1 Student/Class · status `pending/approved/rejected` · date-order validation |
| `Notification.js`  | **Notification** | N→1 User recipient · type info/success/warning/error · `isRead` |

## Relationship map

```
Department 1 ── N Course 1 ── N Semester 1 ── N Subject
                     │                             │
                     └────────── N Class ──────────┘
                                  │  ├─ classTeacher ── Teacher
                                  │  └─ teachingAssignments [{subject, teacher}]
                                  │
Student N ── 1 User  ── 1 Teacher/Student profile (by role)
   │        N ── 1 Department / Course / Semester / Class
   │
   ├── N ── 1 Timetable (via Class) ── Subject, Teacher
   ├── 1 ── N Attendance.records ── Class + Subject + date (unique)
   └── 1 ── N LeaveRequest

User 1 ── N Notification (recipient)
User 1 ── N Attendance (markedBy) + auditHistory.changedBy
```

## Verification commands

```bash
npm run validate:models   # offline: 32 checks (no DB needed) ✅ passing
npm run smoke-test        # live: CRUD, unique indexes, hashing, populate
```
