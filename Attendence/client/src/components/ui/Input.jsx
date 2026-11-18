/**
 * Labeled form input.
 * <Input label="Email" type="email" name="email" required />
 */
export default function Input({ label, id, error, className = '', ...props }) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input id={inputId} className="input" aria-invalid={Boolean(error)} {...props} />
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
