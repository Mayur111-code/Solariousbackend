/**
 * Canonical product catalogue types + seed records.
 *
 * Every numeric value below is transcribed from the Solarious datasheets in
 * `public/datasheets/` (G2B 10-page sheet and mono-facial 10-page sheet).
 * Nothing is estimated or derived except:
 *   - the "power range" / "efficiency range" labels, which are the min and max
 *     of the published values, and
 *   - wattage keys, which are the published Pmax values.
 *
 * Values that are internally inconsistent on the printed sheet are listed in
 * `reviewNotes` so the admin team can verify them before publication rather
 * than silently "correcting" the datasheet.
 *
 * The live site reads the same shape from the backend API; this file is the
 * type definition plus the offline fallback used when the API is unavailable.
 */

export type ProductCategorySlug = "mono-perc" | "hjt" | "bifacial" | "topcon";

export type ProductFaq = { question: string; answer: string };
export type ProductHighlight = { title: string; description: string };
export type ProductBenefit = { title: string; description: string };
export type ProductDocument = {
  title: string;
  url: string;
  fileSize?: number;
  kind?: "datasheet" | "warranty" | "certificate" | "installation";
};
export type SpecRow = { label: string; values: string[] };
export type SpecTable = {
  id: string;
  title: string;
  description?: string;
  columns: string[];
  rows: SpecRow[];
  note?: string;
  matrix: boolean;
};
export type ProductVariant = {
  id: string;
  label: string;
  power: number;
  voc: string;
  isc: string;
  vmp: string;
  imp: string;
  efficiency: string;
  tolerance?: string;
};
export type ProductSeo = { title?: string; description?: string; keywords?: string[] };

export type CatalogProduct = {
  slug: string;
  name: string;
  modelNumber: string;
  category: ProductCategorySlug;
  categoryLabel: string;
  technology: string;
  moduleType: string;
  status: "draft" | "published" | "archived";
  summary: string;
  description: string;
  image: string;
  gallery: string[];
  applications: string[];
  features: string[];
  highlights: ProductHighlight[];
  benefits: ProductBenefit[];
  certifications: string[];
  warranty: { product: string; performance: string; note?: string };
  powerRange: string;
  efficiencyRange: string;
  /** Printed power tolerance, e.g. "0 to +5 W". Rendered in the hero spec card. */
  powerTolerance?: string;
  /**
   * Series-specific configuration bullets taken from that module's own datasheet
   * page (cell count, reverse current, frame finish). Rendered under the shared
   * datasheet feature list.
   */
  configurationNotes?: string[];
  keySpecs: { label: string; value: string }[];
  variants: ProductVariant[];
  specTables: SpecTable[];
  documents: ProductDocument[];
  faqs: ProductFaq[];
  seo: ProductSeo;
  reviewNotes: string[];
  specsPending?: boolean;
  featured?: boolean;
  displayOrder?: number;
};

export type ProductCategory = {
  slug: ProductCategorySlug;
  label: string;
  tagline: string;
  technology: string;
  description: string;
  image: string;
  accent: string;
  highlights: string[];
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    slug: "mono-perc",
    label: "Monocorn",
    tagline: "Proven monocrystalline efficiency",
    technology: "Passivated Emitter and Rear Cell",
    description:
      "Mono PERC half-cut modules built for dependable commercial, industrial and ground-mounted output. Published series run from 385 Wp to 600 Wp across 108, 120, 132, 144 and 156 half-cut cell formats.",
    image: "/manufacturing-line.webp",
    accent: "amber",
    highlights: [
      "108 to 156 half-cut cell formats",
      "1500 V DC maximum system voltage",
      "5400 Pa snow / 2400 Pa wind load ratings",
      "12-year product + 30-year linear performance cover",
    ],
  },
  {
    slug: "hjt",
    label: "HJT",
    tagline: "Heterojunction architecture",
    technology: "Heterojunction Technology",
    description:
      "Heterojunction modules combine crystalline silicon wafers with thin-film passivation layers. Solarious publishes HJT engineering information on request while module-level datasheets are being finalised.",
    image: "/ai-solar-intelligence.webp",
    accent: "blue",
    highlights: [
      "Crystalline silicon with thin-film passivation",
      "Performance-oriented cell architecture",
      "Configuration confirmed per project",
    ],
  },
  {
    slug: "bifacial",
    label: "Bifacial",
    tagline: "Front and rear-side yield",
    technology: "Dual-side Energy Generation / G2B",
    description:
      "G2B (glass-to-backsheet) bifacial modules that use rear-side irradiance where mounting height, pitch and site albedo support it. Published series run from 385 Wp to 600 Wp with 10%, 20% and 30% rear-gain tables.",
    image: "/utility-solar.webp",
    accent: "green",
    highlights: [
      "Rear-side gain tables at 10%, 20% and 30%",
      "108, 132, 144 and 156 half-cut formats",
      "Split IP 68 junction box with bypass diodes",
      "Gain depends on albedo and plant design",
    ],
  },
  {
    slug: "topcon",
    label: "Topcorn",
    tagline: "Tunnel oxide passivated contact",
    technology: "Tunnel Oxide Passivated Contact",
    description:
      "TOPCon modules pair an ultra-thin tunnel oxide with a doped polysilicon contact. Solarious publishes TOPCon specifications on request while module-level datasheets are being finalised.",
    image: "/hero-solar-3.webp",
    accent: "violet",
    highlights: [
      "Tunnel oxide passivated contact structure",
      "Performance-focused architecture",
      "Configuration confirmed per project",
    ],
  },
];

const CERTIFICATIONS = [
  "IEC 61730",
  "IEC 62804 (PID)",
  "IEC 61701 (Salt Mist)",
  "IEC 61853",
  "ISO 9001",
  "ISO 14001",
  "ISO 45001",
  "IS 14286",
  "IS 61730-1 & 2",
];

