import type { Metadata } from "next";
import SectionPage from "@/components/section-page";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";
import { pageContent } from "@/data/site";

export const metadata: Metadata = {
  title: "Quality & Certifications",
  description: "Discover the inspection, testing and traceability processes behind Solarious module quality.",
};

export default function Page() {
  return <SectionPage content={pageContent.quality} {...PUBLIC_HERO_PRESETS.quality} />;
}
