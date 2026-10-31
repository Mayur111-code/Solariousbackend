/**
 * Renders the weekly business activity report with sample records so the email
 * design can be reviewed without a database, an email provider or real customer
 * data. Nothing here is sent anywhere — it only writes a local HTML file.
 *
 * Usage: npm run preview:report   (from `backend/`)
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildActivityReport } from "../services/weekly-report.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, "../../docs/weekly-report-preview.html");

const end = new Date("2026-01-09T00:00:00Z");
const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
const at = day => new Date(Date.UTC(2026, 0, 2 + day, 6, 30));

const enquiries = [
  {
    name: "Sample Residential Buyer",
    company: "",
    email: "sample.home@example.com",
    phone: "+91 90000 00001",
    product: "TOPCon 575 W rooftop",
    capacity: "5 kW",
    message: "Sample record used for design review only.",
    kind: "contact",
    status: "new",
    createdAt: at(0),
  },
  {
    name: "Sample EPC Partner",
    company: "Sample EPC Pvt Ltd",
    email: "sample.epc@example.com",
    phone: "+91 90000 00002",
    product: "Bifacial modules",
    capacity: "250 kW",
    message: "Sample quote request for preview only.",
    kind: "quote",
    status: "qualified",
    createdAt: at(1),
  },
  {
    name: "Sample Industrial Buyer",
    company: "Sample Industries",
    email: "sample.plant@example.com",
    phone: "+91 90000 00003",
    product: "HJT modules",
    capacity: "1.2 MW",
    message: "Sample project enquiry for preview only.",
    kind: "quote",
    status: "contacted",
    createdAt: at(3),
  },
  {
    name: "Sample Dealer",
    company: "Sample Solar Traders",
    email: "sample.dealer@example.com",
    phone: "+91 90000 00004",
    product: "Mono PERC",
    capacity: "",
    message: "Sample dealer enquiry for preview only.",
    kind: "contact",
    status: "closed",
    createdAt: at(5),
  },
];

const creatives = [
  {
    status: "completed",
    reviewStatus: "pending",
    campaignType: "topcon",
    headline: "Sample TOPCon campaign",
    createdAt: at(1),
  },
  {
    status: "completed",
    reviewStatus: "approved",
    campaignType: "festival",
    headline: "Sample festival campaign",
    createdAt: at(2),
  },
  {
    status: "failed",
    reviewStatus: "pending",
    campaignType: "industrial",
    headline: "Sample failed generation",
    failureCode: "PROVIDER_RATE_LIMITED",
    createdAt: at(4),
  },
];

const resources = [
  { title: "Sample datasheet upload", category: "datasheet", createdAt: at(2) },
  { title: "Sample certificate upload", category: "certificate", createdAt: at(4) },
];

const adminActivity = [
  { action: "product.update", actor: "admin", createdAt: at(1) },
  { action: "creative.settings.update", actor: "admin", createdAt: at(3) },
  { action: "gallery.publish", actor: "admin", createdAt: at(5) },
];

const report = buildActivityReport({
  enquiries,
  creatives,
  resources,
  adminActivity,
  start,
  end,
  company: {
    brand: "Solarious Energy",
    legalName: "Mayureshwar Solar Energy Pvt Ltd",
    email: "info@solariousenergy.com",
    phone: "+91 00000 00000",
    website: "www.solariousenergy.com",
    address: "Registered office as configured in Admin → Settings",
  },
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, report.html, "utf8");

console.log("Subject:", report.subject);
console.log("Counts:", JSON.stringify(report.counts, null, 2));
console.log("Preview written to", output);
