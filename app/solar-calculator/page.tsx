import type { Metadata } from "next";
import SolarCalculator from "@/components/solar-calculator";
export const metadata: Metadata = { title: "Solar Project Calculator", description: "Estimate preliminary solar module quantity, capacity and module area with transparent assumptions." };
export default function Page(){ return <SolarCalculator />; }
