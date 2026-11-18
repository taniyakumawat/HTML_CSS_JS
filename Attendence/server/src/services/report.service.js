import mongoose from 'mongoose';
import { ApiError } from '../middleware/error.js';
import { attendancePercentage } from '../utils/constants.js';
import { idOf, resolveTeacher, assertClassAccess } from '../utils/classAccess.js';
import { escapeRegex } from '../utils/pagination.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import Teacher from '../models/Teacher.js';
import Attendance from '../models/Attendance.js';

export const REPORT_TYPES = ['sessions', 'students', 'subjects', 'classes'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse ?from / ?to (YYYY-MM-DD, inclusive) into a Mongo date range. */
const parseRange = (query) => {
  const { from, to } = query;
  if (from !== undefined && !DATE_RE.test(String(from))) {
    throw new ApiError(400, 'from must be YYYY-MM-DD.');
  }
  if (to !== undefined && !DATE_RE.test(String(to))) {
    throw new ApiError(400, 'to must be YYYY-MM-DD.');
  }
  if (!from && !to) return null;
  const range = {};
  if (from) {
    const [y, m, d] = from.split('-').map(Number);
    range.$gte = new Date(y, m - 1, d);
  }
  if (to) {
    const [y, m, d] = to.split('-').map(Number);
    range.$lt = new Date(y, m - 1, d + 1); // inclusive end-of-day
  }
  return range;
};

/**
 * Resolve role scope + filters into a common query context.
 * - admin: full access (optional class/subject/semester filters)
 * - teacher: ALWAYS limited to assigned classes/subjects (403 on foreign class)
 */
export const resolveReportContext = async (req, query = {}) => {
  const type = String(query.type || 'sessions');
  if (!REPORT_TYPES.includes(type)) {
    throw new ApiError(400, `type must be one of: ${REPORT_TYPES.join(', ')}.`);
  }
  if (query.subject && !mongoose.isValidObjectId(query.subject)) {
    throw new ApiError(400, 'Invalid subject filter.');
  }
  if (query.class && !mongoose.isValidObjectId(query.class)) {
    throw new ApiError(400, 'Invalid class filter.');
  }
  if (query.semester && !mongoose.isValidObjectId(query.semester)) {
    throw new ApiError(400, 'Invalid semester filter.');
  }

  const ctx = { type, subject: query.subject || null, range: parseRange(query), teacherId: null };

  // ---- class scope ----
  if (query.class) {
    if (req.user.role === 'teacher') {
      await assertClassAccess(req, query.class); // 403 for foreign classes
      ctx.classIds = [query.class];
    } else {
      ctx.classIds = [query.class];
    }
  } else if (req.user.role === 'teacher') {
    const teacher = await resolveTeacher(req);
    ctx.teacherId = teacher._id;
    const mine = await Class.find({
      $or: [{ classTeacher: teacher._id }, { 'teachingAssignments.teacher': teacher._id }],
    }).select('_id teachingAssignments');
    ctx.classIds = mine.map((c) => c._id);
    ctx.myClasses = mine;
    // subject filter must be one of MY assigned subjects
    if (ctx.subject) {
      const mineSubjectIds = mine.flatMap((c) =>
        (c.teachingAssignments || [])
          .filter((a) => idOf(a.teacher) === idOf(teacher._id))
          .map((a) => idOf(a.subject))
      );
      if (!mineSubjectIds.includes(ctx.subject)) {
        throw new ApiError(403, 'You do not teach that subject.');
      }
    }
  } else {
    ctx.classIds = null; // admin: all classes
  }

  // ---- semester filter narrows the class set ----
  if (query.semester) {
    const semClasses = await Class.find({ semester: query.semester }).select('_id');
    const semIds = semClasses.map((c) => c._id);
    if (ctx.classIds === null) ctx.classIds = semIds;
    else ctx.classIds = ctx.classIds.filter((id) => semIds.some((s) => idOf(s) === idOf(id)));
  }

  return ctx;
};

/** Base Attendance match for sessions/trend from a report context. */
const attendanceMatch = (ctx, query = {}) => {
  const match = {};
  if (ctx.classIds) match.class = { $in: ctx.classIds };
  if (ctx.subject) match.subject = ctx.subject;
  if (ctx.range) match.date = ctx.range;
  return match;
};

/** status totals from an aggregation [{_id: status, count}] */
const totalsFromGroups = (groups) => {
  const by = Object.fromEntries(groups.map((g) => [g._id, g.count]));
  const present = by.present || 0;
  const late = by.late || 0;
  const absent = by.absent || 0;
  const leave = by.leave || 0;
  const total = present + late + absent + leave;
  return { present, late, absent, leave, total, percentage: attendancePercentage(present, total) };
};

/** Whitelist a sort string per type; returns a Mongo sort object. */
const safeSort = (raw, allowed, fallback) => {
  const sort = {};
  for (const part of String(raw || '').split(',')) {
    if (!part) continue;
    const dir = part.startsWith('-') ? -1 : 1;
    const key = part.startsWith('-') ? part.slice(1) : part;
    if (allowed[key]) sort[allowed[key]] = dir;
  }
  return Object.keys(sort).length ? sort : fallback;
};

const SORT_DEFAULT = {
  sessions: { date: -1, periodNumber: 1 },
  students: { 's.rollNumber': 1 },
};
const SORT_ALLOWED = {
  sessions: { date: 'date', periodNumber: 'periodNumber', createdAt: 'createdAt' },
  students: {
    name: 's.name',
    rollNumber: 's.rollNumber',
    percentage: 'percentage',
    present: 'present',
    late: 'late',
    absent: 'absent',
    total: 'total',
  },
};

/**
 * MAIN ENTRY: build a paginated report of the given type.
 * Returns { type, items, page, limit, total, totalPages, summary, filters }.
 * The summary always covers ALL matching rows (not just the current page),
 * so screen / PDF / Excel always agree.
 */
export const buildReport = async (req, query, { page, limit, maxLimit = 100 } = {}) => {
  const ctx = await resolveReportContext(req, query);
  const search = String(query.search || '').trim();
  const pageNum = Math.max(1, page || 1);
  const limitN = Math.min(maxLimit, Math.max(1, limit || 10));

  if (ctx.type === 'sessions') return sessionsReport(ctx, query, search, pageNum, limitN);
  if (ctx.type === 'students') return studentsReport(ctx, query, search, pageNum, limitN);
  if (ctx.type === 'subjects') return groupedReport(ctx, 'subject', search, query, pageNum, limitN);
  return groupedReport(ctx, 'class', search, query, pageNum, limitN);
};

/** type=sessions - row per marked class session with per-status counts. */
const sessionsReport = async (ctx, query, search, page, limit) => {
  const filter = attendanceMatch(ctx);

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const [subjIds, clsIds, tchIds] = await Promise.all([
      Subject.find({ $or: [{ name: rx }, { code: rx }] }).select('_id'),
      Class.find({ name: rx }).select('_id'),
      Teacher.find({ name: rx }).select('_id'),
    ]);
    const or = [
      subjIds.length && { subject: { $in: subjIds.map((d) => d._id) } },
      clsIds.length && { class: { $in: clsIds.map((d) => d._id) } },
      tchIds.length && { teacher: { $in: tchIds.map((d) => d._id) } },
    ].filter(Boolean);
    if (!or.length) {
      return { type: 'sessions', items: [], page, limit, total: 0, totalPages: 1, summary: emptySummary(0) };
    }
    filter.$or = or;
  }

  const sort = safeSort(query.sort, SORT_ALLOWED.sessions, SORT_DEFAULT.sessions);
  const [total, docs, statusGroups] = await Promise.all([
    Attendance.countDocuments(filter),
    Attendance.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate([
        { path: 'class', select: 'name section' },
        { path: 'subject', select: 'name code' },
        { path: 'teacher', select: 'name employeeId' },
      ]),
    Attendance.aggregate([
      ...(Object.keys(filter).length ? [{ $match: filter }] : []),
      { $unwind: '$records' },
      { $group: { _id: '$records.status', count: { $sum: 1 } } },
    ]),
  ]);
  const summary = { ...totalsFromGroups(statusGroups), rows: total };

  const items = docs.map((doc) => {
    const counts = countStatuses(doc.records);
    return {
      _id: doc._id,
      date: doc.date,
      periodNumber: doc.periodNumber,
      className: doc.class ? `${doc.class.name}${doc.class.section ? ' - ' + doc.class.section : ''}` : '—',
      subjectName: doc.subject?.name || '—',
      subjectCode: doc.subject?.code || '',
      teacherName: doc.teacher?.name || '—',
      ...counts,
      percentage: attendancePercentage(counts.present, counts.total),
    };
  });

  return {
    type: 'sessions',
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary,
  };
};