/**
 * Printed on the cover page of every Solarious module datasheet (G2B bifacial and
 * mono-facial, pages 1/3/5/7/9). Verbatim from the PDF — nothing added.
 */
const DATASHEET_FEATURES = [
  "PID Free / Low LID Protection",
  "Positive Tolerance @ 0~5W",
  "100% In-Line Hi-Pot Testing",
  "M10 MONO-PERC",
];

/**
 * "Benefits of Solarious Solar Panels" — printed on the same cover page. The
 * descriptions below only restate values that appear elsewhere on the sheet
 * (warranty terms, tolerance, cell format, load ratings).
 */
const DATASHEET_BENEFITS: ProductBenefit[] = [
  {
    title: "Super Performance",
    description:
      "Positive-only power tolerance of 0 to +5 W with no negative tolerance on nominal power, so a delivered module never sorts below its nameplate class.",
  },
  {
    title: "Quality Materials",
    description:
      "3.2 mm high-transmission low-iron ARC tempered glass, an anodised aluminium alloy frame and an IP 68 certified junction box with bypass diodes.",
  },
  {
    title: "Advanced Technology",
    description:
      "M10 mono-PERC half-cut cells with 10BB interconnection, PID-free encapsulation and 100% in-line Hi-Pot testing on every module.",
  },
  {
    title: "Warranty and Support",
    description:
      "12-year product warranty on materials and workmanship plus a 30-year linear performance statement, claimable against the Solarious warranty certificate.",
  },
];

type RawSeries = {
  slug: string;
  name: string;
  model: string;
  category: "mono-perc" | "bifacial";
  manufacturer: "G2B" | "Mono-facial";
  cells: string;
  dimensions: string;
  weight: string;
  junctionBox: string;
  cable: string;
  maxReverseCurrent: string;
  encapsulation: string;
  backside: string;
  pitch?: { label: string; value: string }[];
  powers: string[];
  voc: string[];
  isc: string[];
  vmp: string[];
  imp: string[];
  efficiency: string[];
  gains?: { percent: string; values: string[] }[];
  reviewNotes?: string[];
  summary: string;
  features: string[];
};

