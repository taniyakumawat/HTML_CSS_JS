/** Labeled multi-line textarea. */
export default function TextArea({ label, error, rows = 3, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={props.name || props.id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea rows={rows} className="input resize-y" {...props} />
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
