"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { apiError } from "@/lib/api-error";
import {
  AdminDataTable,
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
} from "@/components/admin-ui";

type RfqRow = {
  id: string;
  rfqReferenceId: string;
  createdAt: string;
  fullName: string;
  workEmail: string;
  phone: string;
  companyName: string;
  gstin: string;
  designation: string;
  projectType: string;
  projectTypeLabel: string;
  volumeTier: string;
  volumeTierLabel: string;
  moduleTechnology: string;
  moduleTechnologyLabel: string;
  dispatchTimeline: string;
  dispatchTimelineLabel: string;
  targetLocation: { country?: string; state?: string; city?: string; site?: string };
  targetLocationLabel: string;
  specificationRequirements: string;
  projectNotes: string;
  priority: "Normal" | "Medium" | "High";
  status: string;
  assignedTo: string;
  followUpDate?: string;
  internalRemarks: string;
  notifications?: Record<string, { status?: string; attempts?: number; lastError?: string }>;
};

type Analytics = {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  monthlyTrend: { month: string; count: number }[];
  notifications: { emailProvider: string; emailConfigured: boolean; salesInbox: string[]; highPriorityInbox: string[]; webhookConfigured: boolean };
};

type Events = { id: string; type: string; actor: string; summary: string; created_at: string }[];

const STATUS_FILTERS = [
  ["", "All statuses"],
  ["new", "New"],
  ["under_review", "Under Review"],
  ["contacted", "Contacted"],
  ["quotation_in_progress", "Quotation in Progress"],
  ["quotation_sent", "Quotation Sent"],
  ["negotiation", "Negotiation"],
  ["won", "Won"],
  ["lost", "Lost"],
  ["closed", "Closed"],
] as const;

const dateText = (value?: string) =>
  value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const notificationLabel = (entry?: { status?: string; attempts?: number; lastError?: string }) => {
  if (!entry?.status || entry.status === "pending") return "Queued";
  if (entry.status === "sent") return "Sent";
  if (entry.status === "not_configured") return "Not configured";
  return `Failed${entry.lastError ? ` · ${entry.lastError}` : ""}`;
};

