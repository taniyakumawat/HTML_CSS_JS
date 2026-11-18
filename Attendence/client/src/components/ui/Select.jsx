/** Labeled <select> with options [{value,label}]. Pass placeholder={null} to hide the empty option. */
export default function Select({ label, options = [], placeholder = 'Select...', error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={props.name || props.id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select className="input" {...props}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
