"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MessageSquareQuote,
  Receipt,
  Settings,
  Tags,
  Ticket,
  Users,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/webinars", label: "Webinars", icon: Video },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/registrations", label: "Student Registrations", icon: ClipboardList },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/certificates", label: "Certificates", icon: Award },
  { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ pendingPayments }: { pendingPayments: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="lg:sticky lg:top-24">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const badge = href === "/admin/payments" && pendingPayments > 0 ? pendingPayments : null;

          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
                {badge && (
                  <span className="ml-auto rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning">
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
