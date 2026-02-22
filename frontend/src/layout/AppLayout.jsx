import { useState } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { PanelLeft, Plus, Clock, Workflow } from "lucide-react"

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen bg-[#f3f4f6] dark:bg-[#0f1115] relative overflow-hidden">

      
      {/* Sidebar */}
      <div
        className={cn(
          "relative z-10 border-r border-white/5 bg-black/60 backdrop-blur-xl transition-all duration-300 flex flex-col",
          collapsed ? "w-[70px]" : "w-[240px]"
        )}
      >
        {/* Toggle */}
        <div className="p-4 flex items-center justify-between">
          {!collapsed && (
            <span className="font-semibold text-sm text-white">
              AI System
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        </div>

        <Separator className="bg-white/5" />

        {/* Navigation */}
        <div className="flex-1 p-2 space-y-2">
          <NavItem
            to="/"
            icon={<Plus className="w-4 h-4" />}
            label="New Chat"
            collapsed={collapsed}
            active={location.pathname === "/"}
          />

          <NavItem
            to="/history"
            icon={<Clock className="w-4 h-4" />}
            label="History"
            collapsed={collapsed}
            active={location.pathname === "/history"}
          />

          <NavItem
            to="/pipeline"
            icon={<Workflow className="w-4 h-4" />}
            label="Pipeline"
            collapsed={collapsed}
            active={location.pathname === "/pipeline"}
          />
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 text-xs text-white/40">
            v1.0.0
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        <Outlet />
      </div>
    </div>
  )
}

function NavItem({ to, icon, label, collapsed, active }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-white/10 text-white"
          : "hover:bg-white/5 text-white/70 hover:text-white"
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}