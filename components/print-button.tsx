// Inert until the program is confirmed. The agenda currently renders its empty
// state ("The program is coming soon"), so printing it would emit a near-blank
// sheet, and there is nothing to download yet.
//
// Rendered as a dimmed, non-interactive <span aria-disabled> rather than a
// <button>: it is not focusable via Tab and is not exposed as a control to
// assistive tech, matching the "Registration soon" nav treatment. The visual
// styling reuses .button/.button-secondary so it still reads as a button.
//
// To restore once `schedule` in lib/content.ts has real sessions: put the
// <button> + window.print() (or a PDF link) back and drop the disabled class.
export function PrintButton({ label = "Download agenda" }: { label?: string }) {
  return (
    <span className="button button-secondary no-print print-button-disabled" aria-disabled="true">
      {label}
    </span>
  );
}
