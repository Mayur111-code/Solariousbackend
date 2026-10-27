import type { Metadata } from "next";
import PageShell from "@/components/page-shell";
import PublicGallery from "@/components/public-gallery";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";
import { getGallery } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Solar Gallery",
  description: "View Solarious solar technology, manufacturing and project application visuals.",
};

export default async function GalleryPage() {
  const images = await getGallery();
  return (
    <PageShell
      {...PUBLIC_HERO_PRESETS.gallery}
      eyebrow="Solarious in focus"
      title="Technology, Manufacturing & Applications"
      intro="A visual overview of the environments and applications that shape modern solar energy."
    >
      <section className="content-section">
        <PublicGallery images={images} />
      </section>
    </PageShell>
  );
}
