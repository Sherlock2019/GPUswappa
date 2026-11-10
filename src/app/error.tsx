"use client";

/** Generic error boundary — shows no implementation details. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Đã có lỗi xảy ra / Something went wrong</h1>
      <p className="mt-2 text-slate-600">Vui lòng thử lại. / Please try again.</p>
      <button onClick={reset} className="btn-primary mt-6">Thử lại / Retry</button>
    </div>
  );
}
