import { useState } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PanelLeft, Plus, Clock, Workflow } from "lucide-react"

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className="h-screen w-screen bg-[#07090c] flex">

      {/* SIDEBAR — flat on outer background */}
      <div
        className={cn(
          "bg-[#07090c]  flex flex-col transition-all duration-300",
          collapsed ? "w-[70px]" : "w-[260px]"
        )}
      >
        <div className="p-5 flex items-center justify-between">
          {!collapsed && (
            <span className="font-semibold text-sm text-white">
              CareerOS
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-white/70 hover:text-white"
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 px-3 space-y-2">

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

        {!collapsed && (
          <div className="p-4 text-xs text-white/40">
            v1.0.0
          </div>
        )}
      </div>


      {/* FLOATING MAIN PANEL */}
      <div className="flex-1 p-4">

        <div className="h-full w-full rounded-2xl 
                        bg-[#0171717] 
                        border border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.6)]
                        shadow-[0_0_60px_rgba(0,0,0,0.7)] 
                        overflow-hidden">

          <Outlet />

        </div>

      </div>

    </div>
  )
}

function NavItem({ to, icon, label, collapsed, active }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors",
        active
          ? "bg-emerald-500/20 text-emerald-400"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}