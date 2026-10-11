import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50/40 via-white to-white p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-lg p-8 text-center space-y-4">
        <div className="size-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <span className="text-3xl">404</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Page not found</h2>
          <p className="text-sm text-slate-600">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
