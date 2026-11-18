import AssignmentsEditor from '../../components/admin/AssignmentsEditor.jsx';

/** 2026-2027 style year based on today's date. */
export const currentAcademicYear = () => {
  const y = new Date().getFullYear();
  const month = new Date().getMonth(); // 0=Jan
  const start = month >= 6 ? y : y - 1; // academic year starts in July
  return `${start}-${start + 1}`;
};

const date = (v) => (v ? new Date(v).toLocaleDateString() : '—');
const truncate = (v, n = 48) => (!v ? '—' : v.length > n ? `${v.slice(0, n)}…` : v);

// =====================================================
//  DEPARTMENTS
// =====================================================
export const departmentConfig = {
  endpoint: '/admin/departments',
  title: 'Departments',
  subtitle: 'Manage BCA, BBA, BCom and other departments',
  singular: 'Department',
  searchPlaceholder: 'Search name or code...',
  titleKey: 'name',
  sort: 'name',
  initialValues: { name: '', code: '', head: '', description: '' },
  fields: [
    { name: 'name', label: 'Department name', type: 'text', required: true, placeholder: 'e.g. BCA' },
    { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. BCA' },
    {
      name: 'head',
      label: 'Head of department',
      type: 'ref',
      ref: '/admin/teachers',
      refLabel: (t) => `${t.name} (${t.employeeId})`,
      placeholder: 'Optional',
    },
    { name: 'description', label: 'Description', type: 'textarea', className: 'sm:col-span-2' },
  ],
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'head', label: 'Head', render: (r) => (r.head ? r.head.name : '—') },
    { key: 'description', label: 'Description', render: (r) => truncate(r.description) },
    { key: 'createdAt', label: 'Created', render: (r) => date(r.createdAt) },
  ],
};

// =====================================================
//  COURSES
// =====================================================
export const courseConfig = {
  endpoint: '/admin/courses',
  title: 'Courses',
  subtitle: 'Degree / diploma programs offered by each department',
  singular: 'Course',
  searchPlaceholder: 'Search name or code...',
  titleKey: 'name',
  sort: 'name',
  initialValues: {
    name: '',
    code: '',
    department: '',
    durationYears: '3',
    totalSemesters: '6',
    description: '',
  },
  fields: [
    { name: 'name', label: 'Course name', type: 'text', required: true, placeholder: 'e.g. Bachelor of Computer Applications' },
    { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. BCA' },
    {
      name: 'department',
      label: 'Department',
      type: 'ref',
      ref: '/admin/departments',
      refLabel: (d) => `${d.name} (${d.code})`,
      required: true,
    },
    { name: 'durationYears', label: 'Duration (years)', type: 'number', required: true },
    { name: 'totalSemesters', label: 'Total semesters', type: 'number', required: true },
    { name: 'description', label: 'Description', type: 'textarea', className: 'sm:col-span-2' },
  ],
  columns: [
    { key: 'name', label: 'Course' },
    { key: 'code', label: 'Code' },
    { key: 'department', label: 'Department', render: (r) => r.department?.name || '—' },
    { key: 'durationYears', label: 'Duration', render: (r) => `${r.durationYears} yr` },
    { key: 'totalSemesters', label: 'Semesters', render: (r) => r.totalSemesters },
    { key: 'createdAt', label: 'Created', render: (r) => date(r.createdAt) },
  ],
};

// =====================================================
//  SEMESTERS
// =====================================================
export const semesterConfig = {
  endpoint: '/admin/semesters',
  title: 'Semesters',
  subtitle: 'Years and semesters of every course',
  singular: 'Semester',
  searchPlaceholder: 'Search semester name...',
  titleKey: 'name',
  sort: 'name',
  initialValues: { course: '', number: '1', year: '1', name: '', startDate: '', endDate: '' },
  fields: [
    {
      name: 'course',
      label: 'Course',
      type: 'ref',
      ref: '/admin/courses',
      refLabel: (c) => `${c.name} (${c.code})`,
      required: true,
    },
    { name: 'number', label: 'Semester number', type: 'number', required: true, placeholder: '1' },
    { name: 'year', label: 'Year', type: 'number', required: true, placeholder: '1' },
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Semester 1' },
    { name: 'startDate', label: 'Start date', type: 'date' },
    { name: 'endDate', label: 'End date', type: 'date' },
  ],
  columns: [
    { key: 'name', label: 'Semester' },
    { key: 'course', label: 'Course', render: (r) => r.course?.name || '—' },
    { key: 'number', label: 'No.' },
    { key: 'year', label: 'Year' },
    {
      key: 'startDate',
      label: 'Period',
      render: (r) => (r.startDate || r.endDate ? `${date(r.startDate)} → ${date(r.endDate)}` : '—'),
    },
  ],
};

// =====================================================
//  SUBJECTS
// =====================================================
export const subjectConfig = {
  endpoint: '/admin/subjects',
  title: 'Subjects',
  subtitle: 'Subjects offered in each course & semester',
  singular: 'Subject',
  searchPlaceholder: 'Search name or code...',
  titleKey: 'name',
  sort: 'name',
  initialValues: {
    name: '',
    code: '',
    course: '',
    semester: '',
    credits: '4',
    type: 'theory',
    description: '',
  },
  fields: [
    { name: 'name', label: 'Subject name', type: 'text', required: true, placeholder: 'e.g. Data Structures' },
    { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. BCA-101' },
    {
      name: 'course',
      label: 'Course',
      type: 'ref',
      ref: '/admin/courses',
      refLabel: (c) => `${c.name} (${c.code})`,
      required: true,
    },
    {
      name: 'semester',
      label: 'Semester',
      type: 'ref',
      ref: '/admin/semesters',
      refLabel: (s) => `${s.name} (Year ${s.year})`,
      dependsOn: 'course',
      parentLabel: 'a course',
      required: true,
    },
    { name: 'credits', label: 'Credits', type: 'number' },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'theory', label: 'Theory' },
        { value: 'practical', label: 'Practical' },
        { value: 'elective', label: 'Elective' },
      ],
    },
    { name: 'description', label: 'Description', type: 'textarea', className: 'sm:col-span-2' },
  ],
  columns: [
    { key: 'name', label: 'Subject' },
    { key: 'code', label: 'Code' },
    { key: 'course', label: 'Course', render: (r) => r.course?.code || '—' },
    { key: 'semester', label: 'Semester', render: (r) => r.semester?.name || '—' },
    { key: 'credits', label: 'Credits' },
    {
      key: 'type',
      label: 'Type',
      render: (r) => (
        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium capitalize text-purple-700">
          {r.type}
        </span>
      ),
    },
  ],
};

