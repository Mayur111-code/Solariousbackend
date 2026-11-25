import assert from "node:assert/strict";
import test from "node:test";
import {
  deliverQuoteNotification,
  quoteInquiryEmail,
  quoteRecipients,
  resolveQuoteProduct,
  retryPendingQuoteNotifications,
  sanitizeInquiryDetails,
} from "./quote-inquiry.mjs";

const valueAt = (row, path) =>
  path.split(".").reduce((value, part) => (value == null ? value : value[part]), row);

const setPath = (target, path, value) => {
  const keys = path.split(".");
  let cursor = target;
  for (const key of keys.slice(0, -1)) {
    if (typeof cursor[key] !== "object" || cursor[key] === null) cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[keys.at(-1)] = value;
};

const matches = (row, query = {}) =>
  Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return expected.some((clause) => matches(row, clause));
    const actual = valueAt(row, key);
    if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if ("$lt" in expected) return actual < expected.$lt;
      if ("$lte" in expected) return actual <= expected.$lte;
      if ("$gt" in expected) return actual > expected.$gt;
      if ("$in" in expected) return expected.$in.includes(actual);
      if ("$ne" in expected) return actual !== expected.$ne;
    }
    return actual === expected;
  });

const clone = (value) => structuredClone(value);

function fakeInquiry(seed = [{}]) {
  const rows = seed.map((row, index) => ({
    _id: `inquiry-${index + 1}`,
    kind: "quote",
    name: "Asha Patil",
    company: "Sunrise Solar",
    email: "asha@example.com",
    phone: "+919876543210",
    product: "Mono PERC 425–460 Wp",
    capacity: "430 Wp",
    location: "Nashik, Maharashtra",
    message: "Please quote 100 modules for a rooftop project.",
    details: {
      source: "product-page",
      productSlug: "mono-perc-425-460",
      quantity: 100,
      projectType: "New installation",
      consent: true,
    },
    createdAt: new Date("2026-11-13T08:30:00.000Z"),
    quoteNotification: { status: "pending", attempts: 0 },
    ...row,
  }));

  return {
    rows,
    async findOne(query) {
      const row = rows.find((entry) => matches(entry, query));
      return {
        lean: async () => (row ? clone(row) : null),
        ...(row ? clone(row) : {}),
      };
    },
    async findOneAndUpdate(query, update) {
      const row = rows.find((entry) => matches(entry, query));
      if (!row) return null;
      for (const [key, value] of Object.entries(update.$set || {})) setPath(row, key, value);
      for (const [key, value] of Object.entries(update.$inc || {})) {
        setPath(row, key, Number(valueAt(row, key) || 0) + value);
      }
      return { ...clone(row), toObject: () => clone(row) };
    },
    async updateOne(query, update) {
      const row = rows.find((entry) => matches(entry, query));
      if (!row) return { matchedCount: 0 };
      for (const [key, value] of Object.entries(update.$set || {})) setPath(row, key, value);
      return { matchedCount: 1 };
    },
    find(query) {
      let result = rows.filter((entry) => matches(entry, query));
      const builder = {
        sort(spec) {
          const [[key, direction]] = Object.entries(spec);
          result = [...result].sort((left, right) => {
            const a = valueAt(left, key);
            const b = valueAt(right, key);
            return a > b ? direction : a < b ? -direction : 0;
          });
          return builder;
        },
        limit(count) {
          result = result.slice(0, count);
          return builder;
        },
        then(resolve) {
          resolve(result.map(clone));
        },
      };
      return builder;
    },
  };
}

const fakeProduct = (product) => ({
  findOne() {
    return {
      lean: async () => (product ? clone(product) : null),
    };
  },
});

