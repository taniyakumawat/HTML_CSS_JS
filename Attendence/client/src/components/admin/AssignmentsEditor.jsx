/**
 * Custom form field: assign a teacher to every subject of the selected course.
 * Used by the Class form (field type "custom").
 * Receives { form, setForm, refData } from ResourcePage.
 */
export default function AssignmentsEditor({ form, setForm, refData }) {
  const subjects = (refData['/admin/subjects'] || []).filter(
    (s) => !form.course || s.course === form.course
  );
  const teachers = refData['/admin/teachers'] || [];
  const assignments = form.teachingAssignments || [];

  const setTeacher = (subjectId, teacherId) => {
    setForm((prev) => {
      const list = [...(prev.teachingAssignments || [])];
      const index = list.findIndex((a) => a.subject === subjectId);
      if (!teacherId) {
        if (index >= 0) list.splice(index, 1);
      } else if (index >= 0) {
        list[index] = { ...list[index], teacher: teacherId };
      } else {
        list.push({ subject: subjectId, teacher: teacherId });
      }
      return { ...prev, teachingAssignments: list };
    });
  };

  return (
    <div className="sm:col-span-2">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        Teaching assignments <span className="font-normal text-slate-400">(teacher per subject)</span>
      </label>

      {!form.course ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          Select a course first to assign teachers to its subjects.
        </p>
      ) : subjects.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          No subjects found for this course yet. Create subjects first.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {subjects.map((s) => {
            const current = assignments.find((a) => a.subject === s._id)?.teacher || '';
            return (
              <div key={s._id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.code}</p>
                </div>
                <select
                  className="input !w-auto max-w-full !py-1.5 text-sm"
                  value={current}
                  onChange={(e) => setTeacher(s._id, e.target.value)}
                >
                  <option value="">Not assigned</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