// =====================================================
//  CLASSES  (sections + teacher↔subject assignments)
// =====================================================
export const classConfig = {
  endpoint: '/admin/classes',
  title: 'Classes',
  subtitle: 'Sections, class teachers and teaching assignments',
  singular: 'Class',
  searchPlaceholder: 'Search class name...',
  titleKey: 'name',
  sort: 'name',
  initialValues: {
    name: '',
    course: '',
    semester: '',
    section: 'A',
    academicYear: currentAcademicYear(),
    classTeacher: '',
    room: '',
    teachingAssignments: [],
  },
  fields: [
    { name: 'name', label: 'Class name', type: 'text', required: true, placeholder: 'e.g. BCA-1-A' },
    {
      name: 'course',
      label: 'Course',
      type: 'ref',
      ref: '/admin/courses',
      refLabel: (c) => `${c.name} (${c.code})`,
      required: true,
    },
    {
      name: 'semester',
      label: 'Semester',
      type: 'ref',
      ref: '/admin/semesters',
      refLabel: (s) => `${s.name} (Year ${s.year})`,
      dependsOn: 'course',
      parentLabel: 'a course',
      required: true,
    },
    { name: 'section', label: 'Section', type: 'text', placeholder: 'A' },
    {
      name: 'academicYear',
      label: 'Academic year',
      type: 'text',
      required: true,
      placeholder: '2026-2027',
      hint: 'Format: 2026-2027',
    },
    {
      name: 'classTeacher',
      label: 'Class teacher',
      type: 'ref',
      ref: '/admin/teachers',
      refLabel: (t) => `${t.name} (${t.employeeId})`,
      placeholder: 'Optional',
    },
    { name: 'room', label: 'Room', type: 'text', placeholder: 'Optional' },
    { name: 'teachingAssignments', label: 'Teaching assignments', type: 'custom', Component: AssignmentsEditor },
  ],
  transformToForm: (row) => ({
    teachingAssignments: (row.teachingAssignments || []).map((a) => ({
      subject: a.subject?._id || a.subject,
      teacher: a.teacher?._id || a.teacher,
    })),
  }),
  columns: [
    { key: 'name', label: 'Class' },
    { key: 'course', label: 'Course', render: (r) => r.course?.code || '—' },
    { key: 'semester', label: 'Semester', render: (r) => r.semester?.name || '—' },
    { key: 'section', label: 'Section' },
    { key: 'academicYear', label: 'Year' },
    { key: 'classTeacher', label: 'Class teacher', render: (r) => r.classTeacher?.name || '—' },
    {
      key: 'teachingAssignments',
      label: 'Subjects assigned',
      render: (r) => (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {r.teachingAssignments?.length || 0}
        </span>
      ),
    },
  ],
};