const RAW_SERIES: RawSeries[] = [
  {
    slug: "g2b-575-600",
    name: "G2B 575–600 Wp",
    model: "SLB-M10-156-XXX",
    category: "bifacial",
    manufacturer: "G2B",
    cells: "MONO-PERC, 10BB, 156 (13x6x2) Half-Cut Cells",
    dimensions: "2465 mm x 1134 mm x 35 mm",
    weight: "31.5 kg",
    junctionBox: "Split, IP 68 certified, 03 bypass diodes",
    cable: "Solar cable 4 mm², 400 mm (1000 mm / 1200 mm on customisation request)",
    maxReverseCurrent: "30 A",
    encapsulation: "High volume resistivity and low MVTR",
    backside: "High transparent backsheet",
    pitch: [
      { label: "X pitch", value: "1094 mm" },
      { label: "Monitoring hole", value: "9 x 14 mm, 16 nos" },
      { label: "Drain hole", value: "3 x 6 mm, 16 nos" },
      { label: "Grounding hole", value: "4 mm, 4 nos" },
      { label: "Y pitch", value: "1600 mm (A) / 1100 mm (B)" },
    ],
    powers: ["575", "580", "585", "590", "595", "600"],
    voc: ["53.25", "53.30", "53.35", "53.40", "53.45", "53.50"],
    isc: ["13.45", "13.50", "13.65", "13.80", "13.90", "13.95"],
    vmp: ["45.90", "45.95", "46.00", "46.10", "46.20", "46.30"],
    imp: ["12.55", "12.65", "12.75", "12.80", "12.90", "13.00"],
    efficiency: ["20.75", "20.90", "21.10", "21.30", "21.50", "21.70"],
    gains: [
      { percent: "10%", values: ["632.5", "638", "643.5", "649", "654.5", "660"] },
      { percent: "20%", values: ["690", "696", "702", "708", "714", "720"] },
      { percent: "30%", values: ["747.5", "754", "760.5", "767", "773.5", "780"] },
    ],
    summary:
      "The largest G2B format in the published range: 156 half-cut mono-PERC cells over a 2465 mm frame, for utility and large ground-mounted arrays.",
    features: [
      "156 (13x6x2) half-cut mono-PERC cells",
      "30 A maximum reverse current",
      "Anodised aluminium alloy frame (silver / black)",
    ],
  },
  {
    slug: "g2b-515-555",
    name: "G2B 515–555 Wp",
    model: "SLB-M10-144-XXX",
    category: "bifacial",
    manufacturer: "G2B",
    cells: "MONO-PERC, 10BB, 144 Half-Cut",
    dimensions: "2278 mm x 1134 mm x 35 mm",
    weight: "27.5 kg",
    junctionBox: "Split, IP 68 certified, 03 bypass diodes",
    cable: "Solar cable 4 mm², 400 mm (1000 mm / 1200 mm on customisation request)",
    maxReverseCurrent: "30 A",
    encapsulation: "High volume resistivity and low MVTR",
    backside: "High transparent backsheet",
    pitch: [
      { label: "X pitch", value: "1094 mm" },
      { label: "Monitoring hole", value: "9 x 14 mm, 16 nos" },
      { label: "Drain hole", value: "3 x 6 mm, 16 nos" },
      { label: "Grounding hole", value: "4 mm, 4 nos" },
    ],
    powers: ["515", "520", "525", "530", "535", "540", "545", "550", "555"],
    voc: ["49.20", "49.24", "49.28", "49.32", "49.36", "49.40", "49.44", "49.80", "50.00"],
    isc: ["13.15", "13.26", "13.38", "13.49", "13.60", "13.72", "13.83", "13.98", "14.05"],
    vmp: ["41.72", "41.76", "41.80", "41.84", "41.88", "41.92", "41.96", "41.95", "41.99"],
    imp: ["12.34", "12.45", "12.56", "12.67", "12.77", "12.88", "12.99", "13.12", "13.22"],
    efficiency: ["19.93", "20.12", "20.31", "20.51", "20.70", "20.89", "21.09", "21.28", "21.48"],
    gains: [
      { percent: "10%", values: ["566.5", "572", "577.5", "583", "588.5", "594", "599.5", "605", "610.5"] },
      { percent: "20%", values: ["618", "624", "630", "636", "642", "648", "654", "660", "666"] },
      { percent: "30%", values: ["669.5", "676", "682.5", "689", "695.5", "702", "708.5", "715", "721.5"] },
    ],
    summary:
      "A 144 half-cut cell G2B module at 2278 mm — the widest wattage ladder in the published bifacial range.",
    features: [
      "Nine published power classes from 515 Wp to 555 Wp",
      "30 A maximum reverse current",
      "IP 68 split junction box with three bypass diodes",
    ],
  },
  {
    slug: "g2b-490-510",
    name: "G2B 490–510 Wp",
    model: "SLB-M10-132-XXX",
    category: "bifacial",
    manufacturer: "G2B",
    cells: "MONO-PERC, 10BB, 120 Half-Cut",
    dimensions: "2093 mm x 1134 mm x 35 mm",
    weight: "23 kg",
    junctionBox: "Split, IP 68 certified, 03 bypass diodes",
    cable: "Solar cable 4 mm², 400 mm (1000 mm / 1200 mm on customisation request)",
    maxReverseCurrent: "25 A",
    encapsulation: "High volume resistivity and low MVTR",
    backside: "High transparent backsheet",
    pitch: [
      { label: "X pitch", value: "1094 mm" },
      { label: "Monitoring hole", value: "9 x 14 mm, 16 nos" },
      { label: "Drain hole", value: "3 x 6 mm, 16 nos" },
      { label: "Grounding hole", value: "4 mm, 4 nos" },
    ],
    powers: ["490", "495", "500", "505", "510"],
    voc: ["45.32", "45.36", "45.70", "45.90", "46.10"],
    isc: ["13.57", "13.69", "13.72", "13.82", "13.92"],
    vmp: ["38.46", "38.50", "38.55", "38.58", "38.62"],
    imp: ["12.74", "12.86", "12.97", "13.09", "13.21"],
    efficiency: ["20.64", "20.86", "21.07", "21.28", "21.49"],
    gains: [
      { percent: "10%", values: ["544.5", "550", "555.5", "561", "566.5"] },
      { percent: "20%", values: ["594", "600", "606", "612", "618"] },
      { percent: "30%", values: ["643.5", "650", "656.5", "663", "665.5"] },
    ],
    reviewNotes: [
      "The G2B page is titled 132 half-cut (model SLB-M10-132) while its Solar Cell row prints 120 half-cut for this 2093 mm module — the mono-facial sheet lists 132 half-cut on the same frame. Confirm the cell count before quoting.",
      "The 30% rear-gain value at 510 Wp (665.5 W) is lower than the 505 Wp value (663 W) only marginally — confirm the printed table with the factory.",
    ],
    summary:
      "A 2093 mm G2B module for commercial rooftops where length and handling weight matter as much as output.",
    features: [
      "23 kg module weight for easier rooftop handling",
      "25 A maximum reverse current",
      "IP 68 split junction box with three bypass diodes",
    ],
  },
  {
    slug: "g2b-425-460",
    name: "G2B 425–460 Wp",
    model: "SLB-M10-120-XXX",
    category: "bifacial",
    manufacturer: "G2B",
    cells: "MONO-PERC, 10BB, 132 Half-Cut",
    dimensions: "1908 mm x 1134 mm x 35 mm",
    weight: "26 kg",
    junctionBox: "Potted, IP 68 certified, Schottky bypass diodes",
    cable: "Solar cable 4 mm², 400 mm (1000 mm / 1200 mm on customisation request)",
    maxReverseCurrent: "25 A",
    encapsulation: "High volume resistivity and low MVTR",
    backside: "High transparent backsheet",
    pitch: [
      { label: "X pitch", value: "1094 mm" },
      { label: "Monitoring hole", value: "9 x 14 mm, 16 nos" },
      { label: "Drain hole", value: "3 x 6 mm, 16 nos" },
      { label: "Grounding hole", value: "4 mm, 4 nos" },
    ],
    powers: ["425", "430", "435", "440", "445", "450", "455", "460"],
    voc: ["40.54", "40.06", "40.80", "40.41", "41.20", "41.40", "41.60", "41.80"],
    isc: ["13.00", "13.27", "13.34", "13.41", "13.49", "13.60", "13.69", "13.78"],
    vmp: ["34.37", "34.41", "34.45", "34.49", "34.53", "34.57", "34.61", "34.65"],
    imp: ["12.37", "12.50", "12.63", "12.76", "12.89", "13.02", "13.15", "13.28"],
    efficiency: ["19.64", "19.87", "20.10", "20.34", "20.57", "20.80", "21.03", "21.26"],
    gains: [
      { percent: "10%", values: ["467.5", "473", "478.5", "484", "489.5", "495", "500.5", "506"] },
      { percent: "20%", values: ["510", "516", "522", "528", "534", "540", "546", "552"] },
      { percent: "30%", values: ["552.5", "559", "565.5", "572", "578.5", "585", "591.5", "598"] },
    ],
    reviewNotes: [
      "The printed Open Circuit Voltage row is not monotonic (40.54, 40.06, 40.80, 40.41, 41.20 …). Values are reproduced exactly as printed; confirm the ladder before it is used for string sizing.",
      "On the G2B sheet the 490–510 Wp and 425–460 Wp pages appear to have their Solar Cell rows swapped: this 1908 mm page is titled 120 half-cut (model SLB-M10-120) but prints 132 half-cut. The mono-facial sheet lists 120 half-cut for the same 1908 mm frame — confirm with the factory.",
    ],
    summary:
      "A compact 1908 mm G2B module that keeps bifacial yield available on space-limited commercial roofs.",
    features: [
      "1908 mm module length for tighter arrays",
      "Potted IP 68 junction box with Schottky bypass diodes",
      "25 A maximum reverse current",
    ],
  },
  {
    slug: "g2b-385-415",
    name: "G2B 385–415 Wp",
    model: "SLB-M10-108-XXX",
    category: "bifacial",
    manufacturer: "G2B",
    cells: "MONO-PERC, 10BB, 108 Half-Cut",
    dimensions: "1722 mm x 1134 mm x 35 mm",
    weight: "21.5 kg",
    junctionBox: "Split, IP 68 certified, 03 bypass diodes",
    cable: "Solar cable 4 mm², 400 mm, 1200 mm — customisation option",
    maxReverseCurrent: "25 A",
    encapsulation: "High volume resistivity and low MVTR",
    backside: "High transparent backsheet",
    pitch: [
      { label: "X pitch", value: "1094 mm" },
      { label: "Monitoring hole", value: "9 x 14 mm, 16 nos" },
      { label: "Drain hole", value: "3 x 6 mm, 16 nos" },
      { label: "Grounding hole", value: "4 mm, 4 nos" },
    ],
    powers: ["385", "390", "395", "400", "405", "410", "415"],
    voc: ["36.88", "36.92", "36.96", "37.00", "37.30", "37.50", "37.70"],
    isc: ["13.28", "13.43", "13.59", "13.74", "13.81", "13.87", "13.95"],
    vmp: ["30.88", "30.92", "30.96", "31.00", "31.04", "31.08", "31.12"],
    imp: ["12.47", "12.61", "12.76", "12.90", "13.04", "13.19", "13.34"],
    efficiency: ["19.72", "19.97", "20.23", "20.48", "20.75", "21.00", "21.25"],
    gains: [
      { percent: "10%", values: ["423.5", "429", "434.5", "440", "445.5", "451", "456.5"] },
      { percent: "20%", values: ["462", "468", "474", "480", "486", "492", "498"] },
      { percent: "30%", values: ["500.5", "507", "513.5", "520", "526.5", "533", "539.5"] },
    ],
    summary:
      "The smallest G2B format at 21.5 kg — aimed at residential and light-commercial rooftops with bifacial mounting.",
    features: [
      "21.5 kg module weight",
      "1722 mm module length",
      "IP 68 split junction box with three bypass diodes",
    ],
  },
  // ---------------------------------------------------------------- mono PERC
  {
    slug: "mono-perc-575-600",
    name: "Mono PERC 575–600 Wp",
    model: "SLM-M10-156-XXX",
    category: "mono-perc",
    manufacturer: "Mono-facial",
    cells: "MONO-PERC, 10BB, 156 (13x6x2) Half-Cut Cells",
    dimensions: "2465 mm x 1134 mm x 35 mm",
    weight: "31.5 kg",
    junctionBox: "Split, IP 68 certified, 3 diodes",
    cable: "Solar cable 4 mm², 400 mm (1000 mm / 1200 mm on customisation request)",
    maxReverseCurrent: "25 A",
    encapsulation: "Ultra-clear PID-free EVA (ethylene-vinyl-acetate)",
    backside: "UV-protected reflective backsheet",
    pitch: [
      { label: "X pitch", value: "1094 mm" },
      { label: "Monitoring hole", value: "9 x 14 mm, 16 nos" },
      { label: "Drain hole", value: "3 x 6 mm, 16 nos" },
      { label: "Grounding hole", value: "4 mm, 4 nos" },
      { label: "Y pitch", value: "1600 mm (A) / 1100 mm (B)" },
    ],
    powers: ["575", "580", "585", "590", "595", "600"],
    voc: ["53.25", "53.30", "53.35", "53.40", "53.45", "53.50"],
    isc: ["13.45", "13.50", "13.65", "13.80", "13.90", "13.95"],
    vmp: ["45.90", "45.95", "46.00", "46.10", "46.20", "46.30"],
    imp: ["12.55", "12.65", "12.75", "12.80", "12.90", "13.00"],
    efficiency: ["20.75", "20.90", "21.10", "21.30", "21.50", "21.70"],
    summary:
      "The highest-output mono-facial format: 156 half-cut cells on a 2465 mm frame for utility-scale and large industrial arrays.",
    features: [
      "156 (13x6x2) half-cut mono-PERC cells",
      "Ultra-clear PID-free EVA encapsulation",
      "UV-protected reflective backsheet",
    ],
  },
  {
    slug: "mono-perc-515-555",
    name: "Mono PERC 515–555 Wp",
    model: "SLM-M10-144-XXX",
    category: "mono-perc",
    manufacturer: "Mono-facial",
    cells: "MONO-PERC, 10BB, 144 Half-Cut",
    dimensions: "2278 mm x 1134 mm x 35 mm",
    weight: "27.5 kg",
    junctionBox: "Split, IP 68 certified, 3 diodes",
    cable: "Solar cable 4 mm², 400 mm (1000 mm / 1200 mm on customisation request)",
    maxReverseCurrent: "25 A",
    encapsulation: "Ultra-clear PID-free EVA (ethylene-vinyl-acetate)",
    backside: "UV-protected reflective backsheet",
    pitch: [
      { label: "X pitch", value: "1094 mm" },
      { label: "Monitoring hole", value: "9 x 14 mm, 16 nos" },
      { label: "Drain hole", value: "3 x 6 mm, 16 nos" },
      { label: "Grounding hole", value: "4 mm, 4 nos" },
    ],
    powers: ["515", "520", "525", "530", "535", "540", "545", "550", "555"],
    voc: ["49.20", "49.24", "49.28", "49.32", "49.36", "49.40", "49.44", "49.80", "50.00"],
    isc: ["13.15", "13.26", "13.38", "13.49", "13.60", "13.72", "13.83", "13.98", "14.05"],
    vmp: ["41.72", "41.76", "41.80", "41.84", "41.88", "41.92", "41.96", "41.95", "41.99"],
    imp: ["12.34", "12.45", "12.56", "12.67", "12.77", "12.88", "12.99", "13.12", "13.22"],
    efficiency: ["19.93", "20.12", "20.31", "20.51", "20.70", "20.89", "21.09", "21.28", "21.48"],
    summary:
      "A nine-class 144 half-cut mono-PERC ladder for commercial and industrial rooftops with predictable string sizing.",
    features: [
      "Nine published power classes, 515 Wp to 555 Wp",
      "2278 mm module length",
      "PID-free EVA encapsulation",
    ],
  },
  {
    slug: "mono-perc-490-510",
    name: "Mono PERC 490–510 Wp",
    model: "SLM-M10-132-XXX",
    category: "mono-perc",
    manufacturer: "Mono-facial",
    cells: "MONO-PERC, 10BB, 132 Half-Cut",
    dimensions: "2093 mm x 1134 mm x 35 mm",
    weight: "26 kg",
    junctionBox: "IP 68 certified, 3 diodes",
    cable: "Solar cable 4 mm², 400 mm (1000 mm / 1200 mm on customisation request)",
    maxReverseCurrent: "25 A",
    encapsulation: "Ultra-clear PID-free EVA (ethylene-vinyl-acetate)",
    backside: "UV-protected reflective backsheet",
    pitch: [
      { label: "X pitch", value: "1094 mm" },
      { label: "Monitoring hole", value: "9 x 14 mm, 16 nos" },
      { label: "Drain hole", value: "3 x 6 mm, 16 nos" },
      { label: "Grounding hole", value: "4 mm, 4 nos" },
    ],
    powers: ["490", "495", "500", "505", "510"],
    voc: ["45.32", "45.36", "45.70", "45.90", "46.10"],
    isc: ["13.57", "13.69", "13.72", "13.82", "13.92"],
    vmp: ["38.46", "38.50", "38.55", "38.58", "38.62"],
    imp: ["12.74", "12.86", "12.97", "13.09", "13.21"],
    efficiency: ["20.64", "20.86", "21.07", "21.28", "21.49"],
    summary:
      "A 2093 mm mono-PERC module that balances roof coverage with a manageable 26 kg handling weight.",
    features: [
      "2093 mm module length",
      "Five published power classes",
      "PID-free EVA encapsulation",
    ],
  },
  {
    slug: "mono-perc-425-460",
    name: "Mono PERC 425–460 Wp",
    model: "SLM-M10-120-XXX",
    category: "mono-perc",
    manufacturer: "Mono-facial",
    cells: "MONO-PERC, 10BB, 120 Half-Cut",
    dimensions: "1908 mm x 1134 mm x 35 mm",
    weight: "23 kg",
    junctionBox: "IP 68 certified, 3 diodes",
    cable: "Solar cable 4 mm², 400 mm (1000 mm / 1200 mm on customisation request)",
    maxReverseCurrent: "25 A",
    encapsulation: "Ultra-clear PID-free EVA (ethylene-vinyl-acetate)",
    backside: "UV-protected reflective backsheet",
    pitch: [
      { label: "X pitch", value: "1094 mm" },
      { label: "Monitoring hole", value: "9 x 14 mm, 16 nos" },
      { label: "Drain hole", value: "3 x 6 mm, 16 nos" },
      { label: "Grounding hole", value: "4 mm, 4 nos" },
      { label: "Y pitch", value: "1200 mm (A) / 900 mm (B)" },
    ],
    powers: ["425", "430", "435", "440", "445", "450", "455", "460"],
    voc: ["40.54", "40.06", "40.80", "40.41", "41.20", "41.40", "41.60", "41.80"],
    isc: ["13.00", "13.27", "13.34", "13.41", "13.49", "13.60", "13.69", "13.78"],
    vmp: ["34.37", "34.41", "34.45", "34.49", "34.53", "34.57", "34.61", "34.65"],
    imp: ["12.37", "12.50", "12.63", "12.76", "12.89", "13.02", "13.15", "13.28"],
    efficiency: ["19.64", "19.87", "20.10", "20.34", "20.57", "20.80", "21.03", "21.26"],
    reviewNotes: [
      "The printed Open Circuit Voltage row is not monotonic (40.54, 40.06, 40.80, 40.41, 41.20 …). Values are reproduced exactly as printed; confirm before string sizing.",
    ],
    summary:
      "A 1908 mm mono-PERC module for commercial rooftops where array layout is the limiting factor.",
    features: [
      "23 kg module weight",
      "1908 mm module length",
      "PID-free EVA encapsulation",
    ],
  },
  {
    slug: "mono-perc-385-415",
    name: "Mono PERC 385–415 Wp",
    model: "SLM-M10-108-XXX",
    category: "mono-perc",
    manufacturer: "Mono-facial",
    cells: "MONO-PERC, 10BB, 108 Half-Cut",
    dimensions: "1722 mm x 1134 mm x 35 mm",
    weight: "21.5 kg",
    junctionBox: "IP 68 certified, 3 diodes",
    cable: "Solar cable 4 mm², 400 mm, 1200 mm — customisation option",
    maxReverseCurrent: "25 A",
    encapsulation: "Ultra-clear PID-free EVA (ethylene-vinyl-acetate)",
    backside: "UV-protected reflective backsheet",
    pitch: [
      { label: "X pitch", value: "1094 mm" },
      { label: "Monitoring hole", value: "9 x 14 mm, 16 nos" },
      { label: "Drain hole", value: "3 x 6 mm, 16 nos" },
      { label: "Grounding hole", value: "4 mm, 4 nos" },
      { label: "Y pitch", value: "1200 mm (A) / 900 mm (B)" },
    ],
    powers: ["385", "390", "395", "400", "405", "410", "415"],
    voc: ["36.88", "36.92", "36.96", "37.00", "37.30", "37.50", "37.70"],
    isc: ["13.28", "13.43", "13.59", "13.74", "13.81", "13.87", "13.95"],
    vmp: ["30.88", "30.92", "30.96", "31.00", "31.04", "31.08", "31.12"],
    imp: ["12.47", "12.61", "12.76", "12.90", "13.04", "13.19", "13.34"],
    efficiency: ["19.72", "19.97", "20.23", "20.48", "20.75", "21.00", "21.25"],
    summary:
      "The lightest published mono-PERC format at 21.5 kg, suited to residential and light-commercial roofs.",
    features: [
      "21.5 kg module weight",
      "1722 mm module length",
      "Seven published power classes",
    ],
  },
];

