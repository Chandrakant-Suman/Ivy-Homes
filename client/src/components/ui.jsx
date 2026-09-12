// Small reusable UI bits: loading / error / empty states and a pager.

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center py-20 text-slate-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 mr-3" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const msg = error?.response?.data?.error || error?.message || 'Something went wrong.';
  return (
    <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center my-10">
      <p className="font-medium text-red-700">Could not load this.</p>
      <p className="mt-1 text-sm text-red-600">{msg}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ label = 'Nothing to show.' }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 my-6">
      {label}
    </div>
  );
}

export function Pager({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50"
      >
        ← Prev
      </button>
      <span className="text-sm text-slate-600">
        Page {page} of {pages}
      </span>
      <button
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50"
      >
        Next →
      </button>
    </div>
  );
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
