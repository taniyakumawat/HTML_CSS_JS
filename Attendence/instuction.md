# Project: Smart College Attendance Management System

Act as a Senior Full-Stack Web Developer, UI/UX Designer and Software Architect.

I want to build a modern, professional and fully functional **College Class Attendance Management System** for my college.

The website should help college administrators, teachers and students manage daily class attendance digitally instead of maintaining attendance registers manually.

## 1. Technology Stack

Use the MERN Stack:

- Frontend: React.js
- Backend: Node.js + Express.js
- Database: MongoDB
- Authentication: JWT (JSON Web Token)
- Styling: Tailwind CSS
- Icons: Lucide React
- Charts: Recharts
- API: REST API

Use a clean, scalable and well-organized folder structure.

## 2. User Roles and Authentication

The website must have three different user roles:

### A. Admin

Admin has complete control over the system.

Features:

- Admin login.
- Add, edit and delete students.
- Add, edit and delete teachers.
- Create courses and subjects.
- Manage BCA, BBA, BCom and other departments.
- Manage different years and semesters.
- Assign teachers to subjects and classes.
- Create and manage class timetables.
- View attendance of all students.
- View teacher-wise attendance records.
- Generate attendance reports.
- Manage user accounts.

### B. Teacher

Teachers can manage attendance for their assigned classes.

Features:

- Secure teacher login.
- Teacher dashboard.
- View assigned subjects and classes.
- View daily timetable.
- Select class, subject, semester and date.
- Display complete student list.
- Mark students as Present, Absent or Late.
- Mark attendance for the entire class.
- Edit attendance with proper authorization.
- View previous attendance records.
- View subject-wise attendance percentage.
- Download attendance reports in PDF or Excel.
- View total classes conducted.

Important: Teachers should only be able to manage attendance for their assigned subjects and classes.

### C. Student

Students can only view their own attendance.

Features:

- Student login.
- Personalized student dashboard.
- View total attendance percentage.
- View subject-wise attendance.
- View Present, Absent and Late records.
- View daily attendance history.
- View monthly attendance report.
- View attendance calendar.
- Check attendance shortage.
- View timetable.
- Download personal attendance report in PDF.

Students must not be allowed to mark or edit their own attendance.

## 3. Attendance Management System

This is the most important module.

Create a professional attendance marking interface.

Attendance statuses:

- Present
- Absent
- Late
- Leave (optional, subject to approval)

Features:

- Date-wise attendance.
- Subject-wise attendance.
- Class-wise attendance.
- Semester-wise attendance.
- One-click Mark All Present.
- Individual attendance marking.
- Save attendance to MongoDB.
- Prevent duplicate attendance for the same class, subject and date.
- Allow authorized corrections with an audit history.

Attendance percentage formula:

Attendance Percentage = (Total Present Classes / Total Conducted Classes) × 100

Calculate attendance independently for each subject.

## 4. Dashboard Design

Create different dashboards for Admin, Teacher and Student.

Admin Dashboard:

- Total Students
- Total Teachers
- Total Classes
- Total Subjects
- Today's Attendance
- Overall Attendance Percentage
- Attendance Analytics Charts

Teacher Dashboard:

- Today's Classes
- Assigned Subjects
- Total Students
- Classes Conducted
- Recent Attendance Records

Student Dashboard:

- Overall Attendance Percentage
- Total Present
- Total Absent
- Total Classes
- Subject-wise Attendance
- Attendance Shortage Warning

## 5. Reports and Analytics

Create a dedicated Reports section.

Include:

- Daily attendance report.
- Weekly attendance report.
- Monthly attendance report.
- Semester attendance report.
- Student-wise attendance report.
- Subject-wise attendance report.
- Class-wise attendance report.
- Date range filtering.
- Search and sorting.
- Export to PDF.
- Export to Excel.

Use interactive charts and graphs to visualize attendance statistics.

## 6. UI/UX Design Requirements

Design a modern SaaS-style dashboard.

Design inspiration:

- Clean and professional college management dashboard.
- Modern sidebar navigation.
- White background with navy blue and purple accents.
- Rounded cards.
- Soft shadows.
- Beautiful charts.
- Professional typography.
- Consistent spacing.
- Responsive layouts.

Use:

- Sidebar navigation.
- Top navigation bar.
- Profile section.
- Notifications.
- Search functionality.
- Tables with pagination.
- Confirmation dialogs.
- Toast notifications.
- Loading states.
- Empty states.
- Error handling.

The website must be fully responsive and work properly on:

- Desktop
- Laptop
- Tablet
- Mobile phones

## 7. Security Requirements

- Secure JWT authentication.
- Password hashing using bcrypt.
- Role-based access control.
- Protected routes.
- Backend API authorization.
- Input validation.
- Secure environment variables.
- Prevent students from changing attendance.
- Prevent teachers from accessing unauthorized classes.
- Maintain attendance modification history.

## 8. Database Models

Create suitable MongoDB schemas for:

1. User
2. Student
3. Teacher
4. Department
5. Course
6. Subject
7. Semester
8. Class
9. Timetable
10. Attendance
11. LeaveRequest
12. Notification

Use proper MongoDB references and relationships.

## 9. Additional Features

Include these features wherever practical:

- Student ID / Roll Number search.
- Bulk student import through Excel.
- Attendance shortage alerts.
- Minimum attendance threshold setting (default 75%).
- Leave request and approval system.
- Notifications for attendance updates.
- Attendance history.
- Admin audit logs.
- Forgot password functionality.

## 10. Development Instructions

Build this project step by step.

Follow this development order:

Phase 1: Project setup and folder structure.

Phase 2: MongoDB connection and database schemas.

Phase 3: Authentication and role-based authorization.

Phase 4: Admin dashboard and management modules.

Phase 5: Teacher dashboard and attendance marking system.

Phase 6: Student dashboard and attendance viewing system.

Phase 7: Reports, analytics and PDF/Excel export.

Phase 8: Responsive design and UI improvements.

Phase 9: Testing, security and bug fixing.

Phase 10: Deployment.

IMPORTANT INSTRUCTIONS:

- Do not create just a static UI or frontend demo.
- Every major feature must work with the backend and MongoDB.
- Use real API integration.
- Do not use hardcoded attendance data in the final application.
- Use reusable React components.
- Write clean and maintainable code.
- Provide complete code for every file.
- Explain where each file should be created.
- Explain all installation commands.
- Never skip required configuration.
- Test the complete user workflow before moving to the next phase.

Start by creating the project architecture and Phase 1. Wait for my confirmation before proceeding to the next phase.
