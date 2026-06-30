import React, { useState } from "react";
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Sparkles,
  Clock,
  Compass,
  AlertOctagon,
  BookOpen,
  CheckCircle2,
  Play,
  AlertCircle,
  X,
  FileText,
  Workflow
} from "lucide-react";
import { Task, SubTask, RescuePlan, PriorityLevel } from "../types";
import { motion, AnimatePresence } from "motion/react";

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

interface TaskManagementProps {
  tasks: Task[];
  onAddTask: (taskData: Omit<Task, "id" | "userId" | "createdAt">) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  isGeneratingBreakdown: boolean;
  onGenerateBreakdown: (taskId: string) => void;
  isGeneratingRescue: boolean;
  onGenerateRescue: (taskId: string) => void;
}

export default function TaskManagement({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  isGeneratingBreakdown,
  onGenerateBreakdown,
  isGeneratingRescue,
  onGenerateRescue
}: TaskManagementProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // State for Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("Normal");
  const [category, setCategory] = useState("Study");
  const [estimatedDuration, setEstimatedDuration] = useState("1 hour");
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>("Medium");
  const [notes, setNotes] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  // Detailed Modal for AI Breakdown / Rescue
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title,
      description,
      deadline,
      priority,
      category,
      estimatedDuration,
      difficulty,
      notes,
      status: "Pending"
    });

    // Reset Form
    setTitle("");
    setDescription("");
    setDeadline("");
    setPriority("Normal");
    setCategory("Study");
    setEstimatedDuration("1 hour");
    setDifficulty("Medium");
    setNotes("");
    setAttachmentName("");
    setIsModalOpen(false);
  };

  // Checkbox for subtask completion
  const handleToggleSubtask = (taskId: string, subtaskId: string, currentCompleted: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.map(sub => {
      if (sub.id === subtaskId) {
        return { ...sub, completed: !currentCompleted };
      }
      return sub;
    });

    onUpdateTask(taskId, { subtasks: updatedSubtasks });

    // Also update selectedTask if open
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, subtasks: updatedSubtasks });
    }
  };

  // Filtered tasks logic
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;
    const matchesCategory = categoryFilter === "All" || task.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || task.status === statusFilter;

    return matchesSearch && matchesPriority && matchesCategory && matchesStatus;
  });

  // Check if task is near due (under 24 hours)
  const isRescueEligible = (task: Task) => {
    if (!task.deadline || task.status === "Completed") return false;
    const hoursLeft = (new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 24;
  };

  return (
    <div className="space-y-6 text-[#f8fafc]">

      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 border border-white/10 p-6 rounded-3xl">
        <div className="flex-1 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              id="task-search-input"
              type="text"
              placeholder="SEARCH ALL TASKS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              id="filter-priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-3 bg-[#050507] border border-white/10 rounded-2xl text-white/50 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Very Important">🔴 Very Important</option>
              <option value="Important">🟠 Important</option>
              <option value="Normal">🟡 Normal</option>
              <option value="Low">🔵 Low Priority</option>
              <option value="Remember Me">🟣 Remember Me</option>
            </select>

            <select
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 bg-[#050507] border border-white/10 rounded-2xl text-white/50 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Study">📚 Study Streams</option>
              <option value="Work">💻 Work Streams</option>
              <option value="Workout">🏋️ Workouts</option>
              <option value="Personal">🏡 Personal</option>
            </select>

            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-[#050507] border border-white/10 rounded-2xl text-white/50 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <button
          id="open-create-task-modal-btn"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <motion.div
              id={`task-card-${task.id}`}
              key={task.id}
              layout
              className={`p-6 rounded-3xl border relative overflow-hidden group flex flex-col justify-between min-h-[220px] transition-all ${
                task.status === "Completed" ? "opacity-50 bg-white/5 border-white/5" : "bg-white/5 border-white/10"
              }`}
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold font-mono uppercase bg-slate-950 text-slate-400 border border-slate-800">
                      {task.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold font-mono uppercase border ${
                      task.priority === "Very Important"
                        ? "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse"
                        : task.priority === "Important"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : task.priority === "Normal"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : (task.priority === "Low" || task.priority === "Low Priority")
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                    }`}>
                      {task.priority}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    {task.deadline ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No deadline"}
                  </span>
                </div>

                {/* Title & Description */}
                <div className="mt-3">
                  <h3 className={`text-base font-bold text-white tracking-tight flex items-center gap-2 ${task.status === "Completed" ? "line-through text-slate-500" : ""}`}>
                    <span className="shrink-0">{getPriorityIcon(task.priority)}</span>
                    <span>{task.title}</span>
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 font-medium leading-relaxed">
                    {task.description || "No description provided."}
                  </p>
                </div>
              </div>

              {/* Action and status footer */}
              <div className="mt-4 pt-4 border-t border-slate-850 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <select
                    id={`task-status-select-${task.id}`}
                    value={task.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as any;
                      onUpdateTask(task.id, {
                        status: nextStatus,
                        completedAt: nextStatus === "Completed" ? new Date().toISOString() : undefined
                      });
                    }}
                    className="px-2.5 py-1 bg-slate-950/40 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* AI Breakdown button / display indicator */}
                  <button
                    id={`open-breakdown-btn-${task.id}`}
                    onClick={() => {
                      setSelectedTask(task);
                      if (!task.subtasks) {
                        onGenerateBreakdown(task.id);
                      }
                    }}
                    className="px-2.5 py-1 bg-gradient-to-r from-indigo-950 to-purple-950 hover:from-indigo-900 hover:to-purple-900 border border-indigo-500/20 rounded-lg text-[10px] font-bold text-indigo-300 flex items-center gap-1 transition-all"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>{task.subtasks ? "AI Breakdown" : "Break Down"}</span>
                  </button>

                  {/* Deadline Rescue mode option */}
                  {isRescueEligible(task) && (
                    <button
                      id={`open-rescue-btn-${task.id}`}
                      onClick={() => {
                        setSelectedTask(task);
                        if (!task.rescuePlan) {
                          onGenerateRescue(task.id);
                        }
                      }}
                      className="px-2.5 py-1 bg-rose-950/30 hover:bg-rose-900/30 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                    >
                      <AlertOctagon className="w-3 h-3 text-rose-400 animate-pulse" />
                      <span>Rescue Plan</span>
                    </button>
                  )}

                  <button
                    id={`delete-task-btn-${task.id}`}
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 text-slate-500 hover:text-pink-500 hover:bg-pink-950/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="md:col-span-2 text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl">
            <Compass className="w-8 h-8 text-slate-600 mx-auto animate-spin" />
            <h3 className="text-slate-300 font-bold mt-3">No matching tasks found</h3>
            <p className="text-xs text-slate-500 mt-1">Refine your search parameters or add a new task.</p>
          </div>
        )}
      </div>

      {/* CREATE TASK MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-indigo-400" />
                  Create Productivity Task
                </h2>
                <button
                  id="close-create-task-modal-btn"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Title *</label>
                  <input
                    id="new-task-title"
                    type="text"
                    required
                    placeholder="e.g. Finish Algorithms Assignment"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                    <select
                      id="new-task-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-indigo-500/50 cursor-pointer font-medium"
                    >
                      <option value="Study">📚 Study</option>
                      <option value="Work">💻 Work</option>
                      <option value="Workout">🏋️ Workout</option>
                      <option value="Personal">🏡 Personal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deadline</label>
                    <input
                      id="new-task-deadline"
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Priority</label>
                    <select
                      id="new-task-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-indigo-500/50 cursor-pointer font-medium"
                    >
                      <option value="Very Important">🔴 Very Important</option>
                      <option value="Important">🟠 Important</option>
                      <option value="Normal">🟡 Normal</option>
                      <option value="Low Priority">🔵 Low Priority</option>
                      <option value="Remember Me">🟣 Remember Me</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Difficulty</label>
                    <select
                      id="new-task-difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:border-indigo-500/50 cursor-pointer font-medium"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estimated Duration</label>
                    <input
                      id="new-task-duration"
                      type="text"
                      placeholder="e.g. 2 hours"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Attachment Reference</label>
                    <input
                      id="new-task-attachment"
                      type="text"
                      placeholder="e.g. slides.pdf or link"
                      value={attachmentName}
                      onChange={(e) => setAttachmentName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes / Context</label>
                  <textarea
                    id="new-task-notes"
                    placeholder="Add brief helper notes or references..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    id="cancel-create-task-btn"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-create-task-btn"
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 hover:opacity-95 transition-all"
                  >
                    Build Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED TASK VIEW: AI BREAKDOWN & RESCUE TIMELINE */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-850 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 relative z-10 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                <div>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold font-mono bg-slate-950 text-slate-500 border border-slate-800">
                    {selectedTask.category}
                  </span>
                  <h2 className="text-xl font-bold text-white tracking-tight mt-1">{selectedTask.title}</h2>
                </div>
                <button
                  id="close-task-detail-modal-btn"
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Task Details Info */}
              {selectedTask.description && (
                <div className="bg-slate-950/20 p-4 rounded-xl border border-slate-800/60">
                  <p className="text-xs font-bold text-slate-500 font-mono uppercase tracking-wider mb-1">Description</p>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">{selectedTask.description}</p>
                </div>
              )}

              {/* Tab/Details selection inside detail modal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* AI Task Breakdown Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      AI Subtasks & Plan
                    </h3>

                    {selectedTask.difficultyScore && (
                      <span className="text-[10px] font-bold font-mono text-slate-500">
                        Difficulty: <span className="text-indigo-400">{selectedTask.difficultyScore}/10</span>
                      </span>
                    )}
                  </div>

                  {isGeneratingBreakdown ? (
                    <div className="py-12 flex flex-col items-center justify-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800/80">
                      <Compass className="w-8 h-8 text-indigo-500 animate-spin" />
                      <p className="text-xs text-slate-400 mt-2 font-semibold">Gemini is structuring your plan...</p>
                    </div>
                  ) : selectedTask.subtasks && selectedTask.subtasks.length > 0 ? (
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {selectedTask.subtasks.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-start gap-2.5 p-2.5 bg-slate-950/40 rounded-xl border border-slate-850 hover:border-slate-800 transition-colors"
                        >
                          <input
                            id={`toggle-subtask-${sub.id}`}
                            type="checkbox"
                            checked={sub.completed}
                            onChange={() => handleToggleSubtask(selectedTask.id, sub.id, sub.completed)}
                            className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-0 cursor-pointer mt-0.5"
                          />
                          <div className="min-w-0">
                            <h4 className={`text-xs font-bold ${sub.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                              {sub.title}
                            </h4>
                            {sub.description && (
                              <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{sub.description}</p>
                            )}
                            <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-500 font-mono">
                              <Clock className="w-3 h-3" />
                              <span>{sub.durationMinutes} mins</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800/80">
                      <p className="text-xs text-slate-400 font-medium">No subtasks generated yet.</p>
                      <button
                        id="modal-generate-breakdown-btn"
                        onClick={() => onGenerateBreakdown(selectedTask.id)}
                        className="mt-3 px-4 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/20 text-indigo-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        Generate with Gemini
                      </button>
                    </div>
                  )}

                  {/* Tips & Resources List if exist */}
                  {selectedTask.tips && selectedTask.tips.length > 0 && (
                    <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-850/80 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        AI Focus Tips
                      </p>
                      <ul className="space-y-1 text-[10px] text-slate-300 list-disc list-inside leading-relaxed pl-1">
                        {selectedTask.tips.slice(0, 3).map((tip, idx) => (
                          <li key={idx} className="font-medium">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Deadline Rescue Plan Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" />
                    Deadline Rescue Timeline
                  </h3>

                  {isGeneratingRescue ? (
                    <div className="py-12 flex flex-col items-center justify-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800/80">
                      <Compass className="w-8 h-8 text-rose-500 animate-spin" />
                      <p className="text-xs text-slate-400 mt-2 font-semibold">Generating crisis containment roadmap...</p>
                    </div>
                  ) : selectedTask.rescuePlan ? (
                    <div className="space-y-4">
                      {/* Risk banner */}
                      <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-mono font-bold text-rose-400 uppercase">RISK LEVEL: {selectedTask.rescuePlan.riskLevel}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">Estimated Probability: {selectedTask.rescuePlan.completionProbability}%</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-rose-300">{selectedTask.rescuePlan.completionProbability}%</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 italic leading-relaxed font-medium bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                        "{selectedTask.rescuePlan.survivalStrategy}"
                      </p>

                      {/* Rescue timeline */}
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {selectedTask.rescuePlan.rescueTimeline?.map((slot, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-950/30 border border-slate-850 rounded-xl flex items-start justify-between gap-2 text-xs">
                            <div>
                              <span className="text-[9px] font-bold font-mono text-slate-500">{slot.timeSlot}</span>
                              <h4 className="font-bold text-slate-200 mt-0.5">{slot.focus}</h4>
                              <p className="text-[9px] text-slate-500 mt-0.5">Goal: {slot.deliverable}</p>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${
                              slot.urgency === "High" ? "bg-rose-950/30 text-rose-400" : "bg-slate-950 text-slate-500"
                            }`}>{slot.urgency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800/80">
                      {isRescueEligible(selectedTask) ? (
                        <>
                          <p className="text-xs text-slate-400 font-medium">Rescue plan is available for this urgent task.</p>
                          <button
                            id="modal-generate-rescue-btn"
                            onClick={() => onGenerateRescue(selectedTask.id)}
                            className="mt-3 px-4 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                          >
                            Activate Rescue Mode
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 font-medium px-4 leading-relaxed">
                          Rescue Mode is an emergency option that unlocks when a task is due within 24 hours. Keep planning ahead!
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              <div className="pt-2 border-t border-slate-800/60 flex justify-end gap-3">
                <button
                  id="modal-close-btn"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close Roadmap
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
