const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

/**
 * Loading spinner. <Spinner /> or <Spinner size="lg" label="Loading..." />
 */
export default function Spinner({ size = 'md', label, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="status" aria-label="loading">
      <span
        className={`inline-block animate-spin rounded-full border-current border-r-transparent ${sizes[size]}`}
      />
      {label && <span className="text-sm text-slate-500">{label}</span>}
    </span>
  );
}