const rangeLabel = (values: string[], suffix: string) => {
  const numbers = values.map(Number).filter((value) => Number.isFinite(value));
  if (!numbers.length) return "";
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return min === max ? `${min}${suffix}` : `${min}–${max}${suffix}`;
};

const toVariants = (series: RawSeries): ProductVariant[] =>
  series.powers.map((power, index) => ({
    id: power,
    label: `${power} Wp`,
    power: Number(power),
    voc: series.voc[index] ?? "",
    isc: series.isc[index] ?? "",
    vmp: series.vmp[index] ?? "",
    imp: series.imp[index] ?? "",
    efficiency: series.efficiency[index] ?? "",
    tolerance: "0 to +5 W",
  }));

const toSpecTables = (series: RawSeries): SpecTable[] => {
  const columns = series.powers.map((power) => `${power} Wp`);
  const tables: SpecTable[] = [
    {
      id: "electrical",
      title: "Electrical specification (STC)",
      description:
        "Under Standard Test Conditions: irradiance 1000 W/m², spectrum AM 1.5, cell temperature 25 °C.",
      columns,
      matrix: true,
      rows: [
        { label: "Maximum power (Pmp)", values: series.powers },
        { label: "Open circuit voltage (Voc)", values: series.voc },
        { label: "Short circuit current (Isc)", values: series.isc },
        { label: "Maximum power voltage (Vmp)", values: series.vmp },
        { label: "Maximum power current (Imp)", values: series.imp },
        { label: "Module efficiency (%)", values: series.efficiency },
        { label: "Power tolerance (positive only)", values: series.powers.map(() => "0 to +5 W") },
      ],
      note: "Except Pmax, all parameters carry a tolerance of ±3%. No negative power tolerance in nominal power.",
    },
  ];

  if (series.gains?.length) {
    tables.push({
      id: "bifacial-gain",
      title: "Bifacial gain",
      description:
        "Estimated rear-side contribution at 10%, 20% and 30% irradiance gain. Power bifaciality (Pmax rear / Pmax front) is tested under STC.",
      columns,
      matrix: true,
      rows: series.gains.map((gain) => ({ label: `Rear gain ${gain.percent}`, values: gain.values })),
      note: "Bifacial gains depend on plant design and the albedo of the installation site.",
    });
  }

  tables.push(
    {
      id: "thermal",
      title: "Thermal data",
      columns: ["Value"],
      matrix: false,
      rows: [
        { label: "Temperature coefficient — Voc", values: ["-0.28 %/°C"] },
        { label: "Temperature coefficient — Isc", values: ["0.05 %/°C"] },
        { label: "Temperature coefficient — Pmax", values: ["-0.35 %/°C"] },
        { label: "NOCT (nominal operating cell temperature)", values: ["45 °C ± 2 °C"] },
      ],
    },
    {
      id: "mechanical",
      title: "Mechanical specification",
      columns: ["Specification"],
      matrix: false,
      rows: [
        { label: "Solar cell", values: [series.cells] },
        { label: "Encapsulation", values: [series.encapsulation] },
        { label: "Backside", values: [series.backside] },
        { label: "Frame", values: ["Anodised aluminium alloy (silver / black)"] },
        {
          label: "Front glass",
          values: ["3.2 mm, high transmission, low iron, ARC tempered glass"],
        },
        { label: "Dimensions (L × W × H)", values: [series.dimensions] },
        { label: "Weight", values: [series.weight] },
        { label: "Junction box", values: [series.junctionBox] },
        { label: "Cable", values: [series.cable] },
        { label: "Connectors", values: ["MC4-compatible connectors"] },
        { label: "Application class", values: ["Class A"] },
        { label: "Electrical safety class", values: ["Class II"] },
        ...(series.pitch ?? []).map((item) => ({ label: item.label, values: [item.value] })),
      ],
      note: "Module dimensions carry a ±2 mm tolerance.",
    },
    {
      id: "operating",
      title: "Operating conditions",
      columns: ["Value"],
      matrix: false,
      rows: [
        { label: "Operating temperature range", values: ["-40 °C to 85 °C"] },
        { label: "Maximum system voltage", values: ["1500 V DC"] },
        { label: "Maximum snow load", values: ["5400 Pa"] },
        { label: "Maximum wind load", values: ["2400 Pa"] },
        {
          label: "Hail resistance",
          values: ["Max 24 mm at 83 km/h impact speed"],
        },
        { label: "Protection class against electric shock", values: ["Class II"] },
        { label: "Maximum reverse current", values: [series.maxReverseCurrent] },
      ],
    },
    {
      id: "packing",
      title: "Packing configuration",
      columns: ['20" GP', '40" HQ'],
      matrix: false,
      rows: [
        { label: "Modules per pallet", values: ["28", "32"] },
        { label: "Pallets per container", values: ["10", "20"] },
        { label: "Modules per container", values: ["280", "640"] },
      ],
    },
  );

  return tables;
};

