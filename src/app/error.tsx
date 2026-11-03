"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page stack">
      <h1>Niečo sa pokazilo</h1>
      <p>Something went wrong.</p>
      <button className="btn-primary" type="button" onClick={() => reset()}>
        Znova
      </button>
    </div>
  );
}
