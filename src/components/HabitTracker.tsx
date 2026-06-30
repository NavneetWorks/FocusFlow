import React, { useState } from "react";
import { Plus, Flame, Sparkles, Check, Trash2, Milestone } from "lucide-react";
import { Habit, PriorityLevel } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface HabitTrackerProps {
  habits: Habit[];
  onAddHabit: (title: string, weekdays?: string[], priority?: PriorityLevel) => void;
  onCompleteHabit: (habitId: string) => void;
  onDeleteHabit: (habitId: string) => void;
  onUpdateHabit?: (habitId: string, updates: Partial<Habit>) => void;
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

export default function HabitTracker({
  habits,
  onAddHabit,
  onCompleteHabit,
  onDeleteHabit,
  onUpdateHabit
}: HabitTrackerProps) {
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(WEEKDAYS);
  const [priority, setPriority] = useState<PriorityLevel>("Normal");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    onAddHabit(newHabitTitle, selectedWeekdays, priority);
    setNewHabitTitle("");
    setSelectedWeekdays(WEEKDAYS); // Reset to all days
    setPriority("Normal");
  };

  const toggleDaySelection = (day: string) => {
    setSelectedWeekdays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const isCompletedToday = (habit: Habit) => {
    if (!habit.lastCompleted) return false;
    const todayStr = new Date().toLocaleDateString("en-US");
    const lastCompletedStr = new Date(habit.lastCompleted).toLocaleDateString("en-US");
    return todayStr === lastCompletedStr;
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Flame className="w-5 h-5 text-pink-500" />
            Consistency Habits
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Build long term discipline by tracking daily atomic actions.</p>
        </div>

        <div className="flex flex-col gap-2.5 items-end w-full md:w-auto">
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            <input
              id="new-habit-input"
              type="text"
              placeholder="Study, Workout, Meditation..."
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
            />
            
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="px-2.5 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-300 text-xs font-extrabold focus:outline-none focus:border-indigo-500/50 uppercase cursor-pointer"
            >
              <option value="Very Important">🔴 Very Important</option>
              <option value="Important">🟠 Important</option>
              <option value="Normal">🟡 Normal</option>
              <option value="Low Priority">🔵 Low Priority</option>
              <option value="Remember Me">🟣 Remember Me</option>
            </select>

            <button
              id="add-habit-btn"
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer animate-pulse"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          {/* Weekday selection toggles */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest px-1 mr-1">Days:</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {habits.length > 0 ? (
          habits.map((habit) => {
            const completed = isCompletedToday(habit);
            return (
              <motion.div
                id={`habit-card-${habit.id}`}
                key={habit.id}
                layout
                className={`p-5 rounded-2xl border bg-slate-900/40 relative overflow-hidden flex flex-col justify-between min-h-[170px] ${
                  completed ? "border-pink-500/30 bg-pink-950/5" : "border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-bold text-white tracking-tight flex items-center gap-1.5 ${completed ? "line-through text-slate-400" : ""}`}>
                        <span className="shrink-0">{getPriorityIcon(habit.priority)}</span>
                        <span>{habit.title}</span>
                      </h3>
                      {habit.priority && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border ${
                          habit.priority === "Very Important"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/25 animate-pulse"
                            : habit.priority === "Important"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                              : habit.priority === "Normal"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                : (habit.priority === "Low" || habit.priority === "Low Priority")
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                                  : "bg-purple-500/10 text-purple-400 border-purple-500/25"
                        }`}>
                          {habit.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono font-semibold flex items-center gap-1">
                      <Milestone className="w-3 h-3" />
                      Started {new Date(habit.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <button
                    id={`delete-habit-btn-${habit.id}`}
                    onClick={() => onDeleteHabit(habit.id)}
                    className="p-1 text-slate-500 hover:text-pink-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Weekday Toggles on Habit Card */}
                <div className="mt-3 py-1.5 border-t border-b border-slate-850/50">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Weekly Target Days:</span>
                  <div className="flex gap-1">
                    {WEEKDAYS.map(day => {
                      const activeDays = habit.weekdays || WEEKDAYS;
                      const active = activeDays.includes(day);
                      const letter = day.slice(0, 1);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => {
                            if (onUpdateHabit) {
                              const updatedDays = active
                                ? activeDays.filter(d => d !== day)
                                : [...activeDays, day];
                              onUpdateHabit(habit.id, { weekdays: updatedDays });
                            }
                          }}
                          className={`w-5 h-5 rounded text-[8px] font-black transition-all flex items-center justify-center border ${
                            active 
                              ? "bg-pink-500/10 text-pink-400 border-pink-500/25" 
                              : "bg-slate-950/50 text-slate-600 border-slate-900 hover:border-slate-850"
                          }`}
                          title={`Toggle ${day}`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {/* Streak Flame */}
                  <div className="flex items-center gap-1 text-pink-500">
                    <Flame className={`w-5 h-5 ${habit.streak > 0 ? "animate-pulse" : "opacity-30"}`} />
                    <span className="text-xs font-extrabold">{habit.streak} day streak</span>
                  </div>

                  {/* Mark complete checkbox */}
                  <button
                    id={`complete-habit-btn-${habit.id}`}
                    disabled={completed}
                    onClick={() => onCompleteHabit(habit.id)}
                    className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                      completed 
                        ? "bg-pink-600/20 border-pink-500/30 text-pink-400" 
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 cursor-pointer"
                    }`}
                  >
                    {completed ? <Check className="w-4 h-4" /> : <span className="text-[10px] font-bold uppercase tracking-wider px-1">Done</span>}
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="md:col-span-2 lg:col-span-3 text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl">
            <Flame className="w-8 h-8 text-slate-600 mx-auto opacity-35" />
            <h3 className="text-slate-300 font-bold mt-3">Ready to build momentum?</h3>
            <p className="text-xs text-slate-500 mt-1">Create a physical, study, or focus habit to start tracking streaks.</p>
          </div>
        )}
      </div>
    </div>
  );
}
