"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  ACADEMIC_YEARS,
  NATIONALITIES,
  UNIVERSITIES,
  canDeleteRegistrations,
  cleanPhoneForSearch,
  getExportFilename,
  hasActiveFilters,
  sortAcademicYearCounts,
} from "@/lib/registration";

export type RegistrationRecord = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  nationality_other?: string | null;
  university: string;
  university_other?: string | null;
  academic_year: string;
  total_count?: number | string;
};

export type RegistrationLogRecord = {
  id: string;
  deleted_at: string;
  deleted_by: string;
  registration_id: string;
  full_name: string;
};

export type RegistrationSummaryData = {
  total: number;
  by_university: { university: string; count: number }[];
  by_academic_year: { academic_year: string; count: number }[];
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
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const PAGE_SIZE = 25;

export function AdminRegistrations({ sessionEmail }: { sessionEmail: string | null }) {
  const canDelete = useMemo(() => canDeleteRegistrations(sessionEmail), [sessionEmail]);

  // Overall summary state (independent of filters)
  const [summary, setSummary] = useState<RegistrationSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Filters state
  const [queryInput, setQueryInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [universityFilter, setUniversityFilter] = useState("All");
  const [academicYearFilter, setAcademicYearFilter] = useState("All");
  const [nationalityFilter, setNationalityFilter] = useState("All");

  // Pagination state
  const [pageIndex, setPageIndex] = useState(0);

  // Rows and data state
  const [rows, setRows] = useState<RegistrationRecord[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [rowsLoading, setRowsLoading] = useState(true);

  // Export & Action state
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deletingRecord, setDeletingRecord] = useState<RegistrationRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Deletion log state (fares only)
  const [deletionLog, setDeletionLog] = useState<RegistrationLogRecord[] | null>(null);
  const [deletionLogLoading, setDeletionLogLoading] = useState(false);

  const searchInputId = useId();
  const uniSelectId = useId();
  const yearSelectId = useId();
  const natSelectId = useId();

  // Debounce queryInput by ~300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(queryInput);
      setPageIndex(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [queryInput]);

  // Load summary (all totals regardless of filters)
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const { data, error: rpcErr } = await getSupabase().rpc("registration_summary");
      if (rpcErr) {
        // Fallback if RPC isn't applied yet: fetch count directly
        const { count, error: countErr } = await getSupabase()
          .from("registrations")
          .select("id", { count: "exact", head: true });
        if (countErr) throw countErr;
        setSummary({ total: count ?? 0, by_university: [], by_academic_year: [] });
      } else if (data) {
        const raw = typeof data === "string" ? JSON.parse(data) : data;
        setSummary({
          total: raw.total ?? 0,
          by_university: raw.by_university ?? [],
          by_academic_year: sortAcademicYearCounts(raw.by_academic_year ?? []),
        });
      }
    } catch (err) {
      console.error("Failed to load registration summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Load deletion log (fares only)
  const loadDeletionLog = useCallback(async () => {
    if (!canDelete) return;
    setDeletionLogLoading(true);
    try {
      const { data, error: logErr } = await getSupabase()
        .from("registration_log")
        .select("id,deleted_at,deleted_by,registration_id,full_name")
        .order("deleted_at", { ascending: false })
        .limit(20);
      if (logErr) throw logErr;
      setDeletionLog((data as RegistrationLogRecord[]) ?? []);
    } catch {
      setDeletionLog([]);
    } finally {
      setDeletionLogLoading(false);
    }
  }, [canDelete]);

  // Load registrations with current filters and pagination
  const loadRows = useCallback(async () => {
    setRowsLoading(true);
    setError(null);
    try {
      const cleanQ = debouncedQuery.trim();
      const pUni = universityFilter === "All" ? null : universityFilter;
      const pYear = academicYearFilter === "All" ? null : academicYearFilter;
      const pNat = nationalityFilter === "All" ? null : nationalityFilter;
      const offset = pageIndex * PAGE_SIZE;

      // Try RPC first
      const { data, error: rpcErr } = await getSupabase().rpc("search_registrations", {
        q: cleanQ || null,
        p_university: pUni,
        p_academic_year: pYear,
        p_nationality: pNat,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      });

      if (!rpcErr && data) {
        const resultRows = data as RegistrationRecord[];
        setRows(resultRows);
        const matchTotal = resultRows.length > 0 ? Number(resultRows[0].total_count ?? 0) : 0;
        setTotalMatches(matchTotal);
      } else {
        // Fallback to table queries if RPC function is not yet created
        let countQuery = getSupabase().from("registrations").select("id", { count: "exact", head: true });
        let dataQuery = getSupabase()
          .from("registrations")
          .select("id,created_at,full_name,email,phone,nationality,nationality_other,university,university_other,academic_year");

        if (pUni) {
          countQuery = countQuery.eq("university", pUni);
          dataQuery = dataQuery.eq("university", pUni);
        }
        if (pYear) {
          countQuery = countQuery.eq("academic_year", pYear);
          dataQuery = dataQuery.eq("academic_year", pYear);
        }
        if (pNat) {
          countQuery = countQuery.eq("nationality", pNat);
          dataQuery = dataQuery.eq("nationality", pNat);
        }
        if (cleanQ) {
          const phoneSearch = cleanPhoneForSearch(cleanQ);
          const filterStr = phoneSearch
            ? `full_name.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%,phone.like.%${phoneSearch}%`
            : `full_name.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%`;
          countQuery = countQuery.or(filterStr);
          dataQuery = dataQuery.or(filterStr);
        }

        const { count: fbCount, error: fbCountErr } = await countQuery;
        if (fbCountErr) throw fbCountErr;
        setTotalMatches(fbCount ?? 0);

        const { data: fbData, error: fbDataErr } = await dataQuery
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (fbDataErr) throw fbDataErr;
        setRows((fbData as RegistrationRecord[]) ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load registrations");
      setRows([]);
      setTotalMatches(0);
    } finally {
      setRowsLoading(false);
    }
  }, [debouncedQuery, universityFilter, academicYearFilter, nationalityFilter, pageIndex]);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadSummary();
      if (active && canDelete) {
        await loadDeletionLog();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadSummary, loadDeletionLog, canDelete]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        await loadRows();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadRows]);

  const activeFilters = useMemo(
    () =>
      hasActiveFilters({
        q: debouncedQuery,
        university: universityFilter,
        academicYear: academicYearFilter,
        nationality: nationalityFilter,
      }),
    [debouncedQuery, universityFilter, academicYearFilter, nationalityFilter]
  );

  function clearFilters() {
    setQueryInput("");
    setDebouncedQuery("");
    setUniversityFilter("All");
    setAcademicYearFilter("All");
    setNationalityFilter("All");
    setPageIndex(0);
  }

  // Confirm delete handler
  async function confirmDelete() {
    if (!deletingRecord || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    setNotice(null);

    try {
      const { count, error: delErr } = await getSupabase()
        .from("registrations")
        .delete({ count: "exact" })
        .eq("id", deletingRecord.id);

      if (delErr) throw delErr;

      if (count === 1) {
        setNotice(`Registration for ${deletingRecord.full_name} deleted.`);
        setDeletingRecord(null);
        await Promise.all([loadRows(), loadSummary(), loadDeletionLog()]);
      } else {
        setError("Not deleted: no permission or already removed.");
        setDeletingRecord(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete registration.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Filter-aware Excel export
  async function exportToExcel() {
    if (exporting || totalMatches === 0) return;
    setExporting(true);
    setError(null);
    setNotice(null);

    try {
      const cleanQ = debouncedQuery.trim();
      const pUni = universityFilter === "All" ? null : universityFilter;
      const pYear = academicYearFilter === "All" ? null : academicYearFilter;
      const pNat = nationalityFilter === "All" ? null : nationalityFilter;

      // Paged retrieval across all matching records
      const EXPORT_PAGE = 1000;
      let allExportRows: RegistrationRecord[] = [];
      let offset = 0;

      while (true) {
        const { data: pageData, error: pageErr } = await getSupabase().rpc("search_registrations", {
          q: cleanQ || null,
          p_university: pUni,
          p_academic_year: pYear,
          p_nationality: pNat,
          p_limit: EXPORT_PAGE,
          p_offset: offset,
        });

        if (pageErr) {
          // If RPC is unavailable, fall back to table query
          let fallbackQuery = getSupabase()
            .from("registrations")
            .select("id,created_at,full_name,email,phone,nationality,nationality_other,university,university_other,academic_year");

          if (pUni) fallbackQuery = fallbackQuery.eq("university", pUni);
          if (pYear) fallbackQuery = fallbackQuery.eq("academic_year", pYear);
          if (pNat) fallbackQuery = fallbackQuery.eq("nationality", pNat);
          if (cleanQ) {
            const phoneSearch = cleanPhoneForSearch(cleanQ);
            const filterStr = phoneSearch
              ? `full_name.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%,phone.like.%${phoneSearch}%`
              : `full_name.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%`;
            fallbackQuery = fallbackQuery.or(filterStr);
          }

          const { data: fbData, error: fbErr } = await fallbackQuery
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(offset, offset + EXPORT_PAGE - 1);

          if (fbErr) throw fbErr;
          if (!fbData || fbData.length === 0) break;
          allExportRows = allExportRows.concat(fbData as RegistrationRecord[]);
          if (fbData.length < EXPORT_PAGE) break;
          offset += EXPORT_PAGE;
        } else {
          if (!pageData || pageData.length === 0) break;
          allExportRows = allExportRows.concat(pageData as RegistrationRecord[]);
          if (pageData.length < EXPORT_PAGE) break;
          offset += EXPORT_PAGE;
        }
      }

      // Verify fetched count equals expected exact match total
      if (allExportRows.length !== totalMatches) {
        throw new Error(
          `Count mismatch: expected ${totalMatches} rows, but fetched ${allExportRows.length}. Export aborted to prevent partial file.`
        );
      }

      // Dynamic import of write-excel-file
      const { default: writeXlsxFile } = await import("write-excel-file/browser");

      const headerRow = [
        { value: "#", fontWeight: "bold" as const },
        { value: "Registered at", fontWeight: "bold" as const },
        { value: "Full name", fontWeight: "bold" as const },
        { value: "Email", fontWeight: "bold" as const },
        { value: "Phone", fontWeight: "bold" as const },
        { value: "Nationality", fontWeight: "bold" as const },
        { value: "Nationality (specified)", fontWeight: "bold" as const },
        { value: "University", fontWeight: "bold" as const },
        { value: "University (specified)", fontWeight: "bold" as const },
        { value: "Academic year", fontWeight: "bold" as const },
      ];

      const dataRows = allExportRows.map((row, index) => [
        { type: String, value: String(index + 1) },
        { type: String, value: formatCairoDateTime(row.created_at) },
        { type: String, value: row.full_name },
        { type: String, value: row.email },
        { type: String, value: row.phone },
        { type: String, value: row.nationality },
        {
          type: String,
          value: row.nationality === "Other" && row.nationality_other ? row.nationality_other : "",
        },
        { type: String, value: row.university },
        {
          type: String,
          value: row.university === "Other" && row.university_other ? row.university_other : "",
        },
        { type: String, value: row.academic_year },
      ]);

      const columns = [
        { width: 6 },
        { width: 24 },
        { width: 28 },
        { width: 32 },
        { width: 18 },
        { width: 16 },
        { width: 24 },
        { width: 36 },
        { width: 32 },
        { width: 16 },
      ];

      const cairoDate = getCairoDateStamp();
      const filename = getExportFilename(cairoDate, activeFilters);

      type WriteXlsxBrowser = (
        sheetData: unknown,
        sheetOptions?: unknown
      ) => { toFile: (fileName: string) => Promise<void> };

      await (writeXlsxFile as unknown as WriteXlsxBrowser)(
        [headerRow, ...dataRows],
        { columns, stickyRowsCount: 1 }
      ).toFile(filename);

      setNotice(`Exported ${allExportRows.length} registrations to ${filename}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to export registrations.");
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.ceil(totalMatches / PAGE_SIZE);

  return (
    <details className="admin-collapse" id="admin-registrations" open>
      <summary className="admin-collapse-summary">
        <span>Registrations</span>
        {summary?.total !== undefined ? <span className="admin-collapse-count">{summary.total}</span> : null}
      </summary>

      <div className="admin-collapse-body">
        {/* ---- 1. Summary Section ---- */}
        <section className="reg-summary-section" aria-label="Registration overview">
          <div className="reg-summary-header">
            <h3 className="reg-summary-title">Summary</h3>
            <p className="reg-summary-overall">
              Total registered attendees: <strong>{summaryLoading ? "…" : (summary?.total ?? 0)}</strong>
            </p>
          </div>

          {summary && summary.total > 0 ? (
            <div className="reg-summary-grid">
              {/* University counts */}
              <div className="reg-summary-column">
                <h4 className="reg-summary-col-heading">By University</h4>
                <div className="reg-summary-list">
                  {summary.by_university.map((u) => {
                    const pct = summary.total > 0 ? (u.count / summary.total) * 100 : 0;
                    return (
                      <div key={u.university} className="reg-summary-item">
                        <div className="reg-summary-item-text">
                          <span className="reg-summary-label">{u.university}</span>
                          <span className="reg-summary-count">{u.count}</span>
                        </div>
                        <div className="reg-summary-bar-bg" aria-hidden="true">
                          <div className="reg-summary-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Academic year counts */}
              <div className="reg-summary-column">
                <h4 className="reg-summary-col-heading">By Academic Year</h4>
                <div className="reg-summary-list">
                  {summary.by_academic_year.map((y) => {
                    const pct = summary.total > 0 ? (y.count / summary.total) * 100 : 0;
                    return (
                      <div key={y.academic_year} className="reg-summary-item">
                        <div className="reg-summary-item-text">
                          <span className="reg-summary-label">{y.academic_year}</span>
                          <span className="reg-summary-count">{y.count}</span>
                        </div>
                        <div className="reg-summary-bar-bg" aria-hidden="true">
                          <div className="reg-summary-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* ---- 2. Search & Filters Bar ---- */}
        <section className="reg-filter-section" aria-label="Search and filter registrations">
          <div className="reg-filter-grid">
            <div className="reg-filter-field">
              <label htmlFor={searchInputId}>Search</label>
              <input
                id={searchInputId}
                type="search"
                placeholder="Name, email, or phone…"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
              />
            </div>

            <div className="reg-filter-field">
              <label htmlFor={uniSelectId}>University</label>
              <select
                id={uniSelectId}
                value={universityFilter}
                onChange={(e) => {
                  setUniversityFilter(e.target.value);
                  setPageIndex(0);
                }}
              >
                <option value="All">All universities</option>
                {UNIVERSITIES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="reg-filter-field">
              <label htmlFor={yearSelectId}>Academic Year</label>
              <select
                id={yearSelectId}
                value={academicYearFilter}
                onChange={(e) => {
                  setAcademicYearFilter(e.target.value);
                  setPageIndex(0);
                }}
              >
                <option value="All">All academic years</option>
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="reg-filter-field">
              <label htmlFor={natSelectId}>Nationality</label>
              <select
                id={natSelectId}
                value={nationalityFilter}
                onChange={(e) => {
                  setNationalityFilter(e.target.value);
                  setPageIndex(0);
                }}
              >
                <option value="All">All nationalities</option>
                {NATIONALITIES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="reg-filter-actions">
            {activeFilters ? (
              <button type="button" className="button button-secondary reg-clear-btn" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}

            <button
              type="button"
              className="button button-secondary reg-export-btn"
              onClick={exportToExcel}
              disabled={exporting || totalMatches === 0}
            >
              <span className="button-label">
                {exporting
                  ? "Preparing export…"
                  : activeFilters
                  ? `Download Filtered Excel (${totalMatches})`
                  : `Download Excel (.xlsx) (${totalMatches})`}
              </span>
            </button>
          </div>
        </section>

        {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
        {error ? <p className="admin-error" role="alert">{error}</p> : null}

        {/* ---- 3. Registrations Results Table / List ---- */}
        <section className="reg-results-section" aria-label="Registration records">
          <div className="reg-results-header">
            <span className="reg-results-count">
              {rowsLoading
                ? "Loading records…"
                : `${totalMatches} ${totalMatches === 1 ? "match" : "matches"}${
                    activeFilters ? " (filtered)" : ""
                  }`}
            </span>
          </div>

          {rowsLoading ? (
            <p className="admin-note" style={{ padding: "20px 0" }}>Loading registration records…</p>
          ) : rows.length === 0 ? (
            <div className="reg-empty-state">
              <p className="admin-note">
                {activeFilters
                  ? "No registrations match your search criteria."
                  : "No registrations received yet."}
              </p>
            </div>
          ) : (
            <ul className="reg-rows-list">
              {rows.map((row) => {
                const displayUni =
                  row.university === "Other" && row.university_other
                    ? `${row.university_other} (Other)`
                    : row.university;
                const displayNat =
                  row.nationality === "Other" && row.nationality_other
                    ? `${row.nationality_other} (Other)`
                    : row.nationality;

                return (
                  <li key={row.id} className="reg-row-item">
                    <div className="reg-row-main">
                      <div className="reg-row-primary">
                        <span className="reg-row-name">{row.full_name}</span>
                        <span className="reg-row-date">{formatCairoDateTime(row.created_at)}</span>
                      </div>

                      <div className="reg-row-details">
                        <span className="reg-row-detail-item">
                          <strong>Email:</strong> {row.email}
                        </span>
                        <span className="reg-row-detail-item">
                          <strong>Phone:</strong> {row.phone}
                        </span>
                        <span className="reg-row-detail-item">
                          <strong>University:</strong> {displayUni}
                        </span>
                        <span className="reg-row-detail-item">
                          <strong>Year:</strong> {row.academic_year}
                        </span>
                        {row.nationality === "Other" ? (
                          <span className="reg-row-detail-item">
                            <strong>Nationality:</strong> {displayNat}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {canDelete ? (
                      <div className="reg-row-actions">
                        <button
                          type="button"
                          className="button button-secondary reg-delete-btn"
                          onClick={() => setDeletingRecord(row)}
                          aria-label={`Delete registration for ${row.full_name}`}
                        >
                          <span className="button-label">Delete</span>
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 ? (
            <div className="reg-pagination">
              <button
                type="button"
                className="button button-secondary"
                disabled={pageIndex === 0 || rowsLoading}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <span className="reg-page-indicator">
                Page {pageIndex + 1} of {totalPages}
              </span>
              <button
                type="button"
                className="button button-secondary"
                disabled={pageIndex >= totalPages - 1 || rowsLoading}
                onClick={() => setPageIndex((p) => p + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </section>

        {/* ---- 4. Deletion Log (fares9005@gmail.com only) ---- */}
        {canDelete ? (
          <details className="admin-collapse reg-log-collapse" style={{ marginTop: "32px" }}>
            <summary className="admin-collapse-summary" style={{ fontSize: "18px" }}>
              <span>Deletion Log (Audit Trail)</span>
              {deletionLog !== null ? (
                <span className="admin-collapse-count">{deletionLog.length}</span>
              ) : null}
            </summary>
            <div className="admin-collapse-body">
              <p className="admin-hint">
                Audit trail of deleted registrations. Shows the last 20 deletions. Sensitive
                contact details (email and phone) are permanently excluded from this log.
              </p>

              {deletionLogLoading ? (
                <p className="admin-note">Loading deletion log…</p>
              ) : !deletionLog || deletionLog.length === 0 ? (
                <p className="admin-note">No deletions recorded.</p>
              ) : (
                <ul className="reg-log-list">
                  {deletionLog.map((log) => (
                    <li key={log.id} className="reg-log-item">
                      <div>
                        <strong>{log.full_name}</strong>
                        <span className="reg-log-meta">
                          Deleted by {log.deleted_by} on {formatCairoDateTime(log.deleted_at)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        ) : null}

        {/* ---- 5. Single Registration Delete Confirmation Modal ---- */}
        {deletingRecord ? (
          <div className="reg-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="del-modal-title">
            <div className="reg-modal-box">
              <h3 id="del-modal-title" className="reg-modal-title">Confirm Delete</h3>
              <p className="reg-modal-copy">
                Are you sure you want to delete the registration for{" "}
                <strong>{deletingRecord.full_name}</strong> (
                {deletingRecord.university === "Other" && deletingRecord.university_other
                  ? deletingRecord.university_other
                  : deletingRecord.university}
                )?
              </p>
              <p className="reg-modal-warn">
                This action is permanent and will remove the attendee from all records and export files.
              </p>

              <div className="reg-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setDeletingRecord(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button reg-modal-delete-btn"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting…" : "Delete registration"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}
