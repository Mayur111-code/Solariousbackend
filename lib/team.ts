import { backendApiUrl } from "@/lib/server-config";

export type TeamMember = {
  id: string;
  name: string;
  designation: string;
  short_info: string;
  photo_url: string;
  linkedin_url: string;
  display_order?: number;
};

/** Server-side initial team data for the About Us page. */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const backend = backendApiUrl();
  if (!backend) return [];
  try {
    const response = await fetch(`${backend}/api/team`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { members?: TeamMember[] };
    return Array.isArray(data.members) ? data.members : [];
  } catch {
    return [];
  }
}
