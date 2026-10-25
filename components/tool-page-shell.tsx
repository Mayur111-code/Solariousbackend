import InnerPageHero from "@/components/inner-page-hero";

export default function ToolPageShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <main className="tool-page"><InnerPageHero eyebrow={eyebrow} title={title} description={intro}/>{children}</main>;
}
