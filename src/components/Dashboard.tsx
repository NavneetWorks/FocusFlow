import { useState, useEffect } from "react";
import { 
  Plus, 
  Calendar, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  Play, 
  CheckCircle,
  Activity,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check
} from "lucide-react";
import { Task, ScheduleSlot, Habit, Goal, RoutineEvent, PriorityLevel } from "../types";
import { motion } from "motion/react";

const getPriorityIcon = (priority?: PriorityLevel) => {
  if (!priority) return "🟡";
  switch (priority) {
    case "Very Important": return "🔴";
    case "Important": return "🟠";
    case "Normal": return "🟡";
    case "Low": return "🔵";
    case "Remember Me": return "🟣";
    default: return "🟡";
  }
};

interface DashboardProps {
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  schedule: ScheduleSlot[];
  routineEvents?: RoutineEvent[];
  onAddTaskClick: () => void;
  onSelectTab: (tab: string) => void;
  onGenerateSchedule: () => void;
  isGeneratingSchedule: boolean;
  onUpdateSchedule?: (newSchedule: ScheduleSlot[]) => void;
  userName?: string;
  userEmail?: string;
  isDemoMode?: boolean;
}

export default function Dashboard({
  tasks,
  habits,
  goals,
  schedule,
  routineEvents = [],
  onAddTaskClick,
  onSelectTab,
  onGenerateSchedule,
  isGeneratingSchedule,
  onUpdateSchedule,
  userName = "",
  userEmail = "",
  isDemoMode = false
}: DashboardProps) {
  const [greeting, setGreeting] = useState("Hello");
  const [todayFocusTask, setTodayFocusTask] = useState<Task | null>(null);
  const [matrixType, setMatrixType] = useState<"tasks" | "habits">("tasks");
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [pastOffset, setPastOffset] = useState<number>(0);
  const [isConfirmingDashboardClear, setIsConfirmingDashboardClear] = useState(false);

  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good morning");
    else if (hrs < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Filter tasks
  const pendingTasks = tasks.filter(t => t.status !== "Completed");
  const completedTasksCount = tasks.filter(t => t.status === "Completed").length;
  const totalTasksCount = tasks.length;
  const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Find Today's Focus (highest priority pending task, or nearest deadline)
  useEffect(() => {
    const highPriority = pendingTasks.find(t => t.priority === "Very Important" || t.priority === "Important");
    if (highPriority) {
      setTodayFocusTask(highPriority);
    } else if (pendingTasks.length > 0) {
      setTodayFocusTask(pendingTasks[0]);
    } else {
      setTodayFocusTask(null);
    }
  }, [tasks]);

  // Productivity Score Calculation
  const habitStreakSum = habits.reduce((acc, h) => acc + h.streak, 0);
  const completedGoalsCount = goals.filter(g => g.completed).length;
  const productivityScore = Math.min(
    100, 
    Math.round((progressPercentage * 0.5) + (habitStreakSum * 3) + (completedGoalsCount * 10) + 30)
  );

  // Near Deadlines (due in next 24 hours)
  const upcomingDeadlines = pendingTasks
    .filter(t => {
      if (!t.deadline) return false;
      const hoursLeft = (new Date(t.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft <= 48; // upcoming in 48h
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  // AI Suggestions
  const getAISuggestion = () => {
    if (pendingTasks.length === 0) {
      return {
        title: "All clean!",
        desc: "You have completed all pending tasks. Create a new task or habit to keep the momentum going!",
        actionLabel: "Add New Task",
        action: onAddTaskClick
      };
    }
    const criticalTask = upcomingDeadlines[0] || pendingTasks.find(t => t.priority === "Very Important" || t.priority === "Important");
    if (criticalTask) {
      const hoursLeft = criticalTask.deadline 
        ? Math.round((new Date(criticalTask.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60)) 
        : 0;
      return {
        title: `Beat the Clock: ${criticalTask.title}`,
        desc: hoursLeft > 0 && hoursLeft <= 24
          ? `⚠️ CRITICAL: This high-stakes task is due in only ${hoursLeft} hours. Activate "Rescue Mode" to generate a step-by-step custom survival plan!`
          : `We suggest working on "${criticalTask.title}" next. It is marked as high priority and breaking it into subtasks will lower friction.`,
        actionLabel: "Go to Tasks",
        action: () => onSelectTab("tasks")
      };
    }
    return {
      title: "Keep it going",
      desc: `You have ${pendingTasks.length} pending tasks. Sticking to "${pendingTasks[0].title}" will build dynamic progress flow.`,
      actionLabel: "Manage Tasks",
      action: () => onSelectTab("tasks")
    };
  };

  const aiSuggestion = getAISuggestion();

  // Format today's date elegantly
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <div className="space-y-6 text-[#f8fafc]">
      {/* Top Welcome / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 border border-white/10 p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
              {greeting}, {userName || "Productivity Ninja"}.
            </h1>
            {isDemoMode ? (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                🔴 Local Demo Mode
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                🟢 Cloud Synced
              </span>
            )}
          </div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-500" />
            {formattedDate} • Focus Session Ready
          </p>
        </div>
        <div>
          <button
            id="quick-add-task-btn"
            onClick={onAddTaskClick}
            className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Add Task</span>
          </button>
        </div>
      </div>

      {/* Grid: Stats & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Productivity Score Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/15 transition-all duration-300 pointer-events-none" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Focus Score
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black tracking-tighter">{productivityScore}</span>
              <span className="text-xs text-green-400 font-bold uppercase tracking-wider ml-1">
                {productivityScore > 75 ? "+12%" : "+5%"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-500" 
                style={{ width: `${productivityScore}%` }}
              />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">
              {productivityScore > 75 ? "Flow State Active" : "Building Momentum"}
            </p>
          </div>
        </div>

        {/* Task Progress Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/15 transition-all duration-300 pointer-events-none" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Tasks Done
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black tracking-tighter">{completedTasksCount}</span>
              <span className="text-xs text-white/30 uppercase font-black ml-1">/ {totalTasksCount}</span>
            </div>
          </div>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-black leading-none">
            {totalTasksCount - completedTasksCount} tasks remaining today
          </p>
        </div>

        {/* Habit Streaks Sum Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/15 transition-all duration-300 pointer-events-none" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Streak
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black tracking-tighter">{habitStreakSum}</span>
              <span className="text-xs text-white/30 uppercase font-black ml-1">Days</span>
            </div>
          </div>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-black leading-none">
            Top 5% this month
          </p>
        </div>
      </div>

      {/* Notion-style Activity Heatmap & Completed Index System Tracker */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Notion-style Heatmap Grid (e.g. for GATE 2027 Prep & Focus Flow) */}
          <div className="md:col-span-7 space-y-4 border-r border-white/5 pr-0 md:pr-6 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    {matrixType === "tasks" ? "COMPLETION" : "HABITS"} CONSISTENCY MATRIX
                  </h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mt-1">
                    {matrixType === "tasks" ? "Track active goal and task completion grid" : "Monitor recurring atomic daily consistency streaks"}
                  </p>
                </div>

                {/* Navigation and Reset controls */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    onClick={() => setPastOffset(prev => prev + 1)}
                    className="p-1 px-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all text-[9px] flex items-center gap-1 font-black uppercase cursor-pointer"
                    title="Go further back in time"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Past</span>
                  </button>
                  {pastOffset > 0 && (
                    <button
                      onClick={() => setPastOffset(0)}
                      className="p-1 px-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg text-indigo-400 hover:text-indigo-300 transition-all text-[8px] flex items-center gap-1 font-black uppercase cursor-pointer animate-pulse"
                      title="Reset to current"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Now</span>
                    </button>
                  )}
                  <button
                    onClick={() => setPastOffset(prev => Math.max(0, prev - 1))}
                    disabled={pastOffset === 0}
                    className="p-1 px-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-white/60 hover:text-white transition-all text-[9px] flex items-center gap-1 font-black uppercase disabled:cursor-not-allowed cursor-pointer"
                    title="Go forward to present"
                  >
                    <span>Forward</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Matrix selectors and Timeframe filters */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-black/20 p-1.5 rounded-xl border border-white/5">
                {/* Type Selection */}
                <div className="flex items-center bg-white/5 rounded-lg p-0.5">
                  <button
                    onClick={() => { setMatrixType("tasks"); setPastOffset(0); }}
                    className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      matrixType === "tasks" ? "bg-emerald-500 text-black shadow" : "text-white/50 hover:text-white"
                    }`}
                  >
                    Tasks & Goals
                  </button>
                  <button
                    onClick={() => { setMatrixType("habits"); setPastOffset(0); }}
                    className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      matrixType === "habits" ? "bg-pink-500 text-white shadow" : "text-white/50 hover:text-white"
                    }`}
                  >
                    Consistency Habits
                  </button>
                </div>

                {/* Timeframe Selection */}
                <div className="flex items-center bg-white/5 rounded-lg p-0.5">
                  <button
                    onClick={() => { setTimeframe("weekly"); setPastOffset(0); }}
                    className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      timeframe === "weekly" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => { setTimeframe("monthly"); setPastOffset(0); }}
                    className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      timeframe === "monthly" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => { setTimeframe("yearly"); setPastOffset(0); }}
                    className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      timeframe === "yearly" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </div>

            {/* The main activity visualizer grid based on the chosen timeframe */}
            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 w-full flex-1 flex flex-col justify-center min-h-[190px]">
              {timeframe === "monthly" && (() => {
                const today = new Date();
                const targetDate = new Date(today.getFullYear(), today.getMonth() - pastOffset, 1);
                const currentYear = targetDate.getFullYear();
                const currentMonthNum = targetDate.getMonth();
                const totalDaysInMonth = new Date(currentYear, currentMonthNum + 1, 0).getDate();
                const firstDayOfWeekIndex = new Date(currentYear, currentMonthNum, 1).getDay(); // 0-6
                const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonthNum;
                const currentDay = today.getDate();

                const cells = [];
                for (let i = 0; i < firstDayOfWeekIndex; i++) {
                  cells.push(<div key={`empty-${i}`} className="w-full aspect-square bg-transparent" />);
                }

                for (let d = 1; d <= totalDaysInMonth; d++) {
                  const dateString = `${currentYear}-${String(currentMonthNum + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const isToday = isCurrentMonth && d === currentDay;

                  // Get completions list for tooltip
                  const completedTasksList = tasks.filter(t => (t.status === "Completed" && t.completedAt?.startsWith(dateString)) || (t.history && t.history.includes(dateString)));
                  const completedGoalsList = goals.filter(g => (g.completed && g.completedAt?.startsWith(dateString)) || (g.history && g.history.includes(dateString)));
                  const completedHabitsList = habits.filter(h => h.lastCompleted?.startsWith(dateString) || (h.history && h.history.includes(dateString)));

                  const totalItemsCount = matrixType === "tasks" 
                    ? completedTasksList.length + completedGoalsList.length 
                    : completedHabitsList.length;

                  const isCompleted = totalItemsCount > 0;

                  cells.push(
                    <div
                      key={`day-${d}`}
                      className={`w-full aspect-square rounded-lg transition-all duration-300 relative group cursor-pointer ${
                        isToday 
                          ? "ring-2 ring-indigo-500 bg-indigo-500/80 shadow-md shadow-indigo-500/20" 
                          : isCompleted 
                            ? matrixType === "tasks"
                              ? "bg-emerald-500 border border-emerald-400/40 shadow-xs shadow-emerald-500/30"
                              : "bg-pink-500 border border-pink-400/40 shadow-xs shadow-pink-500/30"
                            : "bg-white/5 hover:bg-white/10 border border-white/5"
                      }`}
                    >
                      {/* Day Number text inside box */}
                      <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-black ${
                        isCompleted ? "text-[#050507]" : "text-white/20 group-hover:text-white/50"
                      }`}>
                        {d}
                      </span>

                      {/* Hover Tooltip showing live completions */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-[#050507] border border-white/10 text-[8px] font-mono font-black uppercase text-slate-300 p-2 rounded-xl shadow-2xl pointer-events-none z-50 min-w-[140px] transition-all origin-bottom text-center">
                        <p className={`font-bold mb-1 border-b border-white/5 pb-1 ${matrixType === "tasks" ? "text-emerald-400" : "text-pink-400"}`}>
                          {targetDate.toLocaleString("default", { month: "short" }).toUpperCase()} {d}, {currentYear}
                        </p>
                        {totalItemsCount > 0 ? (
                          <div className="space-y-1 text-left max-h-[80px] overflow-y-auto pr-0.5">
                            {matrixType === "tasks" ? (
                              <>
                                {completedTasksList.map(t => (
                                  <p key={t.id} className="truncate text-white/95">✓ [TASK] {t.title}</p>
                                ))}
                                {completedGoalsList.map(g => (
                                  <p key={g.id} className="truncate text-indigo-300">✓ [GOAL] {g.title}</p>
                                ))}
                              </>
                            ) : (
                              completedHabitsList.map(h => (
                                <p key={h.id} className="truncate text-pink-300">✓ [HABIT] {h.title}</p>
                              ))
                            )}
                          </div>
                        ) : (
                          <p className="text-white/40">Rest & Recharge</p>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <p className="text-[9px] font-mono text-white/40 uppercase font-black tracking-widest text-center border-b border-white/5 pb-1">
                      📅 {targetDate.toLocaleString("default", { month: "long" }).toUpperCase()} {currentYear}
                    </p>
                    <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-mono text-white/30 font-bold uppercase py-0.5">
                      <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 w-full">
                      {cells}
                    </div>
                  </div>
                );
              })()}

              {timeframe === "weekly" && (() => {
                const today = new Date();
                const currentDayOfWeek = today.getDay();
                const daysToSubtract = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
                const mondayOfCurrentWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysToSubtract);

                const weekRows = [];

                for (let w = 0; w < 4; w++) {
                  const weekNumOffset = pastOffset * 4 + w;
                  const mondayOfWeek = new Date(mondayOfCurrentWeek.getTime() - weekNumOffset * 7 * 24 * 60 * 60 * 1000);
                  
                  const daySquares = [];
                  for (let d = 0; d < 7; d++) {
                    const targetDay = new Date(mondayOfWeek.getTime() + d * 24 * 60 * 60 * 1000);
                    const dateString = `${targetDay.getFullYear()}-${String(targetDay.getMonth() + 1).padStart(2, "0")}-${String(targetDay.getDate()).padStart(2, "0")}`;
                    const isToday = today.toDateString() === targetDay.toDateString();

                    const completedTasksList = tasks.filter(t => (t.status === "Completed" && t.completedAt?.startsWith(dateString)) || (t.history && t.history.includes(dateString)));
                    const completedGoalsList = goals.filter(g => (g.completed && g.completedAt?.startsWith(dateString)) || (g.history && g.history.includes(dateString)));
                    const completedHabitsList = habits.filter(h => h.lastCompleted?.startsWith(dateString) || (h.history && h.history.includes(dateString)));

                    const totalItemsCount = matrixType === "tasks" 
                      ? completedTasksList.length + completedGoalsList.length 
                      : completedHabitsList.length;

                    const isCompleted = totalItemsCount > 0;

                    daySquares.push(
                      <div
                        key={`week-${w}-day-${d}`}
                        className={`flex-1 aspect-square rounded-lg transition-all duration-300 relative group cursor-pointer flex flex-col items-center justify-center border ${
                          isToday 
                            ? "ring-2 ring-indigo-500 bg-indigo-500/80 shadow-md shadow-indigo-500/20" 
                            : isCompleted 
                              ? matrixType === "tasks"
                                ? "bg-emerald-500 border border-emerald-400/40 shadow-xs shadow-emerald-500/30"
                                : "bg-pink-500 border border-pink-400/40 shadow-xs shadow-pink-500/30"
                              : "bg-white/5 hover:bg-white/10 border border-white/5"
                        }`}
                      >
                        <span className={`text-[8px] font-black ${isCompleted ? "text-[#050507]" : "text-white/40"}`}>
                          {targetDay.getDate()}
                        </span>
                        <span className={`text-[5px] font-mono uppercase tracking-tighter ${isCompleted ? "text-[#050507]/60" : "text-white/20"}`}>
                          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][d]}
                        </span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-[#050507] border border-white/10 text-[8px] font-mono font-black uppercase text-slate-300 p-2 rounded-xl shadow-2xl pointer-events-none z-50 min-w-[140px] transition-all origin-bottom text-center">
                          <p className={`font-bold mb-1 border-b border-white/5 pb-1 ${matrixType === "tasks" ? "text-emerald-400" : "text-pink-400"}`}>
                            {targetDay.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          {totalItemsCount > 0 ? (
                            <div className="space-y-1 text-left max-h-[80px] overflow-y-auto pr-0.5">
                              {matrixType === "tasks" ? (
                                <>
                                  {completedTasksList.map(t => (
                                    <p key={t.id} className="truncate text-white/95">✓ [TASK] {t.title}</p>
                                  ))}
                                  {completedGoalsList.map(g => (
                                    <p key={g.id} className="truncate text-indigo-300">✓ [GOAL] {g.title}</p>
                                  ))}
                                </>
                              ) : (
                                completedHabitsList.map(h => (
                                  <p key={h.id} className="truncate text-pink-300">✓ [HABIT] {h.title}</p>
                                ))
                              )}
                            </div>
                          ) : (
                            <p className="text-white/40">Rest & Recharge</p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const rowLabel = weekNumOffset === 0 
                    ? "This Week" 
                    : weekNumOffset === 1 
                      ? "1 Week Ago" 
                      : `${weekNumOffset} Weeks Ago`;

                  weekRows.push(
                    <div key={`row-${w}`} className="space-y-1">
                      <div className="flex justify-between items-center px-1 text-[7px] font-mono font-black uppercase tracking-widest text-white/40">
                        <span>{rowLabel}</span>
                        <span>{mondayOfWeek.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - {new Date(mondayOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                      </div>
                      <div className="flex gap-1 w-full">
                        {daySquares}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 py-1">
                    {weekRows}
                  </div>
                );
              })()}

              {timeframe === "yearly" && (() => {
                const today = new Date();
                const targetYear = today.getFullYear() - pastOffset;
                const monthsList = [
                  "January", "February", "March", "April", "May", "June", 
                  "July", "August", "September", "October", "November", "December"
                ];

                return (
                  <div className="space-y-2">
                    <p className="text-[9px] font-mono text-white/40 uppercase font-black tracking-widest text-center border-b border-white/5 pb-1">
                      🗓️ YEARLY OVERVIEW • {targetYear}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 py-1">
                      {monthsList.map((monthName, m) => {
                        const prefix = `${targetYear}-${String(m + 1).padStart(2, "0")}`;
                        
                        const completedTasksList = tasks.filter(t => (t.status === "Completed" && t.completedAt?.startsWith(prefix)) || (t.history && t.history.some(h => h.startsWith(prefix))));
                        const completedGoalsList = goals.filter(g => (g.completed && g.completedAt?.startsWith(prefix)) || (g.history && g.history.some(h => h.startsWith(prefix))));
                        const completedHabitsList = habits.filter(h => h.lastCompleted?.startsWith(prefix) || (h.history && h.history.some(date => date.startsWith(prefix))));

                        const count = matrixType === "tasks" 
                          ? completedTasksList.length + completedGoalsList.length 
                          : completedHabitsList.length;

                        let colorClass = "bg-white/5 border border-white/5 hover:border-white/10";
                        if (count > 0) {
                          if (count <= 3) {
                            colorClass = matrixType === "tasks" 
                              ? "bg-emerald-950/30 border border-emerald-900/20 hover:border-emerald-700/40" 
                              : "bg-pink-950/30 border border-pink-900/20 hover:border-pink-700/40";
                          } else if (count <= 8) {
                            colorClass = matrixType === "tasks" 
                              ? "bg-emerald-700/50 border border-emerald-600/30 hover:border-emerald-500/40" 
                              : "bg-pink-700/50 border border-pink-600/30 hover:border-pink-500/40";
                          } else {
                            colorClass = matrixType === "tasks" 
                              ? "bg-emerald-500 text-black border-emerald-400" 
                              : "bg-pink-500 text-white border-pink-400";
                          }
                        }

                        return (
                          <div 
                            key={`year-month-${m}`}
                            className={`p-2 rounded-xl flex flex-col justify-between h-14 relative group cursor-pointer ${colorClass}`}
                          >
                            <div>
                              <p className={`text-[7px] font-mono font-black uppercase tracking-wider ${count > 8 && matrixType === "tasks" ? "text-black/80" : "text-white/40"}`}>
                                {monthName.slice(0, 3)}
                              </p>
                              <p className={`text-base font-black tracking-tight leading-none ${count > 8 && matrixType === "tasks" ? "text-black font-black" : "text-white font-black"}`}>
                                {count}
                              </p>
                            </div>
                            <span className={`text-[6px] font-black uppercase tracking-widest ${count > 8 && matrixType === "tasks" ? "text-black/60" : "text-white/30"}`}>
                              {matrixType === "tasks" ? "Completions" : "Streak days"}
                            </span>

                            {/* Detail Tooltip */}
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-[#050507] border border-white/10 text-[8px] font-mono font-black uppercase text-slate-300 p-2 rounded-xl shadow-2xl pointer-events-none z-50 min-w-[130px] transition-all origin-bottom text-center">
                              <p className={`font-bold border-b border-white/5 pb-1 mb-1 ${matrixType === "tasks" ? "text-emerald-400" : "text-pink-400"}`}>{monthName} {targetYear}</p>
                              <p className="text-white font-black">{count} {matrixType === "tasks" ? "completions" : "habit executions"}</p>
                              <p className="text-white/40 mt-0.5">Target reached consistently</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Grid Legend */}
            <div className="flex items-center justify-between text-[8px] font-mono text-white/30 font-bold uppercase mt-2 pt-2 border-t border-white/5">
              <span>ACTIVE SYSTEM: {matrixType.toUpperCase()} / {timeframe.toUpperCase()}</span>
              <div className="flex items-center gap-1.5">
                <span>Less</span>
                <div className="w-2.5 h-2.5 rounded-xs bg-white/5 border border-white/5" />
                <div className={`w-2.5 h-2.5 rounded-xs border ${matrixType === "tasks" ? "bg-emerald-950/40 border-emerald-900/40" : "bg-pink-950/40 border-pink-900/40"}`} />
                <div className={`w-2.5 h-2.5 rounded-xs border ${matrixType === "tasks" ? "bg-emerald-700/60 border-emerald-600/60" : "bg-pink-700/60 border-pink-600/60"}`} />
                <div className={`w-2.5 h-2.5 rounded-xs border ${matrixType === "tasks" ? "bg-emerald-500 border-emerald-400/40" : "bg-pink-500 border-pink-400/40"}`} />
                <span>More Active</span>
              </div>
            </div>
          </div>

          {/* Right Column: Indexed Checklist of Goals and Tasks with green ticks */}
          <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />
                Indexed Completion Records
              </h3>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mt-1">Live Database Verification • Completed index green ticks</p>
            </div>

            {/* List of indexes */}
            <div className="space-y-2 flex-1 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
              {tasks.length > 0 || goals.length > 0 ? (
                <>
                  {tasks.slice(0, 3).map((t, idx) => {
                    const indexStr = `#T0${idx + 1}`;
                    const isDone = t.status === "Completed";
                    return (
                      <div key={t.id} className="p-2.5 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between text-xs transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded ${
                            isDone ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"
                          }`}>
                            {indexStr}
                          </span>
                          <span className={`font-bold truncate uppercase tracking-tight flex items-center gap-1 ${isDone ? "line-through text-white/30" : "text-slate-200"}`}>
                            <span className="shrink-0">{getPriorityIcon(t.priority)}</span>
                            <span className="truncate">{t.title}</span>
                          </span>
                        </div>
                        {isDone ? (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400 font-mono tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            ✓ Done
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-white/30 font-mono tracking-widest">
                            Pending
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {goals.slice(0, 2).map((g, idx) => {
                    const indexStr = `#G0${idx + 1}`;
                    const isDone = g.completed;
                    return (
                      <div key={g.id} className="p-2.5 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between text-xs transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded ${
                            isDone ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"
                          }`}>
                            {indexStr}
                          </span>
                          <span className={`font-bold truncate uppercase tracking-tight flex items-center gap-1 ${isDone ? "line-through text-white/30" : "text-slate-200"}`}>
                            <span className="shrink-0">{getPriorityIcon(g.priority)}</span>
                            <span className="truncate">{g.title}</span>
                          </span>
                        </div>
                        {isDone ? (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400 font-mono tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            ✓ Done
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-white/30 font-mono tracking-widest">
                            Pending
                          </span>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-6 text-white/30 text-[10px] uppercase font-black">
                  Create goals or tasks to log completion indexes
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Core Section Split: Left Tasks & AI, Right Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 8 Cols: Today's Focus & AI Suggestions & Deadlines */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Today's Focus Task Card */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
            
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-black uppercase tracking-tighter leading-none text-white">
                Current Priority<br />
                <span className="text-indigo-400 truncate flex items-center gap-2 max-w-xl">
                  {todayFocusTask ? (
                    <>
                      <span className="shrink-0">{getPriorityIcon(todayFocusTask.priority)}</span>
                      <span className="truncate">{todayFocusTask.title}</span>
                    </>
                  ) : (
                    "No Active Priority"
                  )}
                </span>
              </h2>
              {todayFocusTask && (
                <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {todayFocusTask.priority} Priority
                </div>
              )}
            </div>
            
            {todayFocusTask ? (
              <div className="space-y-6">
                <p className="text-sm text-white/70 font-medium leading-relaxed">
                  {todayFocusTask.description || "No description provided for this high-stakes focus priority."}
                </p>

                {/* Subtask Quick Progress list if any */}
                {todayFocusTask.subtasks && todayFocusTask.subtasks.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">AI Subtask Roadmap</p>
                    <div className="space-y-2">
                      {todayFocusTask.subtasks.slice(0, 3).map((sub) => (
                        <div key={sub.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group cursor-pointer">
                          <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full ${sub.completed ? "bg-indigo-500" : "border border-white/20"}`} />
                            <span className={`font-black tracking-tight uppercase text-xs ${sub.completed ? "line-through text-white/40" : "text-white"}`}>
                              {sub.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                            {sub.completed ? "Completed" : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex pt-4">
                  <button
                    id="view-task-details-btn"
                    onClick={() => onSelectTab("tasks")}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    Manage & Start Task
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                <p className="text-xs text-white/40 uppercase tracking-widest font-black">No active tasks for today</p>
                <button
                  id="dashboard-create-first-task-btn"
                  onClick={onAddTaskClick}
                  className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                >
                  Create your first task
                </button>
              </div>
            )}
          </div>

          {/* Upcoming Near Deadlines List */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-rose-500 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Critical Deadlines (Next 48 Hours)
            </h2>
            
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.map((t) => {
                  const hoursLeft = Math.round((new Date(t.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60));
                  return (
                    <div key={t.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="text-sm font-black uppercase tracking-tight text-white truncate flex items-center gap-1.5">
                          <span className="shrink-0">{getPriorityIcon(t.priority)}</span>
                          <span className="truncate">{t.title}</span>
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/40 font-black uppercase tracking-widest">
                          <span>{t.category}</span>
                          <span>•</span>
                          <span className="text-rose-400">{hoursLeft} hrs left</span>
                        </div>
                      </div>
                      
                      <button
                        id={`rescue-mode-trigger-${t.id}`}
                        onClick={() => {
                          onSelectTab("tasks");
                        }}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                      >
                        🚨 Rescue Plan
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-white/40 uppercase tracking-widest font-black text-center py-6">
                No urgent deadlines. Excellent work!
              </p>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Gemini Insights & Today's Schedule */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Gemini Insights Box */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[50px] -mr-16 -mt-16 pointer-events-none" />
            
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h2 className="font-black uppercase tracking-tighter text-white text-md">Gemini Insights</h2>
            </div>

            <div className="space-y-5">
              <div className="border-l-2 border-indigo-500/30 pl-4 py-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Tip of the day</p>
                <p className="text-xs font-semibold text-white/70 leading-snug">
                  Your focus peaks between 10am-12pm. Schedule your key task during this window for 22% better results.
                </p>
              </div>
              
              <div className="border-l-2 border-purple-500/30 pl-4 py-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">Pro suggestion</p>
                <p className="text-xs font-semibold text-white/70 leading-snug">
                  {aiSuggestion.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5">
                <button
                  id="ai-suggestion-action-btn"
                  onClick={aiSuggestion.action}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  {aiSuggestion.actionLabel}
                </button>
              </div>
            </div>
          </div>

          {/* Today's Timeline Schedule */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/5">
              <h2 className="font-black uppercase tracking-tighter text-sm flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-indigo-400" />
                Today's Timeline
              </h2>
              <div className="flex items-center gap-1.5">
                {schedule.length > 0 && onUpdateSchedule && (
                  !isConfirmingDashboardClear ? (
                    <button
                      onClick={() => setIsConfirmingDashboardClear(true)}
                      className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                      title="Clear schedule"
                    >
                      Clear
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 bg-rose-950/40 border border-rose-500/30 rounded-lg p-0.5 animate-fadeIn">
                      <button
                        onClick={() => {
                          onUpdateSchedule([]);
                          setIsConfirmingDashboardClear(false);
                        }}
                        className="px-1.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[8px] font-black uppercase cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setIsConfirmingDashboardClear(false)}
                        className="px-1.5 py-1 bg-white/5 hover:bg-white/10 text-white/70 rounded text-[8px] font-black uppercase cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  )
                )}
                <button
                  id="generate-ai-schedule-btn"
                  disabled={isGeneratingSchedule}
                  onClick={onGenerateSchedule}
                  className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/20 disabled:opacity-50 flex items-center gap-1 transition-all cursor-pointer"
                >
                  {isGeneratingSchedule ? "Optimizing..." : "AI Time Block"}
                </button>
              </div>
            </div>

            {schedule.length > 0 ? (
              <div className="flex-grow flex flex-col space-y-3">
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {schedule.map((slot, index) => (
                    <div key={index} className="flex gap-4 items-start relative pl-1 group">
                      <span className="text-[10px] font-black text-white/30 pt-0.5 w-10 text-right">{slot.time}</span>
                      <div className="flex-1 border-b border-white/10 pb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-tight text-white">{slot.activity}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              slot.type === "task" 
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                                : slot.type === "routine" 
                                  ? "bg-white/5 text-white/50" 
                                  : "bg-white/5 text-white/30"
                            }`}>
                              {slot.type}
                            </span>
                            {onUpdateSchedule && (
                              <button
                                onClick={() => {
                                  const copy = [...schedule];
                                  copy.splice(index, 1);
                                  onUpdateSchedule(copy);
                                }}
                                className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded transition-colors cursor-pointer"
                                title="Remove slot"
                              >
                                <Plus className="w-2.5 h-2.5 rotate-45" />
                              </button>
                            )}
                          </div>
                        </div>
                        {slot.notes && (
                          <p className="text-[10px] text-white/40 font-semibold uppercase mt-1 leading-snug">
                            {slot.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="my-auto py-8 text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">No schedule built yet</p>
                <p className="text-[10px] text-white/40 mt-1 max-w-[200px] mx-auto leading-relaxed font-semibold uppercase">
                  Add custom routines and click "AI Time Block" to structure your optimal day
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