test("builds a responsive sales email with every required field", () => {
  const inquiry = {
    _id: "inquiry-template",
    kind: "quote",
    name: 'Asha <script>alert("x")</script>',
    company: "Sunrise Solar",
    email: "asha@example.com",
    phone: "+919876543210",
    product: "Mono PERC 425–460 Wp",
    capacity: "430 Wp",
    location: "Nashik, Maharashtra",
    message: "Please quote 100 modules.\nDelivery: December.",
    createdAt: new Date("2026-11-13T08:30:00.000Z"),
    details: { source: "product-page", productSlug: "mono-perc-425-460", productCategory: "mono-perc", quantity: 100, projectType: "New installation" },
  };
  const product = {
    id: "product-1",
    name: "Mono PERC 425–460 Wp",
    modelNumber: "SLM-M10-120-XXX",
    category: "mono-perc",
    slug: "mono-perc-425-460",
  };

  const message = quoteInquiryEmail({
    inquiry,
    product,
    siteUrl: "https://solariousenergy.com",
  });

  assert.equal(message.subject, "New Product Quote Inquiry – Mono PERC 425–460 Wp");
  assert.equal(
    message.pageUrl,
    "https://solariousenergy.com/products/mono-perc/mono-perc-425-460",
  );
  for (const value of [
    "Asha",
    "asha@example.com",
    "+919876543210",
    "Sunrise Solar",
    "Mono PERC 425–460 Wp",
    "SLM-M10-120-XXX",
    "Mono PERC",
    "100",
    "430 Wp",
    "Nashik, Maharashtra",
    "Please quote 100 modules.",
    "Product Page",
    "mono-perc-425-460",
    "New installation",
    "IST",
  ]) {
    assert.ok(message.html.includes(value) || message.text.includes(value), `missing ${value}`);
  }
  assert.ok(!message.html.includes("<script>"), "customer HTML must be escaped");
  assert.ok(message.html.includes("&lt;script&gt;"), "escaped customer HTML is expected");
  assert.ok(message.html.includes("@media only screen and (max-width: 620px)"));
  assert.ok(message.html.includes("sales@solariousenergy.com") === false, "recipient is not embedded in the body");
});

test("sanitises details and defaults the sales recipient", () => {
  const details = sanitizeInquiryDetails({
    source: "product-page",
    projectType: "New <b>installation</b>",
    consent: false,
    quantity: 25,
    nested: { password: "no" },
    "bad key!": "drop",
    list: ["a", "b", 3],
  });
  assert.deepEqual(details, {
    source: "product-page",
    projectType: "New installation",
    consent: false,
    quantity: 25,
    list: ["a", "b", "3"],
  });
  assert.deepEqual(quoteRecipients({}), ["sales@solariousenergy.com"]);
  assert.deepEqual(quoteRecipients({ SALES_EMAIL: "sales@solariousenergy.com" }), [
    "sales@solariousenergy.com",
  ]);
});

test("resolves the canonical catalogue product instead of trusting the form", async () => {
  const product = {
    _id: "p-1",
    name: "Bifacial G2B 575–600 Wp",
    modelNumber: "SLM-G2B-575",
    category: "bifacial",
    slug: "g2b-575-600",
  };
  const resolved = await resolveQuoteProduct(
    {
      kind: "quote",
      product: "Tampered product name",
      details: { productSlug: "g2b-575-600" },
    },
    fakeProduct(product),
  );
  assert.equal(resolved.name, "Bifacial G2B 575–600 Wp");
  assert.equal(resolved.category, "bifacial");
  assert.equal(resolved.modelNumber, "SLM-G2B-575");
});

test("sends once, records sent state and never duplicates a sent notification", async () => {
  const Inquiry = fakeInquiry();
  const sent = [];
  const sendEmail = async (message) => {
    sent.push(message);
    return { sent: true, provider: "smtp", messageId: "message-1" };
  };
  const deps = {
    Inquiry,
    Product: fakeProduct({ name: "Mono PERC 425–460 Wp", category: "mono-perc", slug: "mono-perc-425-460", modelNumber: "SLM-M10" }),
    sendEmail,
    env: { SALES_EMAIL: "sales@solariousenergy.com", PUBLIC_SITE_URL: "https://solariousenergy.com" },
  };

  const result = await deliverQuoteNotification(Inquiry.rows[0], deps);
  assert.equal(result.sent, true);
  assert.equal(result.status, "sent");
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["sales@solariousenergy.com"]);
  assert.equal(sent[0].replyTo, "asha@example.com");
  assert.match(sent[0].subject, /^New Product Quote Inquiry – /);
  assert.equal(Inquiry.rows[0].quoteNotification.status, "sent");
  assert.equal(Inquiry.rows[0].quoteNotification.attempts, 1);
  assert.equal(Inquiry.rows[0].quoteNotification.messageId, "message-1");

  const repeat = await deliverQuoteNotification(Inquiry.rows[0], deps);
  assert.equal(repeat.skipped, true);
  assert.equal(sent.length, 1, "a sent notification must not be emailed twice");
});

