/** Minimum attendance required from students (instructions: default 75%). */
export const DEFAULT_ATTENDANCE_THRESHOLD = 75;

/** Percentage formula: (present / conducted) x 100, rounded. */
export const attendancePercentage = (present, total) =>
  total ? Math.round((present / total) * 100) : 0;
