import React, { useState } from "react";
import { 
  Clock, 
  Plus, 
  Trash2, 
  Sparkles, 
  Compass, 
  RefreshCw, 
  CalendarDays, 
  Mic, 
  MicOff, 
  Check, 
  X, 
  Edit2, 
  Save, 
  Volume2, 
  AlertCircle 
} from "lucide-react";
import { RoutineEvent, ScheduleSlot, Task, Habit, Goal } from "../types";

interface AISchedulerProps {
  tasks: Task[];
  routineEvents: RoutineEvent[];
  onAddRoutineEvent: (event: RoutineEvent) => void;
  onDeleteRoutineEvent: (eventName: string) => void;
  onToggleRoutineEventDay?: (eventName: string, day: string) => void;
  onUpdateHabit?: (habitId: string, updates: Partial<Habit>) => void;
  onUpdateGoal?: (goalId: string, updates: Partial<Goal>) => void;
  availableHoursStart: string;
  setAvailableHoursStart: (time: string) => void;
  availableHoursEnd: string;
  setAvailableHoursEnd: (time: string) => void;
  schedule: ScheduleSlot[];
  isGenerating: boolean;
  onGenerate: () => void;
  onUpdateSchedule: (newSchedule: ScheduleSlot[]) => void;
  habits?: Habit[];
  goals?: Goal[];
}

