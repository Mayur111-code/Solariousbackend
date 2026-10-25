"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Bell, ChevronLeft, ChevronRight, LogOut, Menu, X } from "lucide-react";

export type AdminNavItem<T extends string = string> = { id: T; label: string; icon: LucideIcon };

export function AdminSidebar<T extends string>({ items, current, onSelect, collapsed, mobileOpen, onCollapse, onMobileClose }: { items: AdminNavItem<T>[]; current: T; onSelect: (id: T) => void; collapsed: boolean; mobileOpen: boolean; onCollapse: () => void; onMobileClose: () => void }) {
  return <><aside className={`enterprise-admin-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}><div className="admin-sidebar-brand"><Image src="/solarious-logo.png" width={210} height={70} alt="Solarious Energy" priority/><button type="button" className="admin-mobile-close" onClick={onMobileClose} aria-label="Close admin navigation"><X/></button></div><nav aria-label="Admin modules">{items.map(({id,label,icon:Icon})=><button key={id} type="button" className={current===id?"active":""} onClick={()=>{onSelect(id);onMobileClose()}} aria-current={current===id?"page":undefined}><Icon/><span>{label}</span></button>)}</nav><a className="admin-sidebar-logout" href="/signout-with-chatgpt?return_to=/"><LogOut/><span>Logout</span></a><button type="button" className="admin-collapse-button" onClick={onCollapse} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"}>{collapsed?<ChevronRight/>:<ChevronLeft/>}</button></aside>{mobileOpen&&<button className="admin-drawer-overlay" type="button" onClick={onMobileClose} aria-label="Close admin navigation"/>}</>;
}

export function AdminTopbar({ title, adminName, onMenu, onRefresh }: { title: string; adminName: string; onMenu: () => void; onRefresh?: () => void }) {
  return <header className="enterprise-admin-topbar"><button type="button" className="admin-menu-trigger" onClick={onMenu} aria-label="Open admin navigation"><Menu/></button><div><p>Solarious Energy / Admin</p><strong>{title}</strong></div><div className="admin-topbar-tools"><button type="button" className="admin-notification" aria-label="Notifications" title="Notifications"><Bell/><span/></button>{onRefresh&&<button type="button" className="admin-refresh-text" onClick={onRefresh}>Refresh data</button>}<span className="admin-avatar" aria-hidden="true">{adminName.trim().charAt(0).toUpperCase()||"A"}</span><div className="admin-profile"><strong>{adminName}</strong><small>Administrator</small></div></div></header>;
}

export function AdminPageHeader({ eyebrow="Control centre", title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: React.ReactNode }) {
  return <div className="enterprise-page-header"><div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>{actions&&<div>{actions}</div>}</div>;
}

export function AdminStatCard({ label, value, icon: Icon, tone="blue", detail }: { label: string; value: number|string; icon: LucideIcon; tone?: "blue"|"green"|"orange"|"red"; detail?: string }) {
  return <article className={`enterprise-stat-card ${tone}`}><span><Icon/></span><div><strong>{value}</strong><p>{label}</p>{detail&&<small>{detail}</small>}</div></article>;
}

export function AdminStatusBadge({ status }: { status: string }) {
  const normalized=String(status||"unknown").toLowerCase();
  return <span className={`admin-status-badge status-${normalized.replace(/[^a-z]+/g,"-")}`}>{normalized.replace(/_/g," ")}</span>;
}

export function AdminDataTable({ children, label }: { children: React.ReactNode; label: string }) {
  return <div className="enterprise-table-scroll" role="region" aria-label={label} tabIndex={0}>{children}</div>;
}

export function AdminFormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <fieldset className="admin-form-section"><legend>{title}</legend>{description&&<p>{description}</p>}<div>{children}</div></fieldset>;
}

export function AdminImageUploader({ preview, children }: { preview?: string; children: React.ReactNode }) {
  return <div className="admin-image-uploader">{preview&&<Image src={preview} alt="Selected media preview" width={320} height={200} unoptimized={preview.startsWith("blob:")}/>}<div>{children}</div></div>;
}

export function AdminConfirmDialog({ open, title, description, busy, onCancel, onConfirm }: { open: boolean; title: string; description: string; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  if(!open)return null;
  return <div className="admin-confirm-backdrop" role="presentation" onMouseDown={onCancel}><div className="admin-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-description" onMouseDown={event=>event.stopPropagation()}><h2 id="admin-confirm-title">{title}</h2><p id="admin-confirm-description">{description}</p><div><button type="button" className="button button-ghost" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" className="button admin-danger-button" onClick={onConfirm} disabled={busy}>{busy?"Deleting…":"Confirm delete"}</button></div></div></div>;
}
