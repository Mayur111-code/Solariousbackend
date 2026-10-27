import type { Metadata } from "next";
import SolarRecommendationForm from "@/components/solar-recommendation-form";
import ToolPageShell from "@/components/tool-page-shell";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";

export const metadata: Metadata = { title: "Personalized Solar Recommendation" };

export default function Page() {
  return (
    <ToolPageShell
      {...PUBLIC_HERO_PRESETS.solarRecommendation}
      eyebrow="Solarious assessment"
      title="Find the Right Solar Solution"
      intro="Share your project details for an indicative, catalog-backed solar module recommendation."
    >
      <SolarRecommendationForm />
    </ToolPageShell>
  );
}
