import { backendApiUrl } from "@/lib/server-config";

export type PublishedResource = {
  id: string;
  title: string;
  description: string;
  category: string;
  product?: string;
  previewImageUrl?: string;
  logoUrl?: string;
  issuingOrganization?: string;
  certificateNumber?: string;
  issueDate?: string;
  updated_at?: string;
  file_name: string;
  file_type: string;
  file_size: number;
};

/** Server-side published documents for the About Us gallery. */
export async function getCompanyDocuments(): Promise<PublishedResource[]> {
  const backend = backendApiUrl();
  if (!backend) return [];
  try {
    const response = await fetch(`${backend}/api/resources`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { resources?: PublishedResource[] };
    return Array.isArray(data.resources) ? data.resources : [];
  } catch {
    return [];
  }
}
