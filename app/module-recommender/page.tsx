import type { Metadata } from "next";
import ModuleRecommender from "@/components/module-recommender";
export const metadata: Metadata = { title: "Smart Module Finder", description: "Find a preliminary Solarious solar module category for your project requirements." };
export default function Page(){ return <ModuleRecommender />; }
