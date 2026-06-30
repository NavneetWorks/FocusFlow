import React, { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Plus, 
  CheckCircle2, 
  Sparkles 
} from "lucide-react";
import { Task } from "../types";

interface CalendarViewProps {
  tasks: Task[];
}

export default function CalendarView({ tasks }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Format current date as YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
  };

  const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayStr());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Month names array
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Days of week
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get first day of the month and number of days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Tasks mapped by date string (YYYY-MM-DD)
  const getTasksForDate = (day: number) => {
    const formattedDay = day.toString().padStart(2, "0");
    const formattedMonth = (month + 1).toString().padStart(2, "0");
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    return tasks.filter(t => {
      if (!t.deadline) return false;
      const tDate = t.deadline.split("T")[0];
      return tDate === dateStr;
    });
  };

  // Get active agenda tasks for the currently selected date
  const getAgendaTasks = () => {
    return tasks.filter(t => {
      if (!t.deadline) return false;
      return t.deadline.split("T")[0] === selectedDateStr;
    });
  };

  const selectedTasks = getAgendaTasks();

  // Render Calendar Grid
  const renderDays = () => {
    const dayCells = [];

    // Empty cells for preceding days
    for (let i = 0; i < firstDayIndex; i++) {
      dayCells.push(<div key={`empty-${i}`} className="h-20 bg-slate-950/10 border border-slate-900/40 opacity-40" />);
    }

    // Days of month
    for (let day = 1; day <= totalDays; day++) {
      const dayTasks = getTasksForDate(day);
      const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
      
      const formattedDay = day.toString().padStart(2, "0");
      const formattedMonth = (month + 1).toString().padStart(2, "0");
      const cellDateStr = `${year}-${formattedMonth}-${formattedDay}`;
      const isSelected = selectedDateStr === cellDateStr;

      dayCells.push(
        <div 
          key={`day-${day}`} 
          onClick={() => setSelectedDateStr(cellDateStr)}
          className={`h-20 p-2 border border-slate-900/60 bg-slate-950/20 flex flex-col justify-between overflow-hidden relative transition-all duration-150 cursor-pointer hover:bg-indigo-600/10 ${
            isSelected 
              ? "ring-2 ring-indigo-500 bg-indigo-550/10 z-10" 
              : isToday 
                ? "border-indigo-500/50 bg-indigo-950/5" 
                : ""
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[11px] font-mono font-black ${
              isSelected ? "text-indigo-400" : isToday ? "text-pink-400" : "text-slate-400"
            }`}>
              {day}
            </span>
            {dayTasks.length > 0 && (
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            )}
          </div>

          <div className="space-y-1 overflow-hidden flex-1 mt-1">
            {dayTasks.slice(0, 2).map((task) => (
              <div 
                key={task.id}
                className={`px-1 py-0.5 rounded text-[8px] font-bold truncate ${
                  task.status === "Completed"
                    ? "bg-slate-900 text-slate-600 line-through"
                    : (task.priority === "Very Important" || task.priority === "Important")
                      ? "bg-rose-950/40 text-rose-300 border border-rose-500/10"
                      : "bg-indigo-950/40 text-indigo-300 border border-indigo-500/10"
                }`}
              >
                {task.title}
              </div>
            ))}
            {dayTasks.length > 2 && (
              <div className="text-[7px] text-indigo-400 font-bold tracking-tight text-right">
                +{dayTasks.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return dayCells;
  };

  // Convert selectedDateStr YYYY-MM-DD to beautiful human format
  const formatHumanDate = (str: string) => {
    try {
      const date = new Date(str + "T00:00:00");
      return date.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return str;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Calendar Header Control */}
      <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-black text-white tracking-wider uppercase">
            {monthNames[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="prev-month-btn"
            onClick={handlePrevMonth}
            className="p-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            id="next-month-btn"
            onClick={handleNextMonth}
            className="p-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Calendar Grid */}
        <div className="lg:col-span-2 bg-slate-900/40 p-5 rounded-3xl border border-slate-800 space-y-4">
          {/* Days of week header */}
          <div className="grid grid-cols-7 text-center pb-2 border-b border-slate-850">
            {daysOfWeek.map((day) => (
              <span key={day} className="text-[10px] font-black font-mono uppercase text-slate-500 tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Grid of Days */}
          <div className="grid grid-cols-7 gap-1 rounded-2xl overflow-hidden border border-slate-900 bg-slate-950/30">
            {renderDays()}
          </div>
        </div>

        {/* Right 1 Col: Day agenda explorer */}
        <div className="space-y-4">
          <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 space-y-4 min-h-[300px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Clock className="w-4 h-4 text-pink-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Day Agenda Explorer</h3>
              </div>

              <div className="mt-3">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-tight">
                  {formatHumanDate(selectedDateStr)}
                </h4>
                {selectedDateStr === getTodayStr() && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[8px] font-black uppercase tracking-widest rounded-full">
                    Today
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {selectedTasks.length > 0 ? (
                  selectedTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        task.status === "Completed"
                          ? "bg-slate-950/20 border-slate-850 text-slate-500"
                          : "bg-slate-950/40 border-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            task.status === "Completed" 
                              ? "bg-slate-600" 
                              : (task.priority === "Very Important" || task.priority === "Important") 
                                ? "bg-rose-500 animate-pulse" 
                                : "bg-indigo-500"
                          }`} />
                          <h5 className={`font-bold truncate ${task.status === "Completed" ? "line-through text-slate-600" : ""}`}>
                            {task.title}
                          </h5>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-widest">
                          {task.estimatedDuration || "No duration"} • {task.priority} Priority
                        </p>
                      </div>

                      {task.status === "Completed" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-slate-950/10 border border-dashed border-slate-850 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-slate-600 mx-auto opacity-40" />
                    <p className="text-[11px] text-slate-500 font-bold mt-2">No active plans scheduled</p>
                    <p className="text-[9px] text-slate-600 mt-0.5 uppercase tracking-wider font-semibold">Click another day to explore plans!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="p-3 bg-indigo-950/15 rounded-2xl border border-indigo-500/15 flex gap-2 items-start">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Select any calendar square to review deadline blocks, structured sub-tasks, and routine events designed for that specific day.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
