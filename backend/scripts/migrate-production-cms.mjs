import mongoose from "mongoose";

const execute = process.argv.includes("--execute"),
  uri = process.env.MONGODB_URI,
  siteUrl = String(
    process.env.PUBLIC_SITE_URL || "https://solarious-rho.vercel.app",
  ).replace(/\/$/, "");
if (!uri) throw new Error("MONGODB_URI is required.");
const plan = {
  settings: ["aboutPage", "manufacturingPage", "branding"],
  location: "Mayureshwar Solar Energy Pvt Ltd",
  product: "mono-perc",
  mode: execute ? "execute" : "dry-run",
};
console.log(JSON.stringify(plan, null, 2));
if (!execute) {
  console.log(
    "Dry run only. Re-run with --execute after taking a MongoDB backup.",
  );
  process.exit(0);
}
await mongoose.connect(uri, { dbName: process.env.DB_NAME || "solarious" });
const db = mongoose.connection.db,
  now = new Date();
await db
  .collection("businesslocations")
  .updateOne(
    {
      name: "Mayureshwar Solar Energy Pvt Ltd",
      latitude: 21.112265,
      longitude: 74.798172,
    },
    {
      $setOnInsert: {
        address: "4Q7X+4QP, Babhalde, Dhule, Maharashtra, India",
        mapsUrl:
          "https://www.google.com/maps/search/?api=1&query=21.112265%2C74.798172",
        primary: false,
        active: true,
        verificationStatus: "pending",
        displayOrder: 0,
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    { upsert: true },
  );
const defaults = {
  aboutPage: {
    eyebrow: "About Solarious",
    title: "Powering India’s Solar Future",
    intro:
      "Solarious Energy brings manufacturing discipline, product technology and project-focused support together for the evolving solar industry.",
    heroImage: "/manufacturing-line.webp",
    sections: [],
    timeline: [],
  },
  manufacturingPage: {
    eyebrow: "Production & engineering",
    title: "Precision Manufacturing. Powering Tomorrow.",
    intro:
      "Explore the processes, infrastructure, quality practices, and manufacturing capabilities behind Solarious Energy's solar module solutions.",
    heroImage: "/manufacturing-line.webp",
    sections: [],
    steps: [
      "Material Inspection",
      "Cell Sorting and Stringing",
      "Module Layup",
      "Lamination",
      "Framing and Junction Box",
      "Electrical and Quality Testing",
      "Final Inspection and Dispatch",
    ],
  },
  branding: {
    logoUrl: "/solarious-logo.png",
    alternateLogoUrl: "/solarious-logo.png",
    footerLogoUrl: "/solarious-logo.png",
    faviconUrl: "/favicon.svg",
    partnerLogoUrls: [],
  },
};
for (const [key, value] of Object.entries(defaults))
  await db
    .collection("settings")
    .updateOne(
      { key },
      {
        $setOnInsert: { key, value, createdAt: now },
        $set: { updatedAt: now },
      },
      { upsert: true },
    );
await db.collection("products").updateOne(
  { slug: "mono-perc" },
  {
    $set: {
      moduleType: "Monofacial / Bifacial",
      powerRating: "385-600 Wp",
      efficiency: "19.64%-21.70%",
      cellType: "M10 Mono PERC half-cut",
      warranty: "12-year product / source claims 30-year linear performance",
      datasheets: [
        {
          title: "Mono PERC glass-to-backsheet module series",
          url: `${siteUrl}/datasheets/solarious-g2b-sheet.pdf`,
          moduleType: "Bifacial",
          fileSize: 5847163,
        },
        {
          title: "Mono PERC monofacial module series",
          url: `${siteUrl}/datasheets/solarious-mono-facial-sheet.pdf`,
          moduleType: "Monofacial",
          fileSize: 5812793,
        },
      ],
      updatedAt: now,
    },
  },
);
console.log("Additive CMS migration completed.");
await mongoose.disconnect();
