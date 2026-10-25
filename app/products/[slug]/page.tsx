import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/product-detail";
import { products } from "@/data/site";
import { getSiteProducts } from "@/lib/site-products";
export function generateStaticParams(){return products.map(p=>({slug:p.slug}))}
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const p=(await getSiteProducts()).find(x=>x.slug===slug);if(!p)return{};return{title:`${p.name} Solar Modules`,description:p.summary,alternates:{canonical:`/products/${slug}`}}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const p=(await getSiteProducts()).find(x=>x.slug===slug);if(!p)notFound();return <ProductDetail product={p}/>}
