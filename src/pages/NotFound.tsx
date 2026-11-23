import { Link } from "react-router-dom";

export const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
    <p className="text-sm font-semibold uppercase tracking-wider text-ink-400">404</p>
    <h1 className="mt-2 text-2xl font-semibold text-ink-900">This page could not be found</h1>
    <p className="mt-2 max-w-md text-sm text-ink-600">
      The address may be wrong, or the page may have moved into the admin console.
    </p>
    <Link to="/" className="btn-primary mt-6">
      Back to overview
    </Link>
  </div>
);
