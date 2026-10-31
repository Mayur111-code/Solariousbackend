import "server-only";
import { backendApiUrl } from "@/lib/server-config";

export type CertificationRecord = {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryLabel: string;
  standards: string[];
  issuingAuthority: string;
  description: string;
  scope: string;
  auditRelevance: string;
  verificationStatus: string;
  verified: boolean;
  certificateNumber: string;
  documentUrl: string;
  logoUrl: string;
  issuedAt: string | null;
  expiresAt: string | null;
  expired: boolean;
  displayOrder: number;
};

export type CertificationGroup = {
  id: string;
  label: string;
  description: string;
  records: CertificationRecord[];
};

export type CertificationRegistry = {
  groups: CertificationGroup[];
  stats: { total: number; published: number; verified: number; pending: number; expired: number };
  options: { categories: { id: string; label: string; description: string }[] };
};

/**
 * Framework scaffolds: the standards this brand intends to hold, shown as
 * "documentation pending" until an administrator uploads a real certificate.
 */
export const certificationFrameworks = [
  {
    id: "bis",
    label: "BIS Certification",
    description: "Bureau of Indian Standards registration for crystalline silicon PV modules.",
    standards: ["IS 14286", "IS/IEC 61730"],
    scope: "Crystalline silicon terrestrial photovoltaic modules for grid-connected and off-grid use.",
    auditRelevance: "Required for compliance with Indian quality control orders on solar PV modules.",
  },
  {
    id: "almm",
    label: "ALMM Enlistment",
    description: "Approved List of Models and Manufacturers, Ministry of New and Renewable Energy.",
    standards: ["MNRE ALMM List-I"],
    scope: "Module models listed for government-subsidised and approved projects.",
    auditRelevance: "Determines eligibility for centrally and state-notified solar programmes.",
  },
  {
    id: "iec",
    label: "IEC International Standards",
    description: "Design qualification, safety and environmental test standards.",
    standards: ["IEC 61215", "IEC 61730", "IEC 62804", "IEC 61701"],
    scope: "Design qualification, safety qualification, PID resistance and salt-mist corrosion testing.",
    auditRelevance: "Expected baseline evidence in lender and independent engineer due diligence.",
  },
  {
    id: "iso",
    label: "ISO Management Standards",
    description: "Quality, environmental and occupational health management systems.",
    standards: ["ISO 9001:2015", "ISO 14001:2015", "ISO 45001:2018"],
    scope: "Quality, environmental and occupational health and safety management systems.",
    auditRelevance: "Supports supplier qualification and factory audit checklists.",
  },
];

const fallbackRegistry: CertificationRegistry = {
  groups: certificationFrameworks.map((framework) => ({
    id: framework.id,
    label: framework.label,
    description: framework.description,
    records: [
      {
        id: `framework-${framework.id}`,
        code: "",
        name: framework.label,
        category: framework.id,
        categoryLabel: framework.label,
        standards: framework.standards,
        issuingAuthority: "",
        description: framework.description,
        scope: framework.scope,
        auditRelevance: framework.auditRelevance,
        verificationStatus: "unverified",
        verified: false,
        certificateNumber: "",
        documentUrl: "",
        logoUrl: "",
        issuedAt: null,
        expiresAt: null,
        expired: false,
        displayOrder: 0,
      },
    ],
  })),
  stats: { total: 0, published: 0, verified: 0, pending: 0, expired: 0 },
  options: { categories: certificationFrameworks.map(({ id, label, description }) => ({ id, label, description })) },
};

/** Load the published certification registry, falling back to framework scaffolds. */
export async function getCertifications(): Promise<CertificationRegistry> {
  const backend = backendApiUrl();
  if (!backend) return fallbackRegistry;
  try {
    const response = await fetch(`${backend}/api/certifications`, { cache: "no-store" });
    if (!response.ok) return fallbackRegistry;
    const data = (await response.json()) as Partial<CertificationRegistry>;
    if (!Array.isArray(data.groups) || !data.groups.length) {
      return { ...fallbackRegistry, options: data.options ?? fallbackRegistry.options };
    }
    return {
      groups: data.groups as CertificationGroup[],
      stats: data.stats ?? fallbackRegistry.stats,
      options: data.options ?? fallbackRegistry.options,
    };
  } catch {
    return fallbackRegistry;
  }
}

export type PerformanceMetric = { label: string; value: string; description: string; published: boolean; displayOrder: number };

export const defaultPerformanceMetrics: { verified: boolean; note: string; metrics: PerformanceMetric[] } = {
  verified: false,
  note: "Module specifications are indicative and vary by model and configuration. Confirm against the current approved datasheet before specifying.",
  metrics: [
    { label: "High-Density Output", value: "Up to 710W+", description: "N-Type TOPCon & HJT architecture", published: true, displayOrder: 0 },
    { label: "Peak Efficiency", value: "22.8%", description: "Low temperature coefficient and weak-light yield", published: true, displayOrder: 1 },
    { label: "Output Warranty", value: "30 Years", description: "Linear output warranty", published: true, displayOrder: 2 },
    { label: "Quality Inspection", value: "100% EL Tested", description: "Multi-stage quality checks", published: true, displayOrder: 3 },
  ],
};

/** Homepage performance metrics, configurable from the admin dashboard. */
export async function getPerformanceMetrics() {
  const backend = backendApiUrl();
  if (!backend) return defaultPerformanceMetrics;
  try {
    const response = await fetch(`${backend}/api/site-settings/performanceMetrics`, { cache: "no-store" });
    if (!response.ok) return defaultPerformanceMetrics;
    const data = (await response.json()) as { value?: { verified?: boolean; note?: string; metrics?: PerformanceMetric[] } | null };
    const metrics = (data.value?.metrics ?? []).filter((metric) => metric.published !== false);
    if (!metrics.length) return defaultPerformanceMetrics;
    return { verified: data.value?.verified === true, note: data.value?.note ?? "", metrics };
  } catch {
    return defaultPerformanceMetrics;
  }
}
