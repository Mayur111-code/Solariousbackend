"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock3, Loader2, MailCheck, Play, Save, ShieldAlert } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { apiError } from "@/lib/api-error";
import { AdminDataTable, AdminStatusBadge } from "@/components/admin-ui";

type Settings = {
  enabled: boolean;
  recipient: string;
  timezone: string;
  frequencyDays: number;
  lastSentAt?: string | null;
  nextScheduledAt?: string | null;
};
type Provider = { provider: string; from?: string; configured: boolean; missing?: string[] };
type History = {
  id: string;
  periodStart: string;
  periodEnd: string;
  total: number;
  recipient: string;
  mode: string;
  reportType?: string;
  status: string;
  errorSummary?: string;
  errorCode?: string;
  sentAt?: string;
  created_at: string;
  completedAt?: string;
  providerMessageId?: string;
};
const initial: Settings = { enabled: false, recipient: "", timezone: "Asia/Kolkata", frequencyDays: 7 };
const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })
    : "Not available";

export default function AdminReportSettings() {
  const [settings, setSettings] = useState<Settings>(initial);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [lastDelivery, setLastDelivery] = useState<History | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const [settingsResponse, historyResponse] = await Promise.all([
        adminFetch("/api/admin/enquiry-report-settings"),
        adminFetch(`/api/admin/enquiry-reports${query}`),
      ]);
      if (!settingsResponse.ok) throw await apiError(settingsResponse, "Report settings could not be loaded");
      if (!historyResponse.ok) throw await apiError(historyResponse, "Report history could not be loaded");
      const [settingsBody, historyBody] = await Promise.all([settingsResponse.json(), historyResponse.json()]);
      setSettings({ ...initial, ...settingsBody.settings });
      setProvider(settingsBody.emailProvider || null);
      setLastDelivery(settingsBody.lastDelivery || null);
      setHistory(historyBody.reports || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Report settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const sent = useMemo(() => history.filter(report => report.status === "sent").length, [history]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save");
    setError("");
    setNotice("");
    const response = await adminFetch("/api/admin/enquiry-report-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (response.ok) {
      const body = await response.json();
      setSettings({ ...initial, ...body.settings });
      setNotice("Weekly report settings saved.");
    } else {
      setError((await apiError(response, "Report settings could not be saved")).message);
    }
    setBusy("");
  }

  async function run(action: "test" | "send-now") {
    setBusy(action);
    setError("");
    setNotice("");
    const response = await adminFetch(`/api/admin/enquiry-reports/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      const delivered = body?.report?.status === "sent" || body?.status === "sent";
      setNotice(
        delivered
          ? action === "test"
            ? "Test email accepted by the configured provider."
            : "Seven-day business activity report delivered."
          : `The provider accepted the request but did not confirm delivery (status: ${body?.report?.status || "unknown"}).`
      );
      await load();
    } else {
      setError((await apiError(response, action === "test" ? "Test email could not be sent" : "Report could not be sent")).message);
    }
    setBusy("");
  }

  async function retry(report: History) {
    setBusy(report.id);
    setError("");
    const response = await adminFetch(`/api/admin/enquiry-reports/${report.id}/retry`, { method: "POST" });
    if (response.ok) {
      setNotice("Failed report retried.");
      await load();
    } else {
      setError((await apiError(response, "The failed report could not be retried")).message);
    }
    setBusy("");
  }

  if (loading) {
    return (
      <section className="enterprise-card admin-report-settings">
        <div className="enterprise-loading">
          <span />
          <strong>Loading email report settings…</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="enterprise-card admin-report-settings">
      <header>
        <div>
          <p className="admin-section-kicker">Settings / Automation</p>
          <h2>Weekly Business Activity Report</h2>
          <span>
            One branded report every seven days (Asia/Kolkata) built from real enquiries, leads, creative
            activity and document uploads. No customer data leaves the server except in this email.
          </span>
        </div>
        <Clock3 />
      </header>

      {notice && <div className="enterprise-alert success" role="status">{notice}</div>}
      {error && <div className="enterprise-alert error" role="alert">{error}</div>}

      {provider && !provider.configured && (
        <div className="enterprise-alert error" role="alert">
          <ShieldAlert size={16} />
          <span>
            The email provider is not configured ({provider.provider}). Set EMAIL_API_KEY and EMAIL_FROM on the
            server before enabling scheduled delivery.
          </span>
        </div>
      )}

      <form onSubmit={save}>
        <label className="admin-toggle-row">
          <span>
            <strong>Enable the weekly activity report</strong>
            <small>
              A protected cron endpoint checks the stored seven-day schedule. Every run is recorded per period,
              so the same period can never be emailed twice.
            </small>
          </span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={event => setSettings(current => ({ ...current, enabled: event.target.checked }))}
          />
        </label>
        <div className="admin-report-grid">
          <label>
            Recipient email
            <input
              type="email"
              required={settings.enabled}
              value={settings.recipient}
              onChange={event => setSettings(current => ({ ...current, recipient: event.target.value }))}
              placeholder="info@solariousenergy.com"
            />
          </label>
          <label>
            Frequency
            <input value={`Every ${settings.frequencyDays} days`} readOnly />
          </label>
          <label>
            Reporting timezone
            <input value={settings.timezone} readOnly />
          </label>
          <label>
            Last report sent
            <input value={dateTime(settings.lastSentAt)} readOnly />
          </label>
          <label>
            Next scheduled report
            <input value={dateTime(settings.nextScheduledAt)} readOnly />
          </label>
          <label>
            Email provider
            <input value={provider ? `${provider.provider}${provider.configured ? " · ready" : " · not configured"}` : "unknown"} readOnly />
          </label>
        </div>
        <div className="admin-report-actions">
          <button className="button" disabled={Boolean(busy)}>
            <Save />
            {busy === "save" ? "Saving…" : "Save settings"}
          </button>
          <button
            type="button"
            className="button button-ghost"
            disabled={Boolean(busy) || !settings.recipient}
            onClick={() => void run("test")}
          >
            <MailCheck />
            {busy === "test" ? "Sending…" : "Send test email"}
          </button>
          <button
            type="button"
            className="button button-ghost"
            disabled={Boolean(busy) || !settings.recipient}
            onClick={() => void run("send-now")}
          >
            <Play />
            {busy === "send-now" ? "Sending…" : "Send report now"}
          </button>
        </div>
      </form>

      <div className="admin-report-summary">
        <div>
          <CalendarClock />
          <strong>{lastDelivery ? dateTime(lastDelivery.sentAt || lastDelivery.completedAt) : "Never"}</strong>
          <span>Last {lastDelivery?.reportType === "test" ? "test" : "weekly"} delivery</span>
        </div>
        <div>
          <strong>{lastDelivery?.status || "—"}</strong>
          <span>Last recorded status</span>
        </div>
        <div>
          <strong>{sent}</strong>
          <span>Successful deliveries in this view</span>
        </div>
      </div>

      <div className="admin-report-history">
        <div className="admin-report-history-head">
          <h3>Delivery history</h3>
          <label>
            Status
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="unknown">Unknown</option>
              <option value="processing">Processing</option>
            </select>
          </label>
        </div>
        <AdminDataTable label="Weekly business activity report delivery history">
          <table className="enterprise-data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Type</th>
                <th>Enquiries</th>
                <th>Recipient</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Sent at</th>
                <th>Error</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map(report => (
                <tr key={report.id}>
                  <td>
                    <strong>{dateTime(report.periodStart)}</strong>
                    <small>to {dateTime(report.periodEnd)}</small>
                  </td>
                  <td>{report.reportType === "test" ? "Test" : "Weekly"}</td>
                  <td>{report.total}</td>
                  <td>{report.recipient}</td>
                  <td>{report.mode}</td>
                  <td>
                    <AdminStatusBadge status={report.status} />
                  </td>
                  <td>{dateTime(report.sentAt || report.completedAt)}</td>
                  <td>{report.errorSummary || report.errorCode || "—"}</td>
                  <td>
                    {report.status === "failed" ? (
                      <button
                        className="admin-report-retry"
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void retry(report)}
                      >
                        {busy === report.id ? <Loader2 className="spin" /> : "Retry"}
                      </button>
                    ) : report.providerMessageId ? (
                      <small title={report.providerMessageId}>Provider id recorded</small>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
        {!history.length && <div className="admin-empty">No report deliveries have been recorded yet.</div>}
      </div>
    </section>
  );
}
