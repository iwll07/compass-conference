"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export type RegistrationRecord = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  university: string;
  academic_year: string;
};

function formatCairoDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return (
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Cairo",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d) + " (Cairo)"
    );
  } catch {
    return iso;
  }
}

function getCairoDateStamp(): string {
  // en-CA produces YYYY-MM-DD format
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function AdminRegistrations() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadCount() {
      try {
        const { count: total, error: err } = await getSupabase()
          .from("registrations")
          .select("id", { count: "exact", head: true });
        if (!active) return;
        if (err) {
          setError(`Could not load registration count: ${err.message}`);
          setCount(null);
        } else {
          setCount(total ?? 0);
        }
      } catch (e: unknown) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load registrations");
        setCount(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCount();

    return () => {
      active = false;
    };
  }, []);

  async function exportToExcel() {
    if (exporting || count === null || count === 0) return;
    setExporting(true);
    setError(null);
    setNotice(null);

    try {
      // Re-verify the current exact count right before fetching
      const { count: latestCount, error: countErr } = await getSupabase()
        .from("registrations")
        .select("id", { count: "exact", head: true });

      if (countErr) throw countErr;
      const expectedCount = latestCount ?? 0;
      if (expectedCount === 0) {
        setCount(0);
        setNotice("No registrations to export.");
        setExporting(false);
        return;
      }

      // Fetch all rows in pages of 1000 (Supabase default max per request)
      const PAGE_SIZE = 1000;
      let allRows: RegistrationRecord[] = [];
      let from = 0;

      while (true) {
        const { data, error: fetchErr } = await getSupabase()
          .from("registrations")
          .select("id,created_at,full_name,email,phone,nationality,university,academic_year")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (fetchErr) throw fetchErr;
        if (!data || data.length === 0) break;
        allRows = allRows.concat(data as RegistrationRecord[]);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      // Refuse to export a partial file if counts do not match
      if (allRows.length !== expectedCount) {
        throw new Error(
          `Count mismatch: expected ${expectedCount} rows, but fetched ${allRows.length}. Export aborted to prevent partial file.`
        );
      }

      // Dynamic import: write-excel-file is loaded only on demand, never
      // bundled on public pages.
      const { default: writeXlsxFile } = await import("write-excel-file/browser");

      // Plain TEXT cells for everything. Values from registrants must never be
      // interpreted as formulas in Excel (prevents CSV/Excel formula injection).
      // Phone numbers retain their leading "+" because type is String.
      const headerRow = [
        { value: "#", fontWeight: "bold" as const },
        { value: "Registered at", fontWeight: "bold" as const },
        { value: "Full name", fontWeight: "bold" as const },
        { value: "Email", fontWeight: "bold" as const },
        { value: "Phone", fontWeight: "bold" as const },
        { value: "Nationality", fontWeight: "bold" as const },
        { value: "University", fontWeight: "bold" as const },
        { value: "Academic year", fontWeight: "bold" as const },
      ];

      const dataRows = allRows.map((row, index) => [
        { type: String, value: String(index + 1) },
        { type: String, value: formatCairoDateTime(row.created_at) },
        { type: String, value: row.full_name },
        { type: String, value: row.email },
        { type: String, value: row.phone },
        { type: String, value: row.nationality },
        { type: String, value: row.university },
        { type: String, value: row.academic_year },
      ]);

      const columns = [
        { width: 6 },
        { width: 24 },
        { width: 28 },
        { width: 32 },
        { width: 18 },
        { width: 16 },
        { width: 36 },
        { width: 16 },
      ];

      const cairoDate = getCairoDateStamp();
      type WriteXlsxBrowser = (
        sheetData: unknown,
        sheetOptions?: unknown
      ) => { toFile: (fileName: string) => Promise<void> };

      await (writeXlsxFile as unknown as WriteXlsxBrowser)(
        [headerRow, ...dataRows],
        { columns, stickyRowsCount: 1 }
      ).toFile(`compass-registrations-${cairoDate}.xlsx`);

      setNotice(`Exported ${allRows.length} registrations to compass-registrations-${cairoDate}.xlsx.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to export registrations.");
      console.error("Export error:", e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <details className="admin-collapse" id="admin-registrations" open>
      <summary className="admin-collapse-summary">
        <span>Registrations</span>
        {count !== null ? <span className="admin-collapse-count">{count}</span> : null}
      </summary>
      <div className="admin-collapse-body">
        <p className="admin-note">
          Conference attendee registrations. Export creates an Excel (.xlsx) file with all
          registered attendees up to this moment.
        </p>

        {loading ? (
          <p className="admin-note">Loading registration count…</p>
        ) : count === 0 ? (
          <div style={{ marginTop: "16px" }}>
            <button type="button" className="button button-secondary" disabled>
              <span className="button-label">No registrations yet</span>
            </button>
          </div>
        ) : (
          <div style={{ marginTop: "16px" }}>
            <button
              type="button"
              className="button button-secondary"
              onClick={exportToExcel}
              disabled={exporting}
            >
              <span className="button-label">
                {exporting ? "Preparing export…" : `Download Excel (.xlsx) (${count})`}
              </span>
            </button>
          </div>
        )}

        {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
        {error ? <p className="admin-error" role="alert">{error}</p> : null}
      </div>
    </details>
  );
}
