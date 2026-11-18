import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
        <Compass size={30} />
      </span>
      <h1 className="mt-6 text-6xl font-extrabold text-navy-900">404</h1>
      <p className="mt-2 text-lg font-semibold text-slate-700">Page not found</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        The page you are looking for doesn’t exist or has been moved.
      </p>
      <Link to="/login" className="btn-primary mt-6">
        Back to login
      </Link>
    </div>
  );
}
