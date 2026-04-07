import { NavLink } from "react-router-dom";
import { LayoutDashboard, Store, Users, ClipboardList, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "ダッシュボード" },
  { to: "/stores", icon: Store, label: "店舗管理" },
  { to: "/staff", icon: Users, label: "スタッフ管理" },
  { to: "/requirements", icon: ClipboardList, label: "必要人員設定" },
  { to: "/calendar", icon: Calendar, label: "シフトカレンダー" },
];

export function Sidebar() {
  return (
    <aside className="w-56 border-r bg-sidebar flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold text-sidebar-primary">ShiftCraft</h1>
        <p className="text-xs text-sidebar-foreground/60">シフト管理システム</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
