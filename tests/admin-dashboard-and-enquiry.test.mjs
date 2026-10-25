import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("homepage quote buttons open the shared accessible popup",async()=>{
  const[header,page,modal,form]=await Promise.all([read("components/site-header.tsx"),read("app/page.tsx"),read("components/lead-form-modal.tsx"),read("components/quote-popup-form.tsx")]);
  assert.match(header,/LeadFormModal label="Get a quote"/);
  assert.match(page,/LeadFormModal label="Get a quote"/);
  assert.match(modal,/DialogContent className="quote-popup-dialog"/);
  assert.match(form,/kind: "quote"/);
  assert.match(form,/Idempotency-Key/);
  assert.match(form,/\/api\/inquiries/);
});

test("admin uses the selected dark-sidebar dashboard system with real modules",async()=>{
  const[dashboard,styles]=await Promise.all([read("components/admin-dashboard.tsx"),read("app/admin-dashboard.css")]);
  assert.match(dashboard,/All Enquiries/);
  assert.match(dashboard,/Promise\.all\(\[/);
  assert.match(dashboard,/AdminReportSettings/);
  assert.match(styles,/--admin-navy: #142536/);
  assert.match(styles,/background: #f3f6fa/);
  assert.match(styles,/\.enterprise-admin-sidebar/);
  assert.match(styles,/@media \(max-width: 900px\)/);
});

test("weekly reports use a protected daily scheduler and exact seven-day periods",async()=>{
  const[server,route,vercel]=await Promise.all([read("backend/server.mjs"),read("app/api/cron/enquiry-report/route.ts"),read("vercel.json")]);
  assert.match(server,/createdAt:\{\$gte:start,\$lt:end\}/);
  assert.match(server,/periodKey=`scheduled:/);
  assert.match(server,/7\*24\*60\*60\*1000/);
  assert.match(server,/lockExpiresAt=new Date\(Date\.now\(\)\+10\*60\*1000\)/);
  assert.match(server,/REPORT_CLAIM_EXPIRED/);
  assert.match(route,/authorization !== `Bearer \$\{secret\}`/);
  assert.match(vercel,/"schedule": "30 3 \* \* \*"/);
});
