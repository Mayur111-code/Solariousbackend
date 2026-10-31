"use client";
/* eslint-disable @next/next/no-img-element */
import { adminFetch } from "@/lib/admin-fetch";
import { apiError } from "@/lib/api-error";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Eye,
  ImagePlus,
  Loader2,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  ALL_CREATIVE_CATEGORIES,
  ASPECT_RATIOS,
  AUDIENCE_HINTS,
  FESTIVAL_CATEGORY,
  FESTIVAL_OCCASIONS,
  LANGUAGES,
  PLATFORMS,
  REVIEW_STATUSES,
  type ReviewStatus,
} from "@/lib/creative-options";

type Creative = {
  id: string;
  creative_date: string;
  campaign_type: string;
  campaign_category: string;
  campaign_title: string;
  audience: string;
  purpose: string;
  platform: string;
  review_status: ReviewStatus;
  library_saved: boolean;
  favourite: boolean;
  occasion?: string;
  headline: string;
  caption: string;
  cta: string;
  hashtags: string;
  image_url: string;
  status: string;
  failure_code: string;
  error_summary?: string;
  aspect_ratio?: string;
  language?: string;
  generation_stage?: string;
};
type Settings = {
  company_name: string;
  email: string;
  mobile: string;
  website: string;
  default_cta: string;
  logo_url?: string;
  show_email: number;
  show_mobile: number;
  show_website: number;
};
type Workflow = {
  enabled: boolean;
  dailyTarget: number;
  categories: string[];
  language: string;
  platform: string;
  lastRunAt?: string | null;
  lastRunDate?: string;
};
type FilterState = {
  category: string;
  platform: string;
  review: string;
  saved: boolean;
  from: string;
  to: string;
  query: string;
};

const PURPOSES = [
  "Brand awareness",
  "Lead generation",
  "Product promotion",
  "Festival greeting",
  "Customer education",
  "Event promotion",
  "Dealer recruitment",
];
const STYLES = [
  "Premium photorealistic",
  "Editorial lifestyle",
  "Corporate cinematic",
  "Clean product showcase",
];
const STAGES = ["preparing", "generating", "branding", "uploading", "saving", "completed"];
const EMPTY_FILTERS: FilterState = {
  category: "",
  platform: "",
  review: "",
  saved: false,
  from: "",
  to: "",
  query: "",
};

/** Neutral, claim-free starting headline the admin can edit before generating. */
const suggestedHeadline = (category: string) =>
  category === FESTIVAL_CATEGORY
    ? "Warm wishes from Solarious Energy"
    : `${category} · Solarious Energy`;

const initialForm = () => ({
  category: "Residential Solar" as string,
  campaignTitle: "",
  audience: AUDIENCE_HINTS["Residential Solar"] || "",
  purpose: PURPOSES[0],
  language: "English",
  platform: "instagram",
  aspectRatio: "1:1",
  occasion: "Diwali",
  customOccasion: "",
  headline: suggestedHeadline("Residential Solar"),
  caption: "",
  cta: "",
  hashtags: "#SolariousEnergy #CleanEnergy",
  customPrompt: "",
  solarTheme: "High-efficiency solar power for a brighter future",
  objective: "Brand awareness and customer engagement",
  style: STYLES[0],
  logoPlacement: "top-left",
  fontSize: 58,
  color: "#ffffff",
  alignment: "middle",
  position: 68,
});

