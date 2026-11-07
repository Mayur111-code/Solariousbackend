import "server-only";
import {backendApiUrl} from "@/lib/server-config";
export type HeroBanner={id:number;image_url:string;alt_text:string;headline:string;supporting_text:string;cta_label:string;cta_href:string;display_order:number};
export const defaultHeroBanners:HeroBanner[]=[
  {id:-1,image_url:"/future-solar-panel.jpg",alt_text:"Close-up of a dark solar panel catching golden sunrise light",headline:"Beyond Energy. Towards a Sustainable Future.",supporting_text:"Discover smarter solar solutions designed to transform the way you generate, manage, and experience energy. Build a cleaner and more energy-efficient future with Solarious Energy.",cta_label:"Explore Solar Solutions",cta_href:"/products",display_order:1},
  {id:-2,image_url:"/hero-solar-2.webp",alt_text:"Industrial rooftop solar installation",headline:"Engineered for industry.",supporting_text:"Reliable module technology for commercial and industrial applications.",cta_label:"Request a quote",cta_href:"/quote",display_order:2},
  {id:-3,image_url:"/hero-solar-3.webp",alt_text:"Advanced photovoltaic module technology",headline:"Technology that performs.",supporting_text:"Modern solar architectures supported by disciplined manufacturing.",cta_label:"Explore technology",cta_href:"/technology",display_order:3},
  {id:-4,image_url:"/hero-solar-4.webp",alt_text:"Large utility-scale solar energy plant",headline:"Power for every scale.",supporting_text:"Product discovery and engineering support from rooftop to utility scale.",cta_label:"View solutions",cta_href:"/products",display_order:4},
  {id:-5,image_url:"/hero-solar-5.webp",alt_text:"Premium rooftop solar array in natural sunlight",headline:"A brighter energy future.",supporting_text:"Practical digital tools and responsive support for solar project planning.",cta_label:"Calculate project",cta_href:"/solar-calculator",display_order:5},
];
export async function getHeroBanners(){return defaultHeroBanners}
export async function getProductionHeroBanners(){const backend=backendApiUrl();if(!backend)return getHeroBanners();try{const response=await fetch(`${backend}/api/hero-banners`,{cache:"no-store"});if(!response.ok)return defaultHeroBanners;const data=await response.json() as {banners?:HeroBanner[]};return data.banners?.length?data.banners:defaultHeroBanners}catch{return defaultHeroBanners}}
