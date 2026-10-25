import type { Metadata } from "next";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import AdminDashboard from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  return <AdminDashboard adminName={user.displayName}/>;
}
