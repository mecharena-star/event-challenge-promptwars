"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="empty" role="alert">
      <h1>Something went wrong</h1>
      <p>The page hit an unexpected problem. Your details were not saved or sent anywhere.</p>
      <button type="button" className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
