import InnerPageHero from "@/components/inner-page-hero";
export default function PageShell({eyebrow,title,intro,image="/utility-solar.webp",children}:{eyebrow:string;title:string;intro:string;image?:string;children:React.ReactNode}){return <main><InnerPageHero eyebrow={eyebrow} title={title} description={intro} image={image}/>{children}</main>}