export default function AdminRfq() {
  const [rows, setRows] = useState<RfqRow[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [highOnly, setHighOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<RfqRow | null>(null);
  const [events, setEvents] = useState<Events>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverFields, setServerFields] = useState<string[]>([]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (highOnly) params.set("highPriority", "true");
    return params.toString();
  }, [page, search, status, priority, highOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listResponse, analyticsResponse] = await Promise.all([
        adminFetch(`/api/admin/rfqs?${query}`),
        adminFetch("/api/admin/rfq-analytics"),
      ]);
      if (!listResponse.ok) throw await apiError(listResponse, "RFQs could not be loaded");
      const list = await listResponse.json();
      setRows(list.rfqs ?? []);
      setTotal(list.total ?? 0);
      if (analyticsResponse.ok) setAnalytics((await analyticsResponse.json()) as Analytics);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "RFQs could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function openDetail(row: RfqRow) {
    setSelected(row);
    setEvents([]);
    setNote("");
    setServerFields([]);
    setDetailLoading(true);
    try {
      const response = await adminFetch(`/api/admin/rfqs/${row.id}`);
      if (!response.ok) throw await apiError(response, "RFQ details could not be loaded");
      const data = await response.json();
      setSelected(data.rfq as RfqRow);
      setEvents((data.events ?? []) as Events);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "RFQ details could not be loaded.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function patch(path: string, body: Record<string, unknown>, successMessage: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await adminFetch(`/api/admin/rfqs/${selected.id}${path}`, {
        method: path === "/notes" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw await apiError(response, "The RFQ could not be updated");
      const data = await response.json();
      if (data.rfq) {
        setSelected(data.rfq as RfqRow);
        setRows((current) => current.map((row) => (row.id === (data.rfq as RfqRow).id ? { ...row, ...(data.rfq as RfqRow) } : row)));
      }
      setNotice(successMessage);
      await openDetail((data.rfq as RfqRow) ?? selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The RFQ could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function retryNotifications() {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await adminFetch(`/api/admin/rfqs/${selected.id}/notifications/retry`, { method: "POST" });
      if (!response.ok) throw await apiError(response, "Notifications could not be retried");
      setNotice("Notification delivery retried.");
      await openDetail(selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Notifications could not be retried.");
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!note.trim()) {
      setServerFields(["note"]);
      return;
    }
    await patch("/notes", { note }, "Internal note added.");
    setNote("");
  }

  const exportUrl = `/api/admin/rfqs/export?${query.replace(/(^|&)page=[^&]*|(^|&)limit=[^&]*/g, "").replace(/^&/, "")}`;
  const monthlyMax = Math.max(1, ...(analytics?.monthlyTrend ?? []).map((entry) => entry.count));

  return (
    <>
      <AdminPageHeader
        eyebrow="Commercial pipeline"
        title="RFQ Management"
        description="Procurement requests with server-generated references, priority classification and notification tracking."
        actions={
          <a className="button button-ghost" href={exportUrl} download>
            <Download size={15} /> Export CSV
          </a>
        }
      />

      <section className="enterprise-stats-grid">
        <AdminStatCard label="Total RFQs" value={analytics?.total ?? 0} icon={Inbox} detail="All procurement requests" />
        <AdminStatCard label="New" value={analytics?.byStatus?.new ?? 0} icon={Search} tone="orange" detail="Awaiting first review" />
        <AdminStatCard label="High priority" value={analytics?.byPriority?.High ?? 0} icon={AlertTriangle} tone="red" detail="1 MW and above" />
        <AdminStatCard label="Quotations sent" value={analytics?.byStatus?.quotation_sent ?? 0} icon={Mail} tone="blue" detail="Commercial offers issued" />
        <AdminStatCard label="Won" value={analytics?.byStatus?.won ?? 0} icon={TrendingUp} tone="green" detail={`${analytics?.byStatus?.lost ?? 0} lost`} />
      </section>

      <section className="enterprise-card" style={{ marginTop: 18 }}>
        <header>
          <div>
            <h2>Monthly RFQ trend</h2>
            <p>Submissions over the last six months (IST months).</p>
          </div>
        </header>
        <div className="metric-band" style={{ background: "transparent", color: "inherit", marginTop: 8 }}>
          {(analytics?.monthlyTrend ?? []).map((entry) => (
            <div key={entry.month} style={{ borderRight: 0, padding: "10px 14px", background: "#f8faf8", borderRadius: 10 }}>
              <dt style={{ color: "#6b7671" }}>{entry.month}</dt>
              <dd style={{ color: "#0f2b46", fontSize: "1.5rem", margin: "6px 0 8px" }}>{entry.count}</dd>
              <div style={{ height: 6, borderRadius: 999, background: "#e6ebe7" }}>
                <div style={{ width: `${Math.round((entry.count / monthlyMax) * 100)}%`, height: "100%", borderRadius: 999, background: "#0f7a4a" }} />
              </div>
            </div>
          ))}
          {!analytics?.monthlyTrend?.length && <p className="admin-empty">No RFQs recorded yet.</p>}
        </div>
        <p style={{ marginTop: 12, color: "#6b7671", fontSize: ".78rem" }}>
          Email provider: <strong>{analytics?.notifications?.emailProvider ?? "none"}</strong>
          {" · "}Sales inbox: <strong>{analytics?.notifications?.salesInbox?.join(", ") || "not configured"}</strong>
          {" · "}High-priority inbox: <strong>{analytics?.notifications?.highPriorityInbox?.join(", ") || "not configured"}</strong>
          {" · "}Webhook: <strong>{analytics?.notifications?.webhookConfigured ? "configured" : "not configured"}</strong>
        </p>
      </section>

      <section className="enterprise-card" style={{ marginTop: 18 }}>
        <header>
          <div>
            <h2>Procurement requests</h2>
            <p>Search by reference, company or contact. Export respects the active filters.</p>
          </div>
        </header>
        <div className="rfq-admin-toolbar">
          <input
            placeholder="Search reference, company, contact, email or phone"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label="Search RFQs"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map(([value, label]) => (
              <option key={value || "all"} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by priority"
          >
            <option value="">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Normal">Normal</option>
          </select>
          <label className="rfq-consent" style={{ margin: 0, padding: "0 10px", background: "transparent", border: 0 }}>
            <input
              type="checkbox"
              checked={highOnly}
              onChange={(event) => {
                setHighOnly(event.target.checked);
                setPage(1);
              }}
            />
            <span>1 MW+ only</span>
          </label>
          <button type="button" className="button button-ghost" onClick={() => void load()}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {notice && (
          <div className="enterprise-alert success" role="status">
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss">×</button>
          </div>
        )}
        {error && (
          <div className="enterprise-alert error" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss">×</button>
          </div>
        )}

        {loading ? (
          <div className="enterprise-loading"><span /><strong>Loading RFQs…</strong></div>
        ) : (
          <>
            <AdminDataTable label="RFQ requests">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Company / contact</th>
                    <th scope="col">Capacity</th>
                    <th scope="col">Technology</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Status</th>
                    <th scope="col">Received</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.rfqReferenceId}</strong><small>{row.projectTypeLabel}</small></td>
                      <td><strong>{row.companyName}</strong><small>{row.fullName} · {row.workEmail}</small></td>
                      <td><strong>{row.volumeTierLabel}</strong><small>{row.targetLocationLabel}</small></td>
                      <td>{row.moduleTechnologyLabel}<small>{row.dispatchTimelineLabel}</small></td>
                      <td><span className={`rfq-priority-pill ${row.priority.toLowerCase()}`}>{row.priority}</span></td>
                      <td><AdminStatusBadge status={row.status} /></td>
                      <td>{dateText(row.createdAt)}</td>
                      <td><button type="button" className="button button-ghost" onClick={() => void openDetail(row)}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminDataTable>
            {!rows.length && (
              <div className="admin-empty">
                <Inbox />
                <strong>No RFQs found</strong>
                <p>Adjust the filters or wait for the first procurement request.</p>
              </div>
            )}
            <footer className="enterprise-pagination">
              <span>Showing {rows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total}</span>
              <div>
                <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
              </div>
            </footer>
          </>
        )}
      </section>

      {selected && (
        <div className="admin-modal-backdrop" onMouseDown={() => setSelected(null)}>
          <section
            className="admin-modal enterprise-enquiry-detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rfq-detail-title"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ maxWidth: 900 }}
          >
            <header>
              <div>
                <span className={`rfq-priority-pill ${selected.priority.toLowerCase()}`}>{selected.priority}</span>
                <h2 id="rfq-detail-title">{selected.rfqReferenceId}</h2>
                <p>{selected.companyName} · received {dateText(selected.createdAt)}</p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close">×</button>
            </header>

            {detailLoading ? (
              <div className="enterprise-loading"><span /><strong>Loading RFQ…</strong></div>
            ) : (
              <>
                <dl className="rfq-detail-grid">
                  <div><dt>Contact</dt><dd>{selected.fullName}{selected.designation ? ` · ${selected.designation}` : ""}</dd></div>
                  <div><dt>Work email</dt><dd><a href={`mailto:${selected.workEmail}`}>{selected.workEmail}</a></dd></div>
                  <div><dt>Phone / WhatsApp</dt><dd><a href={`tel:${selected.phone}`}>{selected.phone}</a></dd></div>
                  <div><dt>GSTIN</dt><dd>{selected.gstin || "Not provided"}</dd></div>
                  <div><dt>Application</dt><dd>{selected.projectTypeLabel}</dd></div>
                  <div><dt>Capacity tier</dt><dd>{selected.volumeTierLabel}</dd></div>
                  <div><dt>Module technology</dt><dd>{selected.moduleTechnologyLabel}</dd></div>
                  <div><dt>Timeline</dt><dd>{selected.dispatchTimelineLabel}</dd></div>
                  <div className="full"><dt>Project location</dt><dd>{selected.targetLocationLabel}{selected.targetLocation?.site ? ` · ${selected.targetLocation.site}` : ""}</dd></div>
                  <div className="full"><dt>Technical requirements</dt><dd>{selected.specificationRequirements || "Not provided"}</dd></div>
                  {selected.projectNotes ? <div className="full"><dt>Project notes</dt><dd>{selected.projectNotes}</dd></div> : null}
                  <div className="full"><dt>Internal remarks</dt><dd>{selected.internalRemarks || "No remarks yet."}</dd></div>
                </dl>

                <div className="rfq-notification-row">
                  {(["customer", "internal", "webhook"] as const).map((channel) => (
                    <span key={channel} className="verification-chip pending" title={selected.notifications?.[channel]?.lastError || ""}>
                      {channel}: {notificationLabel(selected.notifications?.[channel])}
                    </span>
                  ))}
                  <button type="button" className="button button-ghost" onClick={() => void retryNotifications()} disabled={busy}>
                    {busy ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />} Retry notifications
                  </button>
                </div>

                <div className="cert-admin-grid" style={{ marginTop: 18 }}>
                  <label>
                    Status
                    <select
                      value={selected.status}
                      onChange={(event) => void patch("/status", { status: event.target.value, previous: selected.status }, "RFQ status updated.")}
                      disabled={busy}
                    >
                      {STATUS_FILTERS.filter(([value]) => value).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assigned sales representative
                    <input
                      defaultValue={selected.assignedTo}
                      onBlur={(event) => {
                        if (event.target.value.trim() !== (selected.assignedTo || "")) {
                          void patch("/assign", { assignedTo: event.target.value.trim() }, "Assignment saved.");
                        }
                      }}
                    />
                  </label>
                  <label>
                    Follow-up date
                    <input
                      type="date"
                      defaultValue={selected.followUpDate ? String(selected.followUpDate).slice(0, 10) : ""}
                      onChange={(event) => void patch("/assign", { assignedTo: selected.assignedTo, followUpDate: event.target.value || null }, "Follow-up date saved.")}
                    />
                  </label>
                  <label className="full">
                    Add internal note
                    <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} aria-invalid={serverFields.includes("note")} />
                  </label>
                </div>
                <div className="wizard-actions" style={{ marginTop: 12 }}>
                  <button type="button" className="button" onClick={() => void addNote()} disabled={busy || !note.trim()}>Save note</button>
                </div>

                <h3 style={{ marginTop: 22, fontSize: "1rem" }}>Activity history</h3>
                <ul className="rfq-event-list">
                  {events.map((event) => (
                    <li key={event.id}>
                      <time>{dateText(event.created_at)} · {event.actor}</time>
                      <strong>{event.type}</strong> — {event.summary}
                    </li>
                  ))}
                  {!events.length && <li>No activity recorded yet.</li>}
                </ul>
              </>
            )}

            <footer>
              <button className="button button-ghost" onClick={() => setSelected(null)}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