test("keeps a failed notification pending for retry and sends exactly one retry", async () => {
  const Inquiry = fakeInquiry();
  let attempts = 0;
  const sent = [];
  const deps = {
    Inquiry,
    sendEmail: async () => {
      attempts += 1;
      return { sent: false, error: "SMTP_SEND_FAILED" };
    },
    env: { SALES_EMAIL: "sales@solariousenergy.com" },
    now: new Date("2026-11-13T09:00:00.000Z"),
  };

  const first = await deliverQuoteNotification(Inquiry.rows[0], deps);
  assert.equal(first.status, "failed");
  assert.equal(Inquiry.rows[0].quoteNotification.status, "failed");
  assert.equal(Inquiry.rows[0].quoteNotification.attempts, 1);

  const retry = await retryPendingQuoteNotifications({
    ...deps,
    sendEmail: async (message) => {
      attempts += 1;
      sent.push(message);
      return { sent: true, provider: "smtp", messageId: "message-retry" };
    },
  });
  assert.equal(retry.sent, 1);
  assert.equal(attempts, 2, "the initial failed attempt plus one retry");
  assert.equal(sent.length, 1);
  assert.equal(Inquiry.rows[0].quoteNotification.status, "sent");
  assert.equal(Inquiry.rows[0].quoteNotification.attempts, 2);

  const again = await retryPendingQuoteNotifications(deps);
  assert.equal(again.considered, 0);
  assert.equal(attempts, 2, "a delivered notification is terminal");
});

test("does not send twice when the immediate send and the retry sweep overlap", async () => {
  const Inquiry = fakeInquiry();
  let sent = 0;
  let release;
  const blocked = new Promise((resolve) => {
    release = resolve;
  });
  const sendEmail = async () => {
    sent += 1;
    await blocked;
    return { sent: true, provider: "smtp", messageId: "message-overlap" };
  };
  const deps = {
    Inquiry,
    sendEmail,
    env: { SALES_EMAIL: "sales@solariousenergy.com" },
  };

  const immediate = deliverQuoteNotification(Inquiry.rows[0], deps);
  const sweep = retryPendingQuoteNotifications(deps);
  release();
  const [first, second] = await Promise.all([immediate, sweep]);

  assert.equal(first.sent, true);
  assert.equal(sent, 1, "the atomic claim must block the concurrent sweep");
  assert.equal(second.sent, 0);
});

test("a missing SMTP provider leaves the quote pending instead of failing it", async () => {
  const Inquiry = fakeInquiry();
  const deps = {
    Inquiry,
    sendEmail: async () => ({ sent: false, skipped: true, reason: "not_configured" }),
    env: { SALES_EMAIL: "sales@solariousenergy.com" },
  };

  const first = await deliverQuoteNotification(Inquiry.rows[0], deps);
  assert.equal(first.sent, false);
  assert.equal(first.status, "pending");
  assert.equal(Inquiry.rows[0].quoteNotification.status, "pending");
  assert.equal(Inquiry.rows[0].quoteNotification.lastError, "not_configured");

  let sent = 0;
  const retry = await retryPendingQuoteNotifications({
    ...deps,
    sendEmail: async () => {
      sent += 1;
      return { sent: true, provider: "smtp", messageId: "message-after-config" };
    },
  });
  assert.equal(retry.sent, 1);
  assert.equal(sent, 1);
  assert.equal(Inquiry.rows[0].quoteNotification.status, "sent");
});
