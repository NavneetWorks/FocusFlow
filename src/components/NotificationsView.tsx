import React, { useState } from "react";
import {
  Bell,
  Trash2,
  Info,
  ShieldAlert,
  AlertCircle,
  Sparkles,
  CheckCircle,
  Inbox,
  Search,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface StoredNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'encouragement';
  timestamp: string;
  read: boolean;
}

interface NotificationsViewProps {
  notifications: StoredNotification[];
  onClearAll: () => void;
  onDelete: (id: string) => void;
}

export default function NotificationsView({
  notifications,
  onClearAll,
  onDelete
}: NotificationsViewProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredNotifications = notifications.filter(notif => {
    // Search filter
    const matchesSearch =
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchQuery.toLowerCase());

    // Type filter
    if (filterType === "all") return matchesSearch;
    if (filterType === "reminders") return matchesSearch && notif.type === "info";
    if (filterType === "warnings") return matchesSearch && notif.type === "warning";
    if (filterType === "critical") return matchesSearch && notif.type === "critical";
    if (filterType === "encouragements") return matchesSearch && notif.type === "encouragement";

    return matchesSearch;
  });

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "critical":
        return (
          <div className="w-10 h-10 bg-rose-500/10 rounded-2xl border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        );
      case "warning":
        return (
          <div className="w-10 h-10 bg-amber-500/10 rounded-2xl border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        );
      case "encouragement":
        return (
          <div className="w-10 h-10 bg-pink-500/10 rounded-2xl border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-sky-500/10 rounded-2xl border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Info className="w-5 h-5" />
          </div>
        );
    }
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.round(diffMs / 1000);
      const diffMins = Math.round(diffSecs / 60);
      const diffHours = Math.round(diffMins / 60);
      const diffDays = Math.round(diffHours / 24);

      if (diffSecs < 10) return "Just now";
      if (diffSecs < 60) return `${diffSecs}s ago`;
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return "Some time ago";
    }
  };

  return (
    <div id="notifications-dashboard-view" className="space-y-6">
      {/* Header section with Stats & Clear Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#09090c] border border-white/5 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              Notification Center
              <span className="bg-indigo-500/20 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                {notifications.length} Total
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-bold mt-1">
              Your centralized inbox for task checks, system alerts, and daily encouragement boosts.
            </p>
          </div>
        </div>

        {notifications.length > 0 && (
          <button
            id="clear-all-notifications-btn"
            onClick={onClearAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer self-start md:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Notifications
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="md:col-span-1 relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="notification-search-input"
            type="text"
            placeholder="Search notification texts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#050507]/60 border border-white/5 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filter Chips */}
        <div className="md:col-span-2 flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30 mr-2 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: "all", label: "All Items" },
            { id: "reminders", label: "Reminders" },
            { id: "warnings", label: "Warnings" },
            { id: "critical", label: "Critical" },
            { id: "encouragements", label: "Encouragements" }
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilterType(chip.id)}
              className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
                filterType === chip.id
                  ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-400"
                  : "bg-[#050507]/60 hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center p-16 bg-[#09090c]/40 border border-dashed border-white/5 rounded-3xl"
            >
              <Inbox className="w-12 h-12 text-slate-600 mb-4 stroke-1 animate-pulse" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">
                {searchQuery || filterType !== "all" ? "No Matching Notifications" : "Your Inbox is Clean!"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1.5 font-bold leading-normal">
                {searchQuery || filterType !== "all"
                  ? "Try adjusting your search query or filter chips to display other records."
                  : "Excellent job maintaining your focus. No historical alerts or updates are currently registered!"}
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((notif) => (
              <motion.div
                id={`notification-item-${notif.id}`}
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -30 }}
                className={`p-4 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${
                  notif.type === 'critical'
                    ? 'bg-rose-950/20 border-rose-500/20 text-rose-200 hover:bg-rose-950/30'
                    : notif.type === 'warning'
                      ? 'bg-amber-950/20 border-amber-500/20 text-amber-200 hover:bg-amber-950/30'
                      : notif.type === 'encouragement'
                        ? 'bg-pink-950/20 border-pink-500/20 text-pink-200 hover:bg-pink-950/30'
                        : 'bg-[#09090c]/80 border-white/5 text-slate-100 hover:bg-[#09090c]'
                }`}
              >
                {getNotifIcon(notif.type)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      {notif.title}
                    </h4>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 shrink-0">
                      {getRelativeTime(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-bold leading-relaxed whitespace-pre-line">
                    {notif.message}
                  </p>
                </div>

                <button
                  id={`delete-notification-${notif.id}`}
                  onClick={() => onDelete(notif.id)}
                  className="p-1.5 hover:bg-white/5 hover:text-rose-400 text-slate-500 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Dismiss notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
