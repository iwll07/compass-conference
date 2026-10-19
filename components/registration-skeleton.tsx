export function RegistrationFormSkeleton() {
  return (
    <div
      className="reg-form-skeleton reg-skeleton-pulse"
      role="status"
      aria-busy="true"
      aria-label="Checking registration status…"
    >
      <span className="sr-only">Checking registration status…</span>

      {/* Fieldset 1: Personal information placeholder */}
      <div className="reg-skeleton-fieldset" aria-hidden="true">
        <div className="reg-skeleton-legend" style={{ width: "190px" }} />

        <div className="reg-skeleton-label" style={{ width: "72px" }} />
        <div className="reg-skeleton-input" />

        <div className="reg-skeleton-label" style={{ width: "48px" }} />
        <div className="reg-skeleton-input" />

        <div className="reg-skeleton-label" style={{ width: "56px" }} />
        <div className="reg-skeleton-input" />

        <div className="reg-skeleton-label" style={{ width: "84px" }} />
        <div className="reg-skeleton-input" />
      </div>

      {/* Fieldset 2: Academic information placeholder */}
      <div className="reg-skeleton-fieldset" aria-hidden="true">
        <div className="reg-skeleton-legend" style={{ width: "215px" }} />

        <div className="reg-skeleton-label" style={{ width: "76px" }} />
        <div className="reg-skeleton-input" />

        <div className="reg-skeleton-label" style={{ width: "98px" }} />
        <div className="reg-skeleton-input" />
      </div>

      {/* Submit button placeholder */}
      <div className="reg-skeleton-button" aria-hidden="true" />

      {/* Privacy disclaimer placeholder */}
      <div className="reg-skeleton-privacy" aria-hidden="true" />
    </div>
  );
}