const buildSeriesProduct = (series: RawSeries): CatalogProduct => {
  const category = PRODUCT_CATEGORIES.find((item) => item.slug === series.category)!;
  const wattage = rangeLabel(series.powers, " Wp");
  const efficiency = rangeLabel(series.efficiency, "%");
  const datasheet: ProductDocument = {
    title: `${series.name} datasheet (PDF)`,
    url:
      series.category === "bifacial"
        ? "/datasheets/solarious-g2b-sheet.pdf"
        : "/datasheets/solarious-mono-facial-sheet.pdf",
    fileSize: 5847163,
    kind: "datasheet",
  };

  return {
    slug: series.slug,
    name: series.name,
    modelNumber: series.model,
    category: series.category,
    categoryLabel: category.label,
    technology: category.technology,
    moduleType: series.category === "bifacial" ? "Bifacial" : "Monofacial",
    status: "published",
    summary: series.summary,
    description: `${series.summary} Published STC values run from ${series.powers[0]} Wp to ${series.powers[series.powers.length - 1]} Wp with module efficiency of ${series.efficiency[0]}% to ${series.efficiency[series.efficiency.length - 1]}%. All figures on this page are taken from the Solarious ${series.category === "bifacial" ? "G2B bifacial" : "mono-facial"} datasheet.`,
    image: series.category === "bifacial" ? "/utility-solar.webp" : "/manufacturing-line.webp",
    gallery: [
      series.category === "bifacial" ? "/utility-solar.webp" : "/manufacturing-line.webp",
      "/hero-solar-2.webp",
      "/hero-solar-4.webp",
    ],
    applications:
      series.category === "bifacial"
        ? ["Utility-scale plants", "Ground-mounted arrays", "High-albedo sites"]
        : ["Commercial rooftop", "Industrial rooftops", "Ground-mounted arrays"],
    features: DATASHEET_FEATURES,
    configurationNotes: series.features,
    highlights: [
      {
        title: `${wattage} power range`,
        description: `${series.powers.length} published power classes, from ${series.powers[0]} Wp to ${series.powers[series.powers.length - 1]} Wp.`,
      },
      {
        title: `${efficiency} efficiency`,
        description: "Module efficiency measured under Standard Test Conditions.",
      },
      {
        title: `1500 V DC system`,
        description: `${series.weight} module on a ${series.dimensions} frame, rated to 1500 V DC system voltage.`,
      },
      {
        title: "12 + 30 year cover",
        description:
          "12-year product warranty on materials and workmanship, with a 30-year linear performance statement on the datasheet.",
      },
    ],
    benefits: DATASHEET_BENEFITS,
    certifications: CERTIFICATIONS,
    warranty: {
      product: "12 years on materials and workmanship",
      performance: "30-year linear performance statement on the datasheet",
      note:
        "The plotted linear-performance chart on the datasheet ends at year 27 (83.5%). Confirm the full warranty clause against the Solarious warranty certificate before quoting.",
    },
    powerRange: wattage,
    efficiencyRange: efficiency,
    powerTolerance: "0 to +5 W",
    keySpecs: [
      { label: "Power range", value: wattage },
      { label: "Module efficiency", value: efficiency },
      { label: "Cell format", value: series.cells.replace("MONO-PERC, 10BB, ", "") },
      { label: "Dimensions", value: series.dimensions.replace(/ x /g, " × ") },
      { label: "Weight", value: series.weight },
      { label: "Warranty", value: "12-year product / 30-year linear" },
    ],
    variants: toVariants(series),
    specTables: toSpecTables(series),
    documents: [datasheet],
    faqs: [
      {
        question: `Which power classes are available in the ${series.name} series?`,
        answer: `The published sheet lists ${series.powers.length} power classes: ${series.powers
          .map((power) => `${power} Wp`)
          .join(", ")}. Availability per order must be confirmed with the Solarious sales team.`,
      },
      {
        question: "Is the module efficiency guaranteed?",
        answer:
          "Efficiency values are measured under Standard Test Conditions (1000 W/m², AM 1.5, 25 °C). Except for Pmax, parameters carry a ±3% tolerance; there is no negative tolerance on nominal power.",
      },
      {
        question: "What warranty applies to this module?",
        answer:
          "The datasheet states a 12-year product warranty on materials and workmanship plus a 30-year linear performance statement. Claim terms follow the Solarious Energy warranty certificate.",
      },
      {
        question: series.category === "bifacial"
          ? "How much extra power can the rear side produce?"
          : "Can this module be used on a utility-scale plant?",
        answer:
          series.category === "bifacial"
            ? "The datasheet publishes rear-side output at 10%, 20% and 30% gain. Actual gain depends on mounting height, pitch, albedo and plant design, so it must be modelled for the specific site."
            : "Yes — with a 1500 V DC maximum system voltage and 5400 Pa snow / 2400 Pa wind ratings, the module is used in commercial and ground-mounted designs. String sizing must follow the final datasheet values.",
      },
      {
        question: "Where can I download the datasheet?",
        answer:
          "The complete PDF datasheet is available in the documents section of this page, and from the Solarious resources library.",
      },
    ],
    seo: {
      title: `${series.name} ${series.category === "bifacial" ? "Bifacial" : "Monocorn"} Solar Module`,
      description: `${series.name} — ${wattage}, ${efficiency} module efficiency, ${series.dimensions}. Solarious ${series.model} datasheet values.`,
      keywords: [series.name, series.model, category.label, "solar module", "Solarious"],
    },
    reviewNotes: series.reviewNotes ?? [],
    displayOrder: RAW_SERIES.indexOf(series),
  };
};

