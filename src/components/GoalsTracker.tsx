import React, { useState } from "react";
import { Plus, Target, CheckCircle2, Circle, Trash2, ShieldCheck } from "lucide-react";
import { Goal, PriorityLevel } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface GoalsTrackerProps {
  goals: Goal[];
  onAddGoal: (title: string, type: 'daily' | 'weekly' | 'monthly', weekdays?: string[], priority?: PriorityLevel) => void;
  onCompleteGoal: (goalId: string, currentCompleted: boolean) => void;
  onDeleteGoal: (goalId: string) => void;
  onUpdateGoal?: (goalId: string, updates: Partial<Goal>) => void;
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

export default function GoalsTracker({
  goals,
  onAddGoal,
  onCompleteGoal,
  onDeleteGoal,
  onUpdateGoal
}: GoalsTrackerProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>("daily");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(WEEKDAYS);
  const [priority, setPriority] = useState<PriorityLevel>("Normal");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    onAddGoal(newGoalTitle, activeTab, selectedWeekdays, priority);
    setNewGoalTitle("");
    setSelectedWeekdays(WEEKDAYS);
    setPriority("Normal");
  };

  const toggleDaySelection = (day: string) => {
    setSelectedWeekdays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const filteredGoals = goals.filter(g => g.type === activeTab);
  const completedCount = filteredGoals.filter(g => g.completed).length;
  const totalCount = filteredGoals.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* Header Panel with Type Tab switches */}
      <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            AI Objectives & Goals
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Define milestones for the day, week, or month to stay intentional.</p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850">
          {(["daily", "weekly", "monthly"] as const).map((type) => (
            <button
              id={`goal-tab-btn-${type}`}
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === type 
                  ? "bg-indigo-600 text-white" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Stats and Add Goal bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Progress box */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Goal Success Rate</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold text-white">{completedCount}</span>
              <span className="text-xs text-slate-500">/ {totalCount} completed</span>
            </div>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" className="stroke-slate-950" strokeWidth="3" fill="transparent" />
              <circle 
                cx="28" 
                cy="28" 
                r="24" 
                className="stroke-indigo-500 transition-all duration-300" 
                strokeWidth="3" 
                fill="transparent" 
                strokeDasharray={150.8}
                strokeDashoffset={150.8 - (150.8 * progressPercent) / 100}
              />
            </svg>
            <span className="absolute text-[9px] font-mono text-white font-bold">{progressPercent}%</span>
          </div>
        </div>

        {/* Input Add Goal Card */}
        <div className="md:col-span-2 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col gap-3 justify-center">
          <form onSubmit={handleSubmit} className="w-full flex flex-wrap sm:flex-nowrap gap-3 items-center">
            <input
              id="new-goal-input"
              type="text"
              required
              placeholder={`Add a new ${activeTab} target (e.g. ${
                activeTab === "daily" ? "Solve 3 DSA questions" : activeTab === "weekly" ? "Finish React portfolio" : "Read 2 non-fiction books"
              })...`}
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
            />
            
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="px-2.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-300 text-xs font-extrabold focus:outline-none focus:border-indigo-500/50 uppercase cursor-pointer"
            >
              <option value="Very Important">🔴 Very Important</option>
              <option value="Important">🟠 Important</option>
              <option value="Normal">🟡 Normal</option>
              <option value="Low Priority">🔵 Low Priority</option>
              <option value="Remember Me">🟣 Remember Me</option>
            </select>

            <button
              id="add-goal-btn"
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/10 cursor-pointer whitespace-nowrap"
            >
              Log Objective
            </button>
          </form>

          {/* Weekday selection toggles */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl self-end">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest px-1 mr-1">Target Days:</span>
            {WEEKDAYS.map(day => {
              const active = selectedWeekdays.includes(day);
              const letter = day.slice(0, 3);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDaySelection(day)}
                  className={`w-5 h-5 rounded text-[8px] font-black transition-all flex items-center justify-center border ${
                    active 
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/35" 
                      : "bg-slate-950/50 text-slate-600 border-slate-900"
                  }`}
                  title={day}
                >
                  {letter[0]}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Goal Items List */}
      <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 space-y-3">
        {filteredGoals.length > 0 ? (
          filteredGoals.map((goal) => (
            <div 
              id={`goal-item-${goal.id}`}
              key={goal.id} 
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                goal.completed ? "bg-indigo-950/5 border-indigo-500/20 opacity-70" : "bg-slate-950/40 border-slate-850"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  id={`toggle-goal-complete-${goal.id}`}
                  onClick={() => onCompleteGoal(goal.id, goal.completed)}
                  className="p-1 rounded text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer mt-0.5"
                >
                  {goal.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600 hover:text-indigo-400" />
                  )}
                </button>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-xs font-bold text-slate-200 flex items-center gap-1.5 ${goal.completed ? "line-through text-slate-500" : ""}`}>
                      <span className="shrink-0">{getPriorityIcon(goal.priority)}</span>
                      <span>{goal.title}</span>
                    </h4>
                    {goal.priority && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border ${
                        goal.priority === "Very Important"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/25 animate-pulse"
                          : goal.priority === "Important"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                            : goal.priority === "Normal"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              : (goal.priority === "Low" || goal.priority === "Low Priority")
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                                : "bg-purple-500/10 text-purple-400 border-purple-500/25"
                      }`}>
                        {goal.priority}
                      </span>
                    )}
                  </div>
                  {goal.completedAt && (
                    <p className="text-[9px] text-slate-500 mt-0.5">Completed {new Date(goal.completedAt).toLocaleDateString()}</p>
                  )}

                  {/* Goal Target Days list toggles */}
                  <div className="flex gap-1 pt-1.5">
                    {WEEKDAYS.map(day => {
                      const activeDays = goal.weekdays || WEEKDAYS;
                      const active = activeDays.includes(day);
                      const letter = day.slice(0, 1);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => {
                            if (onUpdateGoal) {
                              const updatedDays = active
                                ? activeDays.filter(d => d !== day)
                                : [...activeDays, day];
                              onUpdateGoal(goal.id, { weekdays: updatedDays });
                            }
                          }}
                          className={`w-4.5 h-4.5 rounded text-[8px] font-black transition-all flex items-center justify-center border ${
                            active 
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" 
                              : "bg-slate-950/40 text-slate-600 border-slate-900 hover:border-slate-800"
                          }`}
                          title={`Toggle ${day}`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                id={`delete-goal-btn-${goal.id}`}
                onClick={() => onDeleteGoal(goal.id)}
                className="p-1.5 text-slate-500 hover:text-pink-400 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="py-12 text-center">
            <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto opacity-35" />
            <p className="text-xs text-slate-400 mt-2 font-medium">No {activeTab} goals logged.</p>
            <p className="text-[10px] text-slate-500 mt-1">Set clear intentions for your future self!</p>
          </div>
        )}
      </div>

    </div>
  );
}
