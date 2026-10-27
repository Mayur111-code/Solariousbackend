import type { Metadata } from "next";
import SectionPage from "@/components/section-page";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";
import { pageContent } from "@/data/site";

export const metadata: Metadata = {
  title: "Solar Project Applications",
  description: "Explore Solarious module application categories for rooftop, industrial and utility solar projects.",
};

export default function Page() {
  return <SectionPage content={pageContent.projects} {...PUBLIC_HERO_PRESETS.projects} />;
}