const pendingProducts: CatalogProduct[] = [
  {
    slug: "hjt-series",
    name: "HJT Series",
    modelNumber: "HJT — datasheet pending",
    category: "hjt",
    categoryLabel: "HJT",
    technology: "Heterojunction Technology",
    moduleType: "Monofacial / Bifacial",
    status: "published",
    summary:
      "Heterojunction modules that pair crystalline silicon wafers with thin-film passivation. Published electrical data is being finalised.",
    description:
      "Heterojunction (HJT) cells combine a crystalline silicon wafer with intrinsic and doped thin-film layers to passivate the surfaces. Solarious publishes HJT module-level datasheets once the factory releases verified values — this page intentionally carries no numeric specification until then.",
    image: "/ai-solar-intelligence.webp",
    gallery: ["/ai-solar-intelligence.webp", "/hero-solar-5.webp"],
    applications: ["Space-constrained sites", "Premium rooftops", "Specialised projects"],
    features: [
      "Heterojunction cell structure",
      "Crystalline silicon with thin-film passivation",
      "Configuration confirmed per project",
    ],
    highlights: [
      { title: "Datasheet pending", description: "Numeric values are not published for HJT yet." },
      { title: "Engineering review", description: "Selection is confirmed with the technical team." },
    ],
    benefits: [
      {
        title: "Technology-led selection",
        description:
          "HJT is offered for projects where the cell architecture is a stated requirement. Final configuration, power classes and warranty terms are confirmed in writing.",
      },
    ],
    certifications: ["ISO 9001", "ISO 14001", "ISO 45001"],
    warranty: {
      product: "Confirmed per confirmed module datasheet",
      performance: "Confirmed per confirmed module datasheet",
    },
    powerRange: "Specifications on request",
    efficiencyRange: "Specifications on request",
    keySpecs: [
      { label: "Technology", value: "Heterojunction" },
      { label: "Published datasheet", value: "Pending" },
      { label: "Warranty", value: "On request" },
    ],
    variants: [],
    specTables: [],
    documents: [],
    faqs: [
      {
        question: "Why are HJT specifications missing?",
        answer:
          "Solarious only publishes numeric module data taken from an approved datasheet. The HJT sheet has not been released yet, so this page shows the technology description and invites a technical enquiry instead.",
      },
    ],
    seo: {
      title: "HJT Solar Modules",
      description: "Heterojunction (HJT) solar modules from Solarious Energy — specifications on request.",
    },
    reviewNotes: ["HJT module datasheet not supplied — admin must upload the factory sheet before numeric specs can be published."],
    specsPending: true,
    displayOrder: 1,
  },
  {
    slug: "topcon-series",
    name: "TOPCon Series",
    modelNumber: "TOPCon — datasheet pending",
    category: "topcon",
    categoryLabel: "TOPCon",
    technology: "Tunnel Oxide Passivated Contact",
    moduleType: "Monofacial / Bifacial",
    status: "published",
    summary:
      "TOPCon modules built on an ultra-thin tunnel oxide and doped polysilicon contact layer. Published electrical data is being finalised.",
    description:
      "TOPCon (tunnel oxide passivated contact) cells place an ultra-thin tunnel oxide beneath a doped polysilicon layer to reduce contact recombination. Solarious publishes TOPCon module-level datasheets once the factory releases verified values — this page intentionally carries no numeric specification until then.",
    image: "/hero-solar-3.webp",
    gallery: ["/hero-solar-3.webp", "/hero-solar-1.webp"],
    applications: ["Commercial rooftop", "Industrial rooftops", "Utility-scale plants"],
    features: [
      "Tunnel oxide passivated contact structure",
      "Performance-focused architecture",
      "Configuration confirmed per project",
    ],
    highlights: [
      { title: "Datasheet pending", description: "Numeric values are not published for TOPCon yet." },
      { title: "Engineering review", description: "Selection is confirmed with the technical team." },
    ],
    benefits: [
      {
        title: "Right architecture for the project",
        description:
          "TOPCon is positioned for projects prioritising efficiency and energy yield. Final power classes, dimensions and warranty terms are confirmed in writing.",
      },
    ],
    certifications: ["ISO 9001", "ISO 14001", "ISO 45001"],
    warranty: {
      product: "Confirmed per confirmed module datasheet",
      performance: "Confirmed per confirmed module datasheet",
    },
    powerRange: "Specifications on request",
    efficiencyRange: "Specifications on request",
    keySpecs: [
      { label: "Technology", value: "Tunnel oxide passivated contact" },
      { label: "Published datasheet", value: "Pending" },
      { label: "Warranty", value: "On request" },
    ],
    variants: [],
    specTables: [],
    documents: [],
    faqs: [
      {
        question: "Why are TOPCon specifications missing?",
        answer:
          "Solarious only publishes numeric module data taken from an approved datasheet. The TOPCon sheet has not been released yet, so this page shows the technology description and invites a technical enquiry instead.",
      },
    ],
    seo: {
      title: "TOPCon Solar Modules",
      description: "TOPCon solar modules from Solarious Energy — specifications on request.",
    },
    reviewNotes: ["TOPCon module datasheet not supplied — admin must upload the factory sheet before numeric specs can be published."],
    specsPending: true,
    displayOrder: 2,
  },
];

export const catalogProducts: CatalogProduct[] = [
  ...RAW_SERIES.map(buildSeriesProduct),
  ...pendingProducts,
];

export const catalogByCategory = (category: string) =>
  catalogProducts.filter((product) => product.category === category);

export const catalogProduct = (slug: string) =>
  catalogProducts.find((product) => product.slug === slug);

export const categoryBySlug = (slug: string) =>
  PRODUCT_CATEGORIES.find((category) => category.slug === slug);
