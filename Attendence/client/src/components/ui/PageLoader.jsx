import Spinner from './Spinner.jsx';

/** Full-screen loading state (session check, route bootstrap). */
export default function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
