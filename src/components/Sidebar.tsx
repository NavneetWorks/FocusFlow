import {
  LayoutDashboard,
  CheckSquare,
  Bookmark,
  Calendar,
  Flame,
  Target,
  MessageSquare,
  BarChart3,
  User,
  LogOut,
  Menu,
  ChevronLeft,
  CalendarCheck,
  X,
  Share2,
  Bell
} from "lucide-react";
import { motion } from "motion/react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  userEmail: string;
  userName?: string;
  onLogout: () => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  unreadNotificationsCount?: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  userEmail,
  userName,
  onLogout,
  isMobile = false,
  mobileOpen = false,
  onCloseMobile,
  unreadNotificationsCount = 0
}: SidebarProps) {

  const sections = [
    {
      title: "Productivity",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "tasks", label: "Tasks", icon: CheckSquare },
        { id: "remember-me", label: "Remember Me", icon: Bookmark },
        { id: "schedule", label: "AI Scheduler", icon: CalendarCheck },
        { id: "habits", label: "Habit Tracker", icon: Flame },
        { id: "goals", label: "Goals Tracker", icon: Target },
        { id: "calendar", label: "Calendar", icon: Calendar },
        { id: "notifications", label: "Notifications", icon: Bell },
      ]
    },
    {
       title: "Accountability",
       items: [
         { id: "commitments", label: "Commitments Share", icon: Share2 }
       ]
     },
    {
      title: "Intelligence",
      items: [
        { id: "coach", label: "AI Coach", icon: MessageSquare },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
      ]
    },
    {
      title: "Account",
      items: [
        { id: "profile", label: "Profile", icon: User },
      ]
    }
  ];

  return (
    <motion.aside
      id="sidebar"
      initial={isMobile ? { x: -260 } : { width: "260px" }}
      animate={
        isMobile
          ? { x: mobileOpen ? 0 : -260, width: "260px" }
          : { x: 0, width: collapsed ? "76px" : "260px" }
      }
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`fixed top-0 left-0 z-50 h-screen bg-[#050507]/95 backdrop-blur-md border-r border-white/5 text-[#f8fafc] flex flex-col justify-between ${
        isMobile ? "shadow-2xl" : ""
      }`}
    >
      <div>
        {/* Header / Brand */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center font-black text-lg italic text-white shadow-lg shadow-indigo-500/20 border border-white/10">
                F
              </div>
              <span className="text-lg font-black tracking-tighter uppercase text-white premium-gradient-text">
                FocusFlow <span className="text-indigo-400 font-extrabold">AI</span>
              </span>
            </motion.div>
          )}
          {collapsed && !isMobile && (
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center font-black text-lg italic text-white mx-auto shadow-lg shadow-indigo-500/20 border border-white/10">
              F
            </div>
          )}

          <button
            id="toggle-sidebar-btn"
            onClick={() => isMobile ? (onCloseMobile && onCloseMobile()) : setCollapsed(!collapsed)}
            className="p-1.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            {isMobile ? (
              <X className="w-5 h-5" />
            ) : collapsed ? (
              <Menu className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation Items grouped by section */}
        <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-170px)]">
          {sections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-2">
              {(!collapsed || isMobile) && (
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-black mb-3 px-3">
                  {sec.title}
                </p>
              )}
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      id={`sidebar-item-${item.id}`}
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 relative group cursor-pointer ${
                        isActive
                          ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
                          : "hover:bg-white/5 text-white/60 hover:text-white border border-transparent"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute inset-y-0 left-0 w-1 bg-indigo-500 rounded-r-full"
                        />
                      )}
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-indigo-400" : "text-white/40 group-hover:text-white/80"}`} />
                      {(!collapsed || isMobile) && (
                        <motion.span
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex-1 text-left"
                        >
                          {item.label}
                        </motion.span>
                      )}

                      {item.id === "notifications" && unreadNotificationsCount > 0 && (
                        <span className={`bg-rose-500 text-white text-[9px] font-black rounded-full text-center shrink-0 ${
                          collapsed && !isMobile
                            ? "absolute top-1.5 right-1.5 w-3.5 h-3.5 flex items-center justify-center text-[7px]"
                            : "px-2 py-0.5"
                        }`}>
                          {collapsed && !isMobile ? "" : unreadNotificationsCount}
                        </span>
                      )}

                      {collapsed && !isMobile && (
                        <div className="absolute left-16 scale-0 bg-[#050507] border border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all origin-left shadow-lg z-50 pointer-events-none whitespace-nowrap">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / User info */}
      <div className="p-4 border-t border-white/5 bg-black/40">
        {!collapsed || isMobile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black text-indigo-400 text-xs uppercase shadow-md">
                {userEmail ? userEmail.substring(0, 2) : "US"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-white truncate uppercase tracking-tight">{userName || (userEmail ? userEmail.split("@")[0] : "hacker")}</p>
                <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Premium Tier</p>
              </div>
            </div>
            <button
              id="logout-btn"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black text-indigo-400 text-xs uppercase">
              {userEmail ? userEmail.substring(0, 2) : "US"}
            </div>
            <button
              id="collapsed-logout-btn"
              onClick={onLogout}
              className="p-2 rounded-xl hover:bg-rose-500/10 text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