export default function AIScheduler({
  tasks,
  routineEvents,
  onAddRoutineEvent,
  onDeleteRoutineEvent,
  onToggleRoutineEventDay,
  onUpdateHabit,
  onUpdateGoal,
  availableHoursStart,
  setAvailableHoursStart,
  availableHoursEnd,
  setAvailableHoursEnd,
  schedule,
  isGenerating,
  onGenerate,
  onUpdateSchedule,
  habits = [],
  goals = []
}: AISchedulerProps) {
  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const [eventName, setEventName] = useState("");
  const [eventStart, setEventStart] = useState("09:00");
  const [eventEnd, setEventEnd] = useState("10:00");
  const [routineWeekdays, setRoutineWeekdays] = useState<string[]>(WEEKDAYS);

  // Voice Scheduling State
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [proposedSchedule, setProposedSchedule] = useState<{ schedule: ScheduleSlot[]; suggestionText: string } | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editActivity, setEditActivity] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState<"task" | "routine" | "break">("task");
  const [editNotes, setEditNotes] = useState("");
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const handleAddRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return;
    
    onAddRoutineEvent({
      name: eventName,
      start: eventStart,
      end: eventEnd,
      weekdays: routineWeekdays
    });

    setEventName("");
    setEventStart("09:00");
    setEventEnd("10:00");
    setRoutineWeekdays(WEEKDAYS);
  };

  const toggleRoutineDay = (day: string) => {
    setRoutineWeekdays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Web Speech API Microphone capture
  const startListening = () => {
    setVoiceError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Microphone Speech Recognition is not natively supported by this browser. No worries! You can type your spoken statement in the text box below instead!");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceText(prev => prev ? `${prev} ${text}` : text);
      };
      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setIsListening(false);
        let msg = "Something went wrong with voice capture.";
        if (e.error === "not-allowed") {
          msg = "Microphone access was denied. If you are inside the preview iframe, please click the 'Open in New Tab' button in the top right to grant microphone permission, or check your browser settings!";
        } else if (e.error === "no-speech") {
          msg = "No speech was detected. Please try speaking again clearly.";
        } else if (e.error === "audio-capture") {
          msg = "No microphone found. Please connect a working mic and try again.";
        } else {
          msg = `Speech recognition encountered an issue (${e.error || 'unknown'}). Please try again or type directly!`;
        }
        setVoiceError(msg);
      };
      
      rec.start();
    } catch (err: any) {
      console.error(err);
      setVoiceError(err?.message || "Could not start microphone listener.");
      setIsListening(false);
    }
  };

  // Process Voice commands via API
  const handleProcessVoicePlan = async () => {
    if (!voiceText.trim()) return;
    setIsProcessingVoice(true);
    setProposedSchedule(null);

    try {
      const response = await fetch("/api/schedule-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: voiceText })
      });

      if (!response.ok) throw new Error("Connection failed");
      const data = await response.json();
      setProposedSchedule(data);
    } catch (err) {
      console.error(err);
      alert("Ah, we couldn't process the speech. Make sure you entered your Gemini API Key in secrets.");
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const handleAcceptProposal = () => {
    if (proposedSchedule) {
      onUpdateSchedule(proposedSchedule.schedule);
      setProposedSchedule(null);
      setVoiceText("");
    }
  };

  // Edit item inline
  const startEditing = (idx: number, slot: ScheduleSlot) => {
    setEditingIndex(idx);
    setEditActivity(slot.activity);
    setEditTime(slot.time);
    setEditType(slot.type);
    setEditNotes(slot.notes || "");
  };

  const saveEdit = (idx: number) => {
    const copy = [...schedule];
    copy[idx] = {
      activity: editActivity,
      time: editTime,
      type: editType,
      durationMinutes: copy[idx].durationMinutes,
      notes: editNotes
    };
    onUpdateSchedule(copy);
    setEditingIndex(null);
  };

  const deleteSlot = (idx: number) => {
    const copy = [...schedule];
    copy.splice(idx, 1);
    onUpdateSchedule(copy);
    if (editingIndex === idx) {
      setEditingIndex(null);
    }
  };

  const clearTimeline = () => {
    onUpdateSchedule([]);
    setIsConfirmingClear(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Configuration Header Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Working Hours settings */}
        <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <Clock className="w-4 h-4 text-indigo-400" />
            Working Window
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">Start Hour</label>
              <input
                id="avail-hours-start"
                type="time"
                value={availableHoursStart}
                onChange={(e) => setAvailableHoursStart(e.target.value)}
                className="w-full pl-2 pr-0.5 py-1.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-bold font-mono focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">End Hour</label>
              <input
                id="avail-hours-end"
                type="time"
                value={availableHoursEnd}
                onChange={(e) => setAvailableHoursEnd(e.target.value)}
                className="w-full pl-2 pr-0.5 py-1.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-bold font-mono focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>
        </div>

        {/* Add routine item */}
        <div className="md:col-span-2 bg-slate-900/40 p-5 rounded-3xl border border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <CalendarDays className="w-4 h-4 text-indigo-400" />
            Configure Routine (Meetings, Gym, Lectures)
          </h3>

          <form onSubmit={handleAddRoutine} className="space-y-3 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Block Name</label>
                <input
                  id="routine-name"
                  type="text"
                  required
                  placeholder="e.g., Gym workout"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-3.5 py-1.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Start Time</label>
                <input
                  id="routine-start"
                  type="time"
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-300 text-xs font-semibold focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">End Time</label>
                <input
                  id="routine-end"
                  type="time"
                  value={eventEnd}
                  onChange={(e) => setEventEnd(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-300 text-xs font-semibold focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            {/* Weekdays selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-850/50">
              <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest px-1 mr-1">Days:</span>
                {WEEKDAYS.map(day => {
                  const active = routineWeekdays.includes(day);
                  const letter = day.slice(0, 3);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleRoutineDay(day)}
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

              <button
                id="add-routine-btn"
                type="submit"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Slot</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* NEW SECTION: Voice Scheduling & Speaking */}
      <div className="bg-gradient-to-tr from-indigo-950/20 to-purple-950/20 p-6 rounded-3xl border border-indigo-500/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Mic className="w-5 h-5 text-pink-400 animate-pulse" />
              Voice-to-Schedule Companion 🌸
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Tell the AI friend your daily plans and routine, and let us block your hours dynamically.</p>
          </div>

          <button
            onClick={startListening}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer transition-all ${
              isListening 
                ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse" 
                : "bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4 text-white" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-indigo-400" />
                <span>Speak Plans</span>
              </>
            )}
          </button>
        </div>

        {voiceError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl text-xs flex gap-2 items-start relative animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 pr-6">
              <span className="font-extrabold block">Voice Activation Alert</span>
              <p className="mt-0.5 text-slate-300 leading-relaxed">{voiceError}</p>
            </div>
            <button 
              onClick={() => setVoiceError(null)}
              className="p-1 hover:bg-rose-500/15 rounded-lg text-rose-400 hover:text-white transition-all cursor-pointer absolute top-3 right-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="space-y-3">
          <textarea
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
            placeholder="Type or speak out your plan: e.g., 'Today I want to study Calculus for 3 hours, then I have dentist appointment at 3:00pm, and I want a workout in the evening...'"
            className="w-full h-24 p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all leading-relaxed"
          />

          <div className="flex justify-end">
            <button
              disabled={!voiceText.trim() || isProcessingVoice}
              onClick={handleProcessVoicePlan}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessingVoice ? "Processing..." : "Submit"}</span>
            </button>
          </div>
        </div>

        {/* Display Proposed voice schedule for user acceptance */}
        {proposedSchedule && (
          <div className="bg-slate-900/60 border border-indigo-500/20 rounded-2xl p-5 space-y-4 animate-fadeIn">
            <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex gap-2.5 items-start">
              <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-indigo-300">Proposed Schedule Suggestion:</h4>
                <p className="text-xs text-slate-300 mt-1 italic font-medium">"{proposedSchedule.suggestionText}"</p>
              </div>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {proposedSchedule.schedule.map((slot, index) => (
                <div key={index} className="px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-slate-500 font-bold mr-2">{slot.time}</span>
                    <span className="font-bold text-slate-200">{slot.activity}</span>
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 bg-slate-900 text-indigo-400 rounded">
                    {slot.type}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setProposedSchedule(null)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Decline Plan</span>
              </button>
              <button
                onClick={handleAcceptProposal}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept Plan</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Day-by-Day Action Matrix */}
      <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800 mb-3">
          <CalendarDays className="w-4 h-4 text-indigo-400" />
          Weekly Action Matrix Planner
        </h3>
        <p className="text-[11px] text-slate-400 mb-4">A complete horizontal bird's-eye matrix showing routines, habits, and goals assigned to each weekday.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {WEEKDAYS.map((day) => {
            // Find routines for this day
            const dayRoutines = routineEvents.filter(r => (r.weekdays || WEEKDAYS).includes(day));
            // Find habits for this day
            const dayHabits = habits.filter(h => (h.weekdays || WEEKDAYS).includes(day));
            // Find goals for this day
            const dayGoals = goals.filter(g => (g.weekdays || WEEKDAYS).includes(day));

            const totalItemsCount = dayRoutines.length + dayHabits.length + dayGoals.length;

            return (
              <div 
                key={day}
                className="p-3 bg-slate-950/30 border border-slate-850 rounded-2xl flex flex-col justify-between min-h-[150px] hover:border-indigo-500/30 transition-all group"
              >
                <div>
                  <div className="flex justify-between items-center mb-2 border-b border-slate-850 pb-1">
                    <span className="text-xs font-black text-slate-200">{day.slice(0, 3)}</span>
                    {totalItemsCount > 0 && (
                      <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 rounded-full">
                        {totalItemsCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 overflow-hidden max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                    {/* Routines */}
                    {dayRoutines.map((r, idx) => (
                      <div key={`r-${idx}`} className="text-[9px] text-slate-300 truncate bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1" title={`${r.name} (${r.start}-${r.end})`}>
                        <span className="w-1 h-1 bg-indigo-400 rounded-full flex-shrink-0"></span>
                        <span className="truncate">{r.name}</span>
                      </div>
                    ))}
                    {/* Habits */}
                    {dayHabits.map((h, idx) => (
                      <div key={`h-${idx}`} className="text-[9px] text-slate-300 truncate bg-pink-950/15 px-1.5 py-0.5 rounded border border-pink-500/10 flex items-center gap-1" title={h.title}>
                        <span className="w-1 h-1 bg-pink-400 rounded-full flex-shrink-0"></span>
                        <span className="truncate">{h.title}</span>
                      </div>
                    ))}
                    {/* Goals */}
                    {dayGoals.map((g, idx) => (
                      <div key={`g-${idx}`} className="text-[9px] text-slate-300 truncate bg-emerald-950/15 px-1.5 py-0.5 rounded border border-emerald-500/10 flex items-center gap-1" title={g.title}>
                        <span className="w-1 h-1 bg-emerald-400 rounded-full flex-shrink-0"></span>
                        <span className="truncate">{g.title}</span>
                      </div>
                    ))}

                    {totalItemsCount === 0 && (
                      <p className="text-[8px] text-slate-600 italic py-6 text-center">Rest Day 🍃</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Core section split: Left Routine list, Right Schedule Output */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 1 Col: Routine slot list */}
        <div className="space-y-4">
          <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Routine Blockers</h3>
            
            {routineEvents.length > 0 ? (
              <div className="space-y-2.5">
                {routineEvents.map((evt) => (
                  <div key={evt.name} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col gap-2 text-xs font-medium">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-200">{evt.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{evt.start} - {evt.end}</p>
                      </div>
                      <button
                        id={`delete-routine-btn-${evt.name}`}
                        onClick={() => onDeleteRoutineEvent(evt.name)}
                        className="p-1 text-slate-500 hover:text-pink-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Weekday indicators toggler */}
                    <div className="flex gap-1 pt-1.5 border-t border-slate-900">
                      {WEEKDAYS.map(day => {
                        const activeDays = evt.weekdays || WEEKDAYS;
                        const active = activeDays.includes(day);
                        const letter = day.slice(0, 1);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => {
                              if (onToggleRoutineEventDay) {
                                onToggleRoutineEventDay(evt.name, day);
                              }
                            }}
                            className={`w-4.5 h-4.5 rounded text-[8px] font-black transition-all flex items-center justify-center border ${
                              active 
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" 
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
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No routine events. Add college classes, sleep slots, or meetings to structure schedule blocking.</p>
            )}
          </div>
        </div>

        {/* Right 2 Cols: Schedule timeline with in-line edits */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 flex flex-col h-full min-h-[400px]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                  AI Day Timeline Plan
                </h3>
              </div>

              <button
                id="optimize-schedule-page-btn"
                disabled={isGenerating}
                onClick={onGenerate}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/15 disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                <span>{isGenerating ? "Assembling schedule..." : "AI Time block"}</span>
              </button>
            </div>

            {isGenerating ? (
              <div className="my-auto py-16 text-center flex flex-col items-center justify-center">
                <Compass className="w-8 h-8 text-indigo-500 animate-spin" />
                <h4 className="text-slate-300 font-bold mt-3">Synthesizing optimal day schedule...</h4>
                <p className="text-[10px] text-slate-500 mt-1">Gemini is finding optimal slots to bypass friction and maintain flow state.</p>
              </div>
            ) : schedule.length > 0 ? (
              <div className="space-y-3 flex-1 flex flex-col">
                <div className="mb-2">
                  {!isConfirmingClear ? (
                    <button
                      id="clear-all-schedule-btn"
                      onClick={() => setIsConfirmingClear(true)}
                      className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Entire Timeline</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 bg-rose-950/20 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between px-4 gap-2 animate-fadeIn">
                      <span className="text-[10px] font-black uppercase text-rose-300 tracking-wider">Remove all slots?</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={clearTimeline}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                        >
                          Yes, Clear All
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingClear(false)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {schedule.map((slot, index) => {
                  const isEditing = editingIndex === index;
                  return (
                    <div 
                      key={index} 
                      className={`p-4 rounded-2xl border relative pl-5 flex flex-col gap-3 transition-all ${
                        slot.type === "task" 
                          ? "bg-indigo-950/10 border-indigo-500/25" 
                          : slot.type === "routine" 
                            ? "bg-slate-950/40 border-slate-850" 
                            : "bg-slate-950/20 border-slate-900 text-slate-500"
                      } ${isEditing ? "ring-2 ring-indigo-500 border-transparent bg-slate-900/80" : ""}`}
                    >
                      <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-full" style={{
                        backgroundColor: slot.type === "task" ? "#6366f1" : slot.type === "routine" ? "#94a3b8" : "#475569"
                      }} />

                      {isEditing ? (
                        <div className="space-y-3 animate-fadeIn">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Activity Name</label>
                              <input
                                type="text"
                                value={editActivity}
                                onChange={(e) => setEditActivity(e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Time Range</label>
                              <input
                                type="text"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Type</label>
                              <select
                                value={editType}
                                onChange={(e) => setEditType(e.target.value as any)}
                                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                              >
                                <option value="task">Task</option>
                                <option value="routine">Routine</option>
                                <option value="break">Break</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Notes / Advice</label>
                              <input
                                type="text"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1.5">
                            <button
                              onClick={() => deleteSlot(index)}
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                            >
                              Delete Slot
                            </button>
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(index)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 group">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold font-mono text-slate-500">{slot.time}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase ${
                                slot.type === "task" ? "bg-indigo-950 text-indigo-400" : slot.type === "routine" ? "bg-slate-900 text-slate-400" : "bg-slate-950 text-slate-600"
                              }`}>{slot.type}</span>
                            </div>
                            <h4 className={`text-sm font-bold mt-1 ${slot.type === "break" ? "text-slate-500" : "text-white"}`}>
                              {slot.activity}
                            </h4>
                            {slot.notes && (
                              <p className="text-[10px] text-slate-500 italic leading-relaxed font-semibold mt-1">
                                "{slot.notes}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditing(index, slot)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                              title="Edit slot info"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteSlot(index)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                              title="Remove slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
              <div className="my-auto py-16 text-center">
                <Compass className="w-8 h-8 text-slate-700 mx-auto opacity-30" />
                <p className="text-xs text-slate-400 mt-3 font-medium">No timeline built yet.</p>
                <p className="text-[10px] text-slate-500 mt-1">Configure routine events, adjust hours start/end, and hit AI Time block to create perfect structured timeline!</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
