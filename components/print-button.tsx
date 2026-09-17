"use client";

export function PrintButton({ label = "Print the agenda" }: { label?: string }) {
  return (
    <button type="button" className="button button-secondary no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