export default function AdminAiCreatives() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [items, setItems] = useState<Creative[]>([]);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const [preview, setPreview] = useState<Creative | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Creative | null>(null);
  const [draft, setDraft] = useState<Creative | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.platform) params.set("platform", filters.platform);
    if (filters.review) params.set("review", filters.review);
    if (filters.saved) params.set("saved", "true");
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [filters]);

  const load = useCallback(async () => {
    try {
      const [settingsResponse, listResponse] = await Promise.all([
        adminFetch("/api/admin/creative-settings"),
        adminFetch(`/api/admin/creatives${query}`),
      ]);
      if (!settingsResponse.ok) throw await apiError(settingsResponse, "Creative settings could not be loaded");
      if (!listResponse.ok) throw await apiError(listResponse, "Creative history could not be loaded");
      const [settingsBody, listBody] = await Promise.all([settingsResponse.json(), listResponse.json()]);
      setSettings(settingsBody.settings);
      setItems(listBody.creatives || []);
      const workflowResponse = await adminFetch("/api/admin/creative-workflow");
      if (workflowResponse.ok) {
        const workflowBody = await workflowResponse.json();
        setWorkflow(workflowBody.settings || null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Creative workspace could not be loaded.");
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => {
    const term = filters.query.trim().toLowerCase();
    if (!term) return items;
    return items.filter(item =>
      [item.campaign_title, item.headline, item.campaign_category, item.audience]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term))
    );
  }, [items, filters.query]);

  const awaitingReview = items.filter(item => item.review_status === "pending").length;
  const libraryCount = items.filter(item => item.library_saved).length;

  const patch = async (item: Creative, body: Record<string, unknown>, message: string) => {
    setError("");
    const response = await adminFetch("/api/admin/creatives", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, ...body }),
    });
    if (!response.ok) {
      setError((await apiError(response, "The creative could not be updated")).message);
      return;
    }
    setNotice(message);
    await load();
  };

  const generate = async () => {
    if (busy) return;
    if (!form.headline.trim()) {
      setError("Add a headline before generating — the studio never invents campaign copy for you.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    setStage("preparing");
    const key = crypto.randomUUID().replaceAll("-", "_");
    let stopped = false;
    let timer: number | undefined;
    const poll = async () => {
      if (stopped) return;
      try {
        const response = await adminFetch(`/api/admin/creative-generations/${key}`);
        if (response.status === 401 || response.status === 403) {
          stopped = true;
          return;
        }
        if (response.ok) {
          const data = await response.json();
          const generation = data.generation || {};
          setStage(generation.stage || "preparing");
          if (generation.status === "completed" || generation.status === "failed") {
            stopped = true;
            return;
          }
        }
      } catch {
        /* The final POST response stays authoritative while polling is best-effort. */
      }
      if (!stopped) timer = window.setTimeout(() => void poll(), 900);
    };
    try {
      const request = adminFetch("/api/admin/creatives/festival", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({
          ...form,
          campaignCategory: form.category,
          creativeType: form.category,
          textConfig: {
            fontSize: form.fontSize,
            color: form.color,
            alignment: form.alignment,
            position: form.position,
            logoPlacement: form.logoPlacement,
          },
        }),
      });
      void poll();
      const response = await request;
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = body?.error;
        const suffix = detail?.requestId ? ` Request ID: ${detail.requestId}` : "";
        throw new Error(`${detail?.message || body?.error || "Creative generation failed."}${suffix}`);
      }
      setStage("completed");
      setNotice("Creative generated, branded, uploaded and saved as a draft awaiting review.");
      await load();
      if (body.creative) setPreview(body.creative);
    } catch (cause) {
      setStage("failed");
      setError(cause instanceof Error ? cause.message : "Creative generation failed.");
    } finally {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
      setBusy(false);
    }
  };

  const remove = async (item: Creative) => {
    setConfirmDelete(null);
    const response = await adminFetch(`/api/admin/creatives?id=${item.id}`, { method: "DELETE" });
    if (response.ok) {
      setItems(current => current.filter(entry => entry.id !== item.id));
      setNotice("Creative deleted from the library.");
      if (preview?.id === item.id) setPreview(null);
    } else {
      setError((await apiError(response, "Creative could not be deleted")).message);
    }
  };

  const regenerate = async (item: Creative) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await adminFetch(`/api/admin/creatives/${item.id}/regenerate`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || body?.error || "Creative could not be regenerated.");
      setNotice("Creative regenerated, uploaded and saved.");
      await load();
      if (body.creative) setPreview(body.creative);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Creative could not be regenerated.");
    } finally {
      setBusy(false);
    }
  };

  const share = (item: Creative) =>
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        [item.headline, item.caption, item.cta, item.hashtags, item.image_url].filter(Boolean).join("\n\n")
      )}`,
      "_blank",
      "noopener,noreferrer"
    );

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) return;
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const response = await adminFetch("/api/admin/creative-settings", { method: "POST", body: data });
    setBusy(false);
    if (response.ok) {
      setNotice("Brand overlay settings saved.");
      await load();
    } else {
      setError((await apiError(response, "Brand settings could not be saved")).message);
    }
  };

  const saveWorkflow = async () => {
    if (!workflow) return;
    setWorkflowBusy(true);
    setError("");
    const response = await adminFetch("/api/admin/creative-workflow", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
    });
    if (response.ok) {
      const body = await response.json();
      setWorkflow(body.settings);
      setNotice(
        body.settings.enabled
          ? "Daily draft workflow enabled. The cron endpoint will create drafts only — nothing is published automatically."
          : "Daily draft workflow paused."
      );
    } else {
      setError((await apiError(response, "The daily workflow settings could not be saved")).message);
    }
    setWorkflowBusy(false);
  };

  const toggleWorkflowCategory = (category: string) => {
    if (!workflow) return;
    const categories = workflow.categories.includes(category)
      ? workflow.categories.filter(item => item !== category)
      : [...workflow.categories, category];
    setWorkflow({ ...workflow, categories });
  };

  const chooseCategory = (category: string) => {
    setForm(current => ({
      ...current,
      category,
      audience: AUDIENCE_HINTS[category] || "",
      headline:
        current.headline === suggestedHeadline(current.category) || !current.headline
          ? suggestedHeadline(category)
          : current.headline,
    }));
  };

  return (
    <section className="admin-panel creative-workspace">
      <header className="creative-header">
        <div>
          <span>Marketing / Generative AI</span>
          <h2>AI Creative Studio</h2>
          <p>
            Generate on-brand solar artwork for every campaign family, review it, and keep
            an auditable library. Every creative starts as a draft awaiting review.
          </p>
        </div>
        <button className="button button-ghost" onClick={() => void load()} disabled={busy}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>

      {(notice || error) && (
        <div className={error ? "creative-alert error" : "creative-alert success"} role="status">
          {error || notice}
        </div>
      )}

      <div className="studio-stats">
        <div>
          <strong>{items.length}</strong>
          <span>Creatives in view</span>
        </div>
        <div>
          <strong>{awaitingReview}</strong>
          <span>Awaiting review</span>
        </div>
        <div>
          <strong>{libraryCount}</strong>
          <span>Saved to library</span>
        </div>
        <div>
          <strong>{items.filter(item => item.status === "failed").length}</strong>
          <span>Provider failures</span>
        </div>
      </div>

      <div className="creative-builder">
        <div className="creative-form-card">
          <h3>Campaign brief</h3>
          <div className="creative-form-grid">
            <label>
              Creative category
              <select value={form.category} onChange={event => chooseCategory(event.target.value)}>
                {ALL_CREATIVE_CATEGORIES.map(category => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Campaign title
              <input
                maxLength={120}
                value={form.campaignTitle}
                onChange={event => setForm({ ...form, campaignTitle: event.target.value })}
                placeholder="e.g. Monsoon rooftop campaign"
              />
            </label>
            <label>
              Target audience
              <input
                maxLength={160}
                value={form.audience}
                onChange={event => setForm({ ...form, audience: event.target.value })}
                placeholder="e.g. Housing societies in Nashik"
              />
            </label>
            <label>
              Creative purpose
              <input
                list="creative-purposes"
                maxLength={160}
                value={form.purpose}
                onChange={event => setForm({ ...form, purpose: event.target.value })}
              />
              <datalist id="creative-purposes">
                {PURPOSES.map(purpose => (
                  <option key={purpose} value={purpose} />
                ))}
              </datalist>
            </label>
            {form.category === FESTIVAL_CATEGORY && (
              <label>
                Festival / occasion
                <select value={form.occasion} onChange={event => setForm({ ...form, occasion: event.target.value })}>
                  {FESTIVAL_OCCASIONS.map(occasion => (
                    <option key={occasion}>{occasion}</option>
                  ))}
                </select>
              </label>
            )}
            {form.category === FESTIVAL_CATEGORY && form.occasion === "Custom Occasion" && (
              <label>
                Custom occasion
                <input
                  value={form.customOccasion}
                  onChange={event => setForm({ ...form, customOccasion: event.target.value })}
                />
              </label>
            )}
            <label>
              Language
              <select value={form.language} onChange={event => setForm({ ...form, language: event.target.value })}>
                {LANGUAGES.map(language => (
                  <option key={language}>{language}</option>
                ))}
              </select>
            </label>
            <label>
              Platform
              <select value={form.platform} onChange={event => setForm({ ...form, platform: event.target.value })}>
                {PLATFORMS.map(platform => (
                  <option key={platform.id} value={platform.id}>
                    {platform.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Aspect ratio
              <select
                value={form.aspectRatio}
                onChange={event => setForm({ ...form, aspectRatio: event.target.value })}
              >
                {ASPECT_RATIOS.map(ratio => (
                  <option key={ratio.id} value={ratio.id}>
                    {ratio.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="full">
              Headline (rendered on the creative)
              <input maxLength={100} value={form.headline} onChange={event => setForm({ ...form, headline: event.target.value })} />
            </label>
            <label className="full">
              Caption
              <textarea
                rows={2}
                maxLength={180}
                value={form.caption}
                onChange={event => setForm({ ...form, caption: event.target.value })}
                placeholder="Leave blank to use the configured default greeting"
              />
            </label>
            <label className="full">
              Custom instructions for the image model
              <textarea
                rows={3}
                maxLength={800}
                value={form.customPrompt}
                onChange={event => setForm({ ...form, customPrompt: event.target.value })}
                placeholder="Composition, setting, lighting. Never include invented prices, certifications or specifications."
              />
            </label>
          </div>
          <details className="studio-advanced">
            <summary>Advanced image direction</summary>
            <div className="creative-form-grid">
              <label>
                Solar theme
                <input value={form.solarTheme} onChange={event => setForm({ ...form, solarTheme: event.target.value })} />
              </label>
              <label>
                Objective
                <input value={form.objective} onChange={event => setForm({ ...form, objective: event.target.value })} />
              </label>
              <label>
                Visual style
                <select value={form.style} onChange={event => setForm({ ...form, style: event.target.value })}>
                  {STYLES.map(style => (
                    <option key={style}>{style}</option>
                  ))}
                </select>
              </label>
              <label>
                Logo placement
                <select
                  value={form.logoPlacement}
                  onChange={event => setForm({ ...form, logoPlacement: event.target.value })}
                >
                  <option value="top-left">Top left</option>
                  <option value="top-right">Top right</option>
                </select>
              </label>
              <label>
                Call to action
                <input
                  value={form.cta}
                  onChange={event => setForm({ ...form, cta: event.target.value })}
                  placeholder={settings?.default_cta || "Contact Us Today"}
                />
              </label>
              <label>
                Hashtags
                <input value={form.hashtags} onChange={event => setForm({ ...form, hashtags: event.target.value })} />
              </label>
            </div>
          </details>
          <button
            className="button creative-generate"
            disabled={busy || !form.headline.trim()}
            onClick={() => void generate()}
          >
            {busy ? <Loader2 className="spin" size={17} /> : <ImagePlus size={17} />}
            {busy ? "Generating…" : "Generate creative"}
          </button>
        </div>

        <aside className="creative-progress-card">
          <span>Secure production pipeline</span>
          <h3>{busy ? "Creating your artwork" : "Ready to generate"}</h3>
          <p>
            Artwork comes from the configured image provider; Solarious text, logo and contact
            details are applied server-side before Cloudinary storage.
          </p>
          <ol>
            {STAGES.map((item, index) => {
              const current = Math.max(0, STAGES.indexOf(stage));
              const state =
                stage === "failed" && index === current
                  ? "failed"
                  : index < current || stage === "completed"
                    ? "done"
                    : item === stage
                      ? "active"
                      : "";
              return (
                <li className={state} key={item}>
                  <i>{index + 1}</i>
                  <span>
                    {item === "preparing"
                      ? "Preparing prompt"
                      : item === "generating"
                        ? "Generating image"
                        : item === "branding"
                          ? "Applying branding"
                          : item === "uploading"
                            ? "Uploading to Cloudinary"
                            : item === "saving"
                              ? "Saving history"
                              : "Completed"}
                  </span>
                </li>
              );
            })}
          </ol>
          <small>Provider errors are surfaced verbatim — no placeholder image is ever reported as success.</small>
        </aside>
      </div>

      {settings && (
        <details className="creative-brand-card">
          <summary>Brand overlay settings (logo, mobile, email, website)</summary>
          <form onSubmit={saveSettings} className="creative-settings">
            <label>
              Company name
              <input name="companyName" required defaultValue={settings.company_name} />
            </label>
            <label>
              Email
              <input name="email" type="email" required defaultValue={settings.email} />
            </label>
            <label>
              Mobile
              <input name="mobile" defaultValue={settings.mobile} />
            </label>
            <label>
              Website
              <input name="website" defaultValue={settings.website} />
            </label>
            <label>
              Default CTA
              <input name="defaultCta" defaultValue={settings.default_cta} />
            </label>
            <label>
              Replace logo
              <input name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" />
            </label>
            <input type="hidden" name="showEmail" value="true" />
            <input type="hidden" name="showMobile" value="true" />
            <input type="hidden" name="showWebsite" value="true" />
            <button className="button" disabled={busy}>
              Save brand settings
            </button>
          </form>
        </details>
      )}

      {workflow && (
        <details className="creative-brand-card studio-workflow">
          <summary>
            Automated daily drafts — {workflow.enabled ? "enabled" : "paused"}
          </summary>
          <p className="studio-workflow-note">
            Optional: 1–3 extra drafts per day, generated from the categories below. Drafts are never
            published and never block the weekly business activity report.
          </p>
          <div className="creative-form-grid">
            <label>
              Daily workflow
              <select
                value={workflow.enabled ? "on" : "off"}
                onChange={event => setWorkflow({ ...workflow, enabled: event.target.value === "on" })}
              >
                <option value="off">Paused</option>
                <option value="on">Enabled</option>
              </select>
            </label>
            <label>
              Drafts per day
              <select
                value={workflow.dailyTarget}
                onChange={event => setWorkflow({ ...workflow, dailyTarget: Number(event.target.value) })}
              >
                <option value={1}>1 draft</option>
                <option value={2}>2 drafts</option>
                <option value={3}>3 drafts</option>
              </select>
            </label>
            <label>
              Language
              <select
                value={workflow.language}
                onChange={event => setWorkflow({ ...workflow, language: event.target.value })}
              >
                {LANGUAGES.map(language => (
                  <option key={language}>{language}</option>
                ))}
              </select>
            </label>
            <label>
              Platform
              <select
                value={workflow.platform}
                onChange={event => setWorkflow({ ...workflow, platform: event.target.value })}
              >
                {PLATFORMS.map(platform => (
                  <option key={platform.id} value={platform.id}>
                    {platform.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="studio-workflow-categories">
            <legend>Categories it may draw from</legend>
            {ALL_CREATIVE_CATEGORIES.map(category => (
              <label key={category}>
                <input
                  type="checkbox"
                  checked={workflow.categories.includes(category)}
                  onChange={() => toggleWorkflowCategory(category)}
                />
                {category}
              </label>
            ))}
          </fieldset>
          <div className="studio-workflow-actions">
            <button className="button" disabled={workflowBusy} onClick={() => void saveWorkflow()}>
              {workflowBusy ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
              Save workflow settings
            </button>
            <small>
              {workflow.lastRunAt
                ? `Last run ${new Date(workflow.lastRunAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
                : "No automated run recorded yet"}
            </small>
          </div>
        </details>
      )}

      <div className="creative-history-head">
        <div>
          <span>Creative library</span>
          <h3>Generation history</h3>
        </div>
        <p>
          {visible.length} creative{visible.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="studio-filters">
        <label>
          Search
          <input
            value={filters.query}
            onChange={event => setFilters({ ...filters, query: event.target.value })}
            placeholder="Title, headline or audience"
          />
        </label>
        <label>
          Category
          <select value={filters.category} onChange={event => setFilters({ ...filters, category: event.target.value })}>
            <option value="">All categories</option>
            {ALL_CREATIVE_CATEGORIES.map(category => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Platform
          <select value={filters.platform} onChange={event => setFilters({ ...filters, platform: event.target.value })}>
            <option value="">All platforms</option>
            {PLATFORMS.map(platform => (
              <option key={platform.id} value={platform.id}>
                {platform.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Review status
          <select value={filters.review} onChange={event => setFilters({ ...filters, review: event.target.value })}>
            <option value="">Any status</option>
            {REVIEW_STATUSES.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} />
        </label>
        <label>
          To
          <input type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} />
        </label>
        <label className="studio-toggle">
          <input
            type="checkbox"
            checked={filters.saved}
            onChange={event => setFilters({ ...filters, saved: event.target.checked })}
          />
          Saved to library only
        </label>
        <button type="button" className="button button-ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
          Reset filters
        </button>
      </div>

      <div className="creative-card-grid">
        {visible.map(item => (
          <article className="creative-card" key={item.id}>
            <button className="creative-thumb" onClick={() => item.image_url && setPreview(item)} disabled={!item.image_url}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.headline} />
              ) : (
                <div>
                  <ImagePlus />
                  <span>{item.status === "failed" ? "Generation failed" : "Image unavailable"}</span>
                </div>
              )}
              <b>{item.status}</b>
            </button>
            <div className="creative-card-body">
              <span>
                {(item.campaign_category || item.campaign_type) + " · " + item.creative_date}
                {item.platform ? " · " + item.platform : ""}
              </span>
              <h4>{item.campaign_title || item.headline}</h4>
              <p>{item.caption}</p>
              {item.audience && <small className="creative-meta">Audience: {item.audience}</small>}
              {item.status === "failed" && (
                <small className="creative-failure">{item.error_summary || item.failure_code}</small>
              )}
              <div className="studio-review">
                <span className={`review-chip ${item.review_status}`}>{item.review_status}</span>
                <button type="button" onClick={() => void patch(item, { reviewStatus: "approved" }, "Creative approved.")}>
                  <Check size={14} /> Approve
                </button>
                <button type="button" onClick={() => void patch(item, { reviewStatus: "rejected" }, "Creative rejected.")}>
                  <X size={14} /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => void patch(item, { librarySaved: !item.library_saved }, item.library_saved ? "Removed from library." : "Saved to library.")}
                >
                  <ShieldCheck size={14} /> {item.library_saved ? "In library" : "Save to library"}
                </button>
                <button
                  type="button"
                  className={item.favourite ? "favourite on" : "favourite"}
                  aria-label="Toggle favourite"
                  onClick={() => void patch(item, { favourite: !item.favourite }, item.favourite ? "Removed from favourites." : "Marked as favourite.")}
                >
                  <Star size={14} />
                </button>
              </div>
              <div className="creative-card-actions">
                <button onClick={() => setPreview(item)} disabled={!item.image_url}>
                  <Eye size={15} />Preview
                </button>
                <a href={`/api/admin/creatives/${item.id}/download`}>
                  <Download size={15} />Download
                </a>
                <button
                  onClick={() => setDraft(item)}
                  disabled={!item.caption}
                  title="Edit caption before publishing"
                >
                  <Pencil size={15} />Edit
                </button>
                <button onClick={() => void navigator.clipboard.writeText([item.headline, item.caption, item.cta, item.hashtags].filter(Boolean).join("\n"))}>
                  <Copy size={15} />Copy
                </button>
                <button onClick={() => share(item)}>
                  <Send size={15} />WhatsApp
                </button>
                <button onClick={() => void regenerate(item)} disabled={busy}>
                  <RefreshCw size={15} />Regenerate
                </button>
                <button className="danger" onClick={() => setConfirmDelete(item)} aria-label="Delete creative">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!visible.length && (
        <div className="admin-empty">
          {items.length
            ? "No creatives match these filters."
            : "No creative history yet. Build the first campaign brief above."}
        </div>
      )}

      {confirmDelete && (
        <div className="creative-modal" role="dialog" aria-modal="true" aria-label="Confirm delete">
          <div className="studio-confirm">
            <header>
              <span>Delete creative</span>
              <button onClick={() => setConfirmDelete(null)} aria-label="Cancel">
                <X />
              </button>
            </header>
            <p>
              Permanently delete “{confirmDelete.campaign_title || confirmDelete.headline}”? The Cloudinary
              image reference and prompt history are removed with it.
            </p>
            <footer>
              <button className="button button-ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button className="button" onClick={() => void remove(confirmDelete)}>
                Delete creative
              </button>
            </footer>
          </div>
        </div>
      )}

      {draft && (
        <div className="creative-modal" role="dialog" aria-modal="true" aria-label="Edit caption">
          <div className="studio-confirm">
            <header>
              <span>Edit caption</span>
              <button onClick={() => setDraft(null)} aria-label="Close">
                <X />
              </button>
            </header>
            <textarea
              rows={5}
              maxLength={180}
              value={draft.caption}
              onChange={event => setDraft({ ...draft, caption: event.target.value })}
            />
            <input
              value={draft.headline}
              maxLength={100}
              onChange={event => setDraft({ ...draft, headline: event.target.value })}
              aria-label="Headline"
            />
            <footer>
              <button className="button button-ghost" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button
                className="button"
                onClick={() => {
                  const target = draft;
                  setDraft(null);
                  void patch(target, { caption: target.caption, headline: target.headline }, "Creative copy updated.");
                }}
              >
                Save copy
              </button>
            </footer>
          </div>
        </div>
      )}

      {preview && preview.image_url && (
        <div className="creative-modal" role="dialog" aria-modal="true" aria-label="Creative preview">
          <div>
            <header>
              <span>
                {(preview.campaign_category || preview.campaign_type) + " · " + preview.creative_date}
              </span>
              <button onClick={() => setPreview(null)} aria-label="Close preview">
                <X />
              </button>
            </header>
            <img src={preview.image_url} alt={preview.headline} />
            <footer>
              <div>
                <h3>{preview.headline}</h3>
                <p>{preview.caption}</p>
              </div>
              <a className="button" href={`/api/admin/creatives/${preview.id}/download`}>
                <Download size={16} />Download
              </a>
              <button className="button button-ghost" onClick={() => share(preview)}>
                <Send size={16} />WhatsApp
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