const emptySummary = (rows) => ({
  rows,
  present: 0,
  late: 0,
  absent: 0,
  leave: 0,
  total: 0,
  percentage: 0,
});

/** Per-student status counts inside one records array. */
const countStatuses = (records) => {
  const counts = { present: 0, late: 0, absent: 0, leave: 0, total: records.length };
  for (const r of records) if (counts[r.status] !== undefined) counts[r.status] += 1;
  return counts;
};

/** type=students - one row per student with attendance in range (student-wise report). */
const studentsReport = async (ctx, query, search, page, limit) => {
  const match = attendanceMatch(ctx);
  const base = Object.keys(match).length ? [{ $match: match }] : [];
  const rx = new RegExp(escapeRegex(search), 'i');

  const pipeline = [
    ...base,
    { $unwind: '$records' },
    {
      $group: {
        _id: '$records.student',
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$records.status', 'late'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
        leave: { $sum: { $cond: [{ $eq: ['$records.status', 'leave'] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
    { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 's' } },
    { $unwind: '$s' },
    { $match: { 's.isActive': true, ...(search ? { $or: [{ 's.name': rx }, { 's.rollNumber': rx }] } : {}) } },
    {
      $addFields: {
        percentage: { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 0] },
      },
    },
    { $sort: safeSort(query.sort, SORT_ALLOWED.students, SORT_DEFAULT.students) },
    {
      $facet: {
        items: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              rollNumber: '$s.rollNumber',
              name: '$s.name',
              classRef: '$s.class',
              present: 1,
              late: 1,
              absent: 1,
              leave: 1,
              total: 1,
              percentage: 1,
            },
          },
        ],
        summary: [
          {
            $group: {
              _id: null,
              rows: { $sum: 1 },
              present: { $sum: '$present' },
              late: { $sum: '$late' },
              absent: { $sum: '$absent' },
              leave: { $sum: '$leave' },
              total: { $sum: '$total' },
            },
          },
        ],
      },
    },
  ];

  const [result] = await Attendance.aggregate(pipeline);
  const summaryRaw = result.summary[0] || null;
  const summary = summaryRaw
    ? {
        rows: summaryRaw.rows,
        present: summaryRaw.present,
        late: summaryRaw.late,
        absent: summaryRaw.absent,
        leave: summaryRaw.leave,
        total: summaryRaw.total,
        percentage: attendancePercentage(summaryRaw.present, summaryRaw.total),
      }
    : emptySummary(0);

  // resolve class names for the current page
  const classIds = [...new Set(result.items.map((i) => idOf(i.classRef)).filter(Boolean))];
  const classDocs = classIds.length ? await Class.find({ _id: { $in: classIds } }).select('name section') : [];
  const classMap = Object.fromEntries(classDocs.map((c) => [idOf(c), c]));

  const items = result.items.map((row) => {
    const c = classMap[idOf(row.classRef)];
    return {
      _id: row._id,
      rollNumber: row.rollNumber,
      name: row.name,
      className: c ? `${c.name}${c.section ? ' - ' + c.section : ''}` : '—',
      present: row.present,
      late: row.late,
      absent: row.absent,
      leave: row.leave,
      total: row.total,
      percentage: row.percentage,
    };
  });

  const total = summary.rows;
  return {
    type: 'students',
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary,
  };
};

/** type=subjects / type=classes - grouped rows (small bounded sets -> JS paging). */
const groupedReport = async (ctx, groupBy, search, query, page, limit) => {
  const match = attendanceMatch(ctx);
  const field = groupBy === 'subject' ? '$subject' : '$class';
  const groups = await Attendance.aggregate([
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    {
      $group: {
        _id: field,
        sessions: { $sum: 1 },
        present: { $sum: { $size: { $filter: { input: '$records', as: 'r', cond: { $eq: ['$$r.status', 'present'] } } } } },
        late: { $sum: { $size: { $filter: { input: '$records', as: 'r', cond: { $eq: ['$$r.status', 'late'] } } } } },
        absent: { $sum: { $size: { $filter: { input: '$records', as: 'r', cond: { $eq: ['$$r.status', 'absent'] } } } } },
        leave: { $sum: { $size: { $filter: { input: '$records', as: 'r', cond: { $eq: ['$$r.status', 'leave'] } } } } },
        total: { $sum: { $size: '$records' } },
      },
    },
  ]);

  // attach display names
  const ids = groups.map((g) => g._id).filter(Boolean);
  const docs = ids.length
    ? await (groupBy === 'subject' ? Subject : Class).find({ _id: { $in: ids } }).select('name code section')
    : [];
  const docMap = Object.fromEntries(docs.map((d) => [idOf(d), d]));

  let rows = groups.map((g) => {
    const d = docMap[idOf(g._id)];
    return {
      _id: g._id,
      name: d?.name || '—',
      code: d?.code || (groupBy === 'class' && d?.section ? `Sec ${d.section}` : ''),
      sessions: g.sessions,
      present: g.present,
      late: g.late,
      absent: g.absent,
      leave: g.leave,
      total: g.total,
      percentage: attendancePercentage(g.present, g.total),
    };
  });

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    rows = rows.filter((r) => rx.test(r.name) || rx.test(r.code));
  }

  // sort
  const sortSpec = String(query.sort || '').split(',').filter(Boolean);
  if (sortSpec.length) {
    rows.sort((a, b) => {
      for (const part of sortSpec) {
        const dir = part.startsWith('-') ? -1 : 1;
        const key = part.startsWith('-') ? part.slice(1) : part;
        const av = a[key];
        const bv = b[key];
        if (av === bv) continue;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      }
      return 0;
    });
  } else {
    rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  const total = rows.length;
  const pageRows = rows.slice((page - 1) * limit, (page - 1) * limit + limit);
  const summary = {
    rows: total,
    present: rows.reduce((s, r) => s + r.present, 0),
    late: rows.reduce((s, r) => s + r.late, 0),
    absent: rows.reduce((s, r) => s + r.absent, 0),
    leave: rows.reduce((s, r) => s + r.leave, 0),
    total: rows.reduce((s, r) => s + r.total, 0),
  };
  summary.percentage = attendancePercentage(summary.present, summary.total);

  return {
    type: groupBy === 'subject' ? 'subjects' : 'classes',
    items: pageRows,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary,
  };
};

/**
 * GET trend - daily percentages for charts (defaults to the last 90 days).
 * Grouping happens in JS so dates stay in server-local time (same rule as
 * Attendance.date normalization).
 */
export const buildTrend = async (req, query) => {
  const ctx = await resolveReportContext(req, { ...query, type: 'sessions' });
  const match = attendanceMatch(ctx);
  if (!match.date) {
    const from = new Date();
    from.setDate(from.getDate() - 89);
    from.setHours(0, 0, 0, 0);
    match.date = { $gte: from };
  }

  const docs = await Attendance.aggregate([
    { $match: match },
    {
      $project: {
        date: 1,
        present: { $size: { $filter: { input: '$records', as: 'r', cond: { $eq: ['$$r.status', 'present'] } } } },
        total: { $size: '$records' },
      },
    },
  ]);

  const byDay = {};
  for (const d of docs) {
    const dt = new Date(d.date);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    byDay[key] = byDay[key] || { date: key, present: 0, total: 0 };
    byDay[key].present += d.present;
    byDay[key].total += d.total;
  }
  const points = Object.values(byDay)
    .map((p) => ({ ...p, percentage: attendancePercentage(p.present, p.total) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return points;
};

/** Class list for report filter dropdowns (admin: all, teacher: mine). */
export const reportFilterOptions = async (req) => {
  const opts = {};
  if (req.user.role === 'teacher') {
    const teacher = await resolveTeacher(req);
    const classes = await Class.find({
      $or: [{ classTeacher: teacher._id }, { 'teachingAssignments.teacher': teacher._id }],
    })
      .sort({ name: 1 })
      .populate({ path: 'teachingAssignments.subject', select: 'name code' });
    const subjectMap = {};
    for (const c of classes) {
      for (const a of c.teachingAssignments || []) {
        if (idOf(a.teacher) !== idOf(teacher._id)) continue;
        subjectMap[idOf(a.subject)] = a.subject;
      }
    }
    opts.classes = classes.map((c) => ({ _id: c._id, name: c.name, section: c.section }));
    opts.subjects = Object.values(subjectMap).sort((a, b) => String(a?.name).localeCompare(String(b?.name)));
  } else {
    const [classes, subjects] = await Promise.all([
      Class.find({}).sort({ name: 1 }).select('name section'),
      Subject.find({}).sort({ name: 1 }).select('name code'),
    ]);
    opts.classes = classes.map((c) => ({ _id: c._id, name: c.name, section: c.section }));
    opts.subjects = subjects;
  }
  return opts;
};
