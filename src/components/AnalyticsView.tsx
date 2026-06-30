import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { Task, Habit } from "../types";
import { BarChart3, Clock, Flame, Award, ShieldAlert, PieChart as PieIcon } from "lucide-react";

interface AnalyticsViewProps {
  tasks: Task[];
  habits: Habit[];
}

export default function AnalyticsView({ tasks, habits }: AnalyticsViewProps) {
  const completedTasks = tasks.filter(t => t.status === "Completed");
  const pendingTasks = tasks.filter(t => t.status !== "Completed");
  const totalTasks = tasks.length;

  const totalCompletedCount = completedTasks.length;
  const totalPendingCount = pendingTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((totalCompletedCount / totalTasks) * 100) : 0;

  // Max Habit Streak
  const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;

  // Real focused minutes calculation: sum of subtasks duration of completed tasks, defaulting to 25 mins per task
  const totalFocusMinutes = tasks.reduce((sum, task) => {
    let focus = 0;
    if (task.status === "Completed") {
      if (task.subtasks && task.subtasks.length > 0) {
        focus = task.subtasks
          .filter(sub => sub.completed)
          .reduce((s, sub) => s + (sub.durationMinutes || 0), 0);
      }
      if (focus === 0) focus = 25; // standard focus pomodoro for completion
    }
    return sum + focus;
  }, 0);

  const averageFocusMinutes = totalFocusMinutes;

  // Real dynamic Weekly Activity data calculated from completed tasks dates
  const getWeeklyData = () => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];

    // Generate the last 7 calendar days dynamically
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = daysOfWeek[d.getDay()];
      const dateString = d.toDateString();
      result.push({
        name: dayName,
        dateStr: dateString,
        Completed: 0,
        Focused: 0
      });
    }

    // Map each completed task to the matching day in our 7-day window
    tasks.forEach(task => {
      if (task.status === "Completed" && task.completedAt) {
        const compDate = new Date(task.completedAt);
        const compDateStr = compDate.toDateString();

        const matchingDay = result.find(r => r.dateStr === compDateStr);
        if (matchingDay) {
          matchingDay.Completed += 1;

          let subtaskFocus = 0;
          if (task.subtasks && task.subtasks.length > 0) {
            subtaskFocus = task.subtasks
              .filter(sub => sub.completed)
              .reduce((sum, sub) => sum + (sub.durationMinutes || 0), 0);
          }
          matchingDay.Focused += subtaskFocus > 0 ? subtaskFocus : 25;
        }
      }
    });

    return result;
  };

  const weeklyActivityData = getWeeklyData();

  const pieData = [
    { name: "Completed", value: totalCompletedCount || 1, color: "#6366f1" },
    { name: "Pending", value: totalPendingCount || 2, color: "#f43f5e" }
  ];

  return (
    <div className="space-y-6">

      {/* Mini Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-950 rounded-xl text-indigo-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">Done Tasks</span>
            <p className="text-xl font-bold text-white mt-0.5">{totalCompletedCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-pink-950 rounded-xl text-pink-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">Focus Time</span>
            <p className="text-xl font-bold text-white mt-0.5">{averageFocusMinutes}m</p>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-amber-950 rounded-xl text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">Max Streak</span>
            <p className="text-xl font-bold text-white mt-0.5">{maxStreak}d</p>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-emerald-950 rounded-xl text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">Success Rate</span>
            <p className="text-xl font-bold text-white mt-0.5">{completionRate}%</p>
          </div>
        </div>
      </div>

      {/* Recharts Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Weekly Performance Area and Bar chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4 tracking-tight">Weekly Completed Tasks vs. Focused Minutes</h3>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyActivityData}>
                  <defs>
                    <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="focusedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "12px", color: "#f8fafc" }} />
                  <Area type="monotone" dataKey="Completed" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#completedGrad)" name="Completed Tasks" />
                  <Area type="monotone" dataKey="Focused" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#focusedGrad)" name="Focused Minutes" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Completed / Pending Ratio Doughnut/Pie chart */}
        <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-4 tracking-tight flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-indigo-400" />
              Completion Ratio
            </h3>

            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "12px", color: "#f8fafc" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-850">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Completed Tasks
              </span>
              <span className="font-bold text-white">{totalCompletedCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Pending Tasks
              </span>
              <span className="font-bold text-white">{totalPendingCount}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
