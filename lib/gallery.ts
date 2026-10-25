import "server-only";
import { backendApiUrl } from "@/lib/server-config";

export type SiteGalleryImage = { id:string; title:string; description:string; category:string; image_url:string; alt_text:string; width:number; height:number };
export async function getGallery(): Promise<SiteGalleryImage[]> { const backend=backendApiUrl(); if(!backend) return []; try { const response=await fetch(`${backend}/api/gallery?limit=60`,{cache:"no-store",signal:AbortSignal.timeout(8_000)}); const data=await response.json() as {images?:SiteGalleryImage[]}; return response.ok&&Array.isArray(data.images)?data.images:[]; } catch { return []; } }
