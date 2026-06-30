import React, { useState, useRef, useEffect } from "react";
import { 
  Bookmark, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  File as FileIcon, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  Bell, 
  Calendar, 
  Sparkles, 
  Clock, 
  X, 
  Upload, 
  AlertCircle,
  FolderHeart,
  ExternalLink,
  ChevronRight,
  Eye,
  BookOpen
} from "lucide-react";
import { RememberMeItem, PriorityLevel } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface RememberMeProps {
  items: RememberMeItem[];
  onAddItem: (item: Omit<RememberMeItem, "id" | "userId" | "createdAt">) => void;
  onUpdateItem: (id: string, updates: Partial<RememberMeItem>) => void;
  onDeleteItem: (id: string) => void;
}

const prioritiesList: { level: PriorityLevel; label: string; color: string; bg: string; dot: string }[] = [
  { level: "Very Important", label: "Very Important", color: "text-rose-400 border-rose-500/30", bg: "bg-rose-500/10", dot: "🔴" },
  { level: "Important", label: "Important", color: "text-amber-400 border-amber-500/30", bg: "bg-amber-500/10", dot: "🟠" },
  { level: "Normal", label: "Normal", color: "text-emerald-400 border-emerald-500/30", bg: "bg-emerald-500/10", dot: "🟡" },
  { level: "Low Priority", label: "Low Priority", color: "text-blue-400 border-blue-500/30", bg: "bg-blue-500/10", dot: "🔵" },
  { level: "Low", label: "Low Priority", color: "text-blue-400 border-blue-500/30", bg: "bg-blue-500/10", dot: "🔵" },
  { level: "Remember Me", label: "Remember Me", color: "text-purple-400 border-purple-500/30", bg: "bg-purple-500/10", dot: "🟣" }
];

export default function RememberMe({ items, onAddItem, onUpdateItem, onDeleteItem }: RememberMeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("all");
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<'text' | 'image' | 'video' | 'document' | 'other'>('text');
  const [priority, setPriority] = useState<PriorityLevel>('Normal');
  const [reminderTime, setReminderTime] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [viewingItem, setViewingItem] = useState<RememberMeItem | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.fileName && item.fileName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedTypeFilter === "all" || item.type === selectedTypeFilter;
    const matchesPriority = selectedPriorityFilter === "all" || item.priority === selectedPriorityFilter;
    return matchesSearch && matchesType && matchesPriority;
  });

  // Handle Drag Events for local file upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setFileName(file.name);
    // Determine type from file extension/mime
    const mime = file.type;
    if (mime.startsWith("image/")) {
      setType("image");
    } else if (mime.startsWith("video/")) {
      setType("video");
    } else if (mime.startsWith("application/pdf") || mime.includes("word") || mime.includes("document")) {
      setType("document");
    } else {
      setType("other");
    }

    // Generate simulated URL so that preview loads immediately
    const objectUrl = URL.createObjectURL(file);
    setMediaUrl(objectUrl);
  };

  const openAddModal = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setType("text");
    setPriority("Normal");
    setReminderTime("");
    setMediaUrl("");
    setFileName("");
    setIsFormOpen(true);
  };

  const openEditModal = (item: RememberMeItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setType(item.type);
    setPriority(item.priority);
    setReminderTime(item.reminderTime || "");
    setMediaUrl(item.mediaUrl || "");
    setFileName(item.fileName || "");
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const itemData = {
      title,
      content,
      type,
      priority,
      reminderTime: reminderTime || undefined,
      mediaUrl: mediaUrl || undefined,
      fileName: fileName || undefined,
      reminded: false
    };

    if (editingId) {
      onUpdateItem(editingId, itemData);
    } else {
      onAddItem(itemData);
    }

    setIsFormOpen(false);
  };

  // Dynamic proactive recommendations banner
  const getProactiveReminders = () => {
    const reminders = [];
    const urgentItems = items.filter(i => i.priority === "Very Important" || i.priority === "Important");
    
    // Sort reminders with upcoming dates
    const itemsWithReminders = items
      .filter(i => i.reminderTime && new Date(i.reminderTime) > new Date())
      .sort((a, b) => new Date(a.reminderTime!).getTime() - new Date(b.reminderTime!).getTime());

    if (itemsWithReminders.length > 0) {
      const nearest = itemsWithReminders[0];
      const timeStr = new Date(nearest.reminderTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(nearest.reminderTime!).toLocaleDateString([], { month: 'short', day: 'numeric' });
      reminders.push({
        type: "timer",
        title: `Proactive Alert: Review ${nearest.title}`,
        text: `Configured to trigger on ${dateStr} at ${timeStr}. Keep this fresh in mind.`,
        item: nearest
      });
    }

    if (urgentItems.length > 0) {
      const mainUrgent = urgentItems[0];
      reminders.push({
        type: "critical",
        title: `Priority Warning: "${mainUrgent.title}"`,
        text: `Identified as highly critical context. Don't let this item fall out of your short-term focus.`,
        item: mainUrgent
      });
    }

    return reminders;
  };

  const proactiveReminders = getProactiveReminders();

  const getIconForType = (itemType: string) => {
    switch (itemType) {
      case "image": return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      case "video": return <VideoIcon className="w-4 h-4 text-pink-400" />;
      case "document": return <FileIcon className="w-4 h-4 text-amber-400" />;
      case "text": return <FileText className="w-4 h-4 text-blue-400" />;
      default: return <FileIcon className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6" id="remember-me-workspace">
      
      {/* Upper Bento-Style Header with AI Companion banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-slate-900/40 border border-white/5 p-6 rounded-3xl flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Proactive Knowledge Locker
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">
              Remember Me Hub
            </h1>
            <p className="text-xs text-white/50 leading-relaxed max-w-xl">
              Keep critical documents, dynamic reminders, project codes, media uploads, and mental reminders in one unified spot. Our proactive assistant highlights saved items based on urgency so you never lose key details.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={openAddModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Store New Item</span>
            </button>
          </div>
        </div>

        {/* AI Reminders Panel */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-white/5 p-6 rounded-3xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Bell className="w-4 h-4 text-pink-400 animate-bounce" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Proactive Assistant Dispatcher</span>
            </div>

            <div className="space-y-3 max-h-[140px] overflow-y-auto">
              {proactiveReminders.length > 0 ? (
                proactiveReminders.map((rem, idx) => (
                  <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">{rem.title}</p>
                    <p className="text-[9px] text-white/60 leading-tight">{rem.text}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center border border-dashed border-white/5 rounded-2xl">
                  <FolderHeart className="w-8 h-8 text-white/10 mx-auto mb-1.5" />
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Brain clear & focused</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-[8px] text-white/20 uppercase font-mono mt-4">
            System uptime matching optimal cognitive loads
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/30 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved memories, files..."
            className="w-full pl-9 pr-4 py-2 bg-black/30 border border-white/5 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Media Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-white/40 uppercase font-black">Type:</span>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-black/30 text-white/80 border border-white/5 rounded-xl px-2.5 py-1.5 text-[10px] uppercase font-bold focus:outline-none focus:border-indigo-500/50"
            >
              <option value="all">ALL MEDIA</option>
              <option value="text">📄 TEXT</option>
              <option value="image">🖼️ IMAGE</option>
              <option value="video">🎥 VIDEO</option>
              <option value="document">📁 DOCUMENT</option>
              <option value="other">📎 OTHER</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-white/40 uppercase font-black">Priority:</span>
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="bg-black/30 text-white/80 border border-white/5 rounded-xl px-2.5 py-1.5 text-[10px] uppercase font-bold focus:outline-none focus:border-indigo-500/50"
            >
              <option value="all">ALL PRIORITIES</option>
              <option value="Very Important">🔴 VERY IMPORTANT</option>
              <option value="Important">🟠 IMPORTANT</option>
              <option value="Normal">🟡 NORMAL</option>
              <option value="Low">🔵 LOW</option>
              <option value="Remember Me">🟣 REMEMBER ME</option>
            </select>
          </div>
        </div>
      </div>

      {/* Storage Vault Cards Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const priorityDetail = prioritiesList.find(p => p.level === item.priority) || prioritiesList[2];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-[#0b0c10] border border-white/5 hover:border-white/10 p-5 rounded-2xl flex flex-col justify-between space-y-4 group transition-all"
              >
                {/* Header info */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg text-[9px] uppercase font-black text-white/80 border border-white/5">
                      {getIconForType(item.type)}
                      <span>{item.type}</span>
                    </span>

                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${priorityDetail.color} ${priorityDetail.bg}`}>
                      {priorityDetail.dot} {priorityDetail.label}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight truncate flex items-center gap-1.5">
                    <span className="shrink-0">{priorityDetail.dot}</span>
                    <span>{item.title}</span>
                  </h3>

                  <p className="text-xs text-white/60 leading-relaxed font-medium line-clamp-3 whitespace-pre-line">
                    {item.content}
                  </p>
                </div>

                {/* Media Visualization block */}
                {item.mediaUrl && (
                  <div 
                    onClick={() => setViewingItem(item)}
                    className="bg-black/40 border border-white/5 rounded-xl overflow-hidden aspect-video relative group/media cursor-pointer hover:border-indigo-500/30 transition-all"
                  >
                    {/* Hover read overlay */}
                    <div className="absolute inset-0 bg-indigo-950/45 opacity-0 group-hover/media:opacity-100 transition-opacity flex flex-col items-center justify-center z-10 gap-1.5">
                      <Eye className="w-5 h-5 text-white animate-bounce" />
                      <span className="bg-indigo-600 text-white font-black uppercase text-[8px] tracking-widest px-2.5 py-1 rounded-md shadow-lg">
                        Read & View In-App
                      </span>
                    </div>

                    {item.type === "image" && (
                      <img 
                        src={item.mediaUrl} 
                        alt={item.title} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-500"
                      />
                    )}
                    {item.type === "video" && (
                      <video 
                        src={item.mediaUrl} 
                        className="w-full h-full object-cover"
                      />
                    )}
                    {(item.type === "document" || item.type === "other") && (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center space-y-1">
                        <FileIcon className="w-8 h-8 text-indigo-400" />
                        <p className="text-[10px] text-white/80 font-bold truncate max-w-full px-4">{item.fileName || "Stored Document"}</p>
                        <span className="text-[9px] font-black uppercase text-indigo-400 flex items-center gap-1 mt-1">
                          <span>Read File</span>
                          <BookOpen className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Controls */}
                <div className="border-t border-white/5 pt-3 mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[9px] text-white/30 font-bold uppercase">
                    <Clock className="w-3 h-3" />
                    <span>
                      {item.reminderTime ? (
                        <span className="text-indigo-400">
                          Alarm: {new Date(item.reminderTime).toLocaleDateString()}
                        </span>
                      ) : (
                        "No Reminder Set"
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setViewingItem(item)}
                      className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      title="Read & View in-app"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer"
                      title="Edit Item"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Delete Stored Memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-3xl bg-slate-900/10 space-y-3">
            <Bookmark className="w-12 h-12 text-white/10 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase text-white tracking-widest">No Items Saved</h3>
              <p className="text-[10px] text-white/40 uppercase font-semibold">Store important files, passwords, notes or reminders to begin.</p>
            </div>
          </div>
        )}
      </div>

      {/* Cognitive Media & Document Reader Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-3xl bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 relative shadow-2xl space-y-6 max-h-[90vh] flex flex-col"
          >
            {/* Close Button */}
            <button
              onClick={() => setViewingItem(null)}
              className="absolute top-4 right-4 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-colors cursor-pointer z-50"
              title="Close Reader"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="border-b border-white/5 pb-4 shrink-0 pr-10">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg text-[9px] uppercase font-black text-indigo-400 border border-indigo-500/20">
                  {getIconForType(viewingItem.type)}
                  <span>{viewingItem.type}</span>
                </span>
                <span className="bg-white/5 px-2.5 py-1 rounded-lg text-[9px] uppercase font-black text-white/50 border border-white/5">
                  Priority: {viewingItem.priority}
                </span>
                {viewingItem.reminderTime && (
                  <span className="bg-amber-500/10 px-2.5 py-1 rounded-lg text-[9px] uppercase font-black text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    <span>Remind At: {new Date(viewingItem.reminderTime).toLocaleString()}</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-tight">
                {viewingItem.title}
              </h2>
              <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mt-1">
                Cognitive Archive Reader
              </p>
            </div>

            {/* Scrollable Reader Core Panel */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              {/* Media Content Box */}
              {viewingItem.mediaUrl && (
                <div className="bg-black/60 border border-white/5 rounded-2xl overflow-hidden relative">
                  {viewingItem.type === "image" && (
                    <div className="flex flex-col items-center">
                      <img 
                        src={viewingItem.mediaUrl} 
                        alt={viewingItem.title} 
                        referrerPolicy="no-referrer"
                        className="max-h-[350px] w-auto object-contain mx-auto rounded-xl shadow-lg"
                      />
                      <div className="w-full bg-slate-950/80 p-3 flex items-center justify-between border-t border-white/5 mt-2">
                        <span className="text-[10px] text-white/50 font-bold uppercase truncate max-w-[70%]">
                          {viewingItem.fileName || "Viewable Image Attachment"}
                        </span>
                        <a 
                          href={viewingItem.mediaUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                        >
                          <span>Full Size</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {viewingItem.type === "video" && (
                    <div className="w-full">
                      <video 
                        src={viewingItem.mediaUrl} 
                        controls 
                        className="w-full h-auto max-h-[350px] object-contain bg-black"
                      />
                      <div className="bg-slate-950/80 p-3 flex items-center justify-between border-t border-white/5">
                        <span className="text-[10px] text-white/50 font-bold uppercase truncate">
                          {viewingItem.fileName || "Media Clip"}
                        </span>
                      </div>
                    </div>
                  )}

                  {(viewingItem.type === "document" || viewingItem.type === "other") && (
                    <div className="w-full">
                      {/* PDF embedded iframe viewer */}
                      {viewingItem.fileName?.toLowerCase().endsWith('.pdf') || viewingItem.mediaUrl.includes('blob') ? (
                        <div className="w-full h-[400px]">
                          <iframe 
                            src={viewingItem.mediaUrl} 
                            title={viewingItem.title}
                            className="w-full h-full border-0 bg-slate-800"
                          />
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-3 flex flex-col items-center justify-center">
                          <FileText className="w-16 h-16 text-indigo-400 animate-pulse" />
                          <div>
                            <p className="text-xs text-white/80 font-black uppercase">{viewingItem.fileName || "Stored Document"}</p>
                            <p className="text-[10px] text-white/40 uppercase mt-1">Ready for download or reading in a new viewer tab</p>
                          </div>
                        </div>
                      )}
                      <div className="bg-slate-950/80 p-4 flex items-center justify-between border-t border-white/5">
                        <span className="text-[10px] text-white/50 font-bold uppercase truncate max-w-[70%]">
                          {viewingItem.fileName || "Document Attachment"}
                        </span>
                        <a 
                          href={viewingItem.mediaUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                        >
                          <span>Open File</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Text Description/Content Panel */}
              <div className="bg-slate-950/40 p-5 sm:p-6 rounded-2xl border border-white/5 space-y-2.5">
                <h3 className="text-[10px] uppercase font-black text-white/30 tracking-wider">
                  Text Content & Insights
                </h3>
                <p className="text-xs sm:text-sm text-white/85 font-medium leading-relaxed whitespace-pre-line tracking-wide">
                  {viewingItem.content || "No textual description stored with this memory."}
                </p>
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-white/5 pt-4 flex items-center justify-between shrink-0">
              <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">
                Safe-Cognitive Vault v1.0
              </span>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="px-5 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all cursor-pointer"
              >
                Done Reading
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Storing creation modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 relative shadow-2xl space-y-5 my-auto"
          >
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">
                {editingId ? "Modify Saved Information" : "Save Important Details"}
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Proactive Cognitive Memory Engine</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-[10px] uppercase font-black text-white/40 tracking-wider mb-1.5">Item Headline Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Campus Gym access credentials, Exam key insights..."
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Priority Dropdown */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 tracking-wider mb-1.5">Priority Rating Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-xs text-white uppercase font-bold focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="Very Important">🔴 VERY IMPORTANT</option>
                    <option value="Important">🟠 IMPORTANT</option>
                    <option value="Normal">🟡 NORMAL</option>
                    <option value="Low Priority">🔵 LOW PRIORITY</option>
                    <option value="Remember Me">🟣 REMEMBER ME</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 tracking-wider mb-1.5">Type Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-xs text-white uppercase font-bold focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="text">📄 TEXT MEMO</option>
                    <option value="image">🖼️ IMAGE POST</option>
                    <option value="video">🎥 VIDEO REEL</option>
                    <option value="document">📁 DOCUMENT/PDF</option>
                    <option value="other">📎 OTHER MEDIA</option>
                  </select>
                </div>
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-[10px] uppercase font-black text-white/40 tracking-wider mb-1.5">Information Content / Notes</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Insert notes, references, code snippets, accounts, or details to store securely..."
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 resize-none font-medium"
                />
              </div>

              {/* File Attachment Drag & Drop Area */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-black text-white/40 tracking-wider">Media Attachment / Local File</label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    dragActive 
                      ? "border-indigo-500 bg-indigo-500/5" 
                      : fileName 
                        ? "border-emerald-500/40 bg-emerald-500/5" 
                        : "border-white/5 hover:border-white/10"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={onFileChange}
                    accept="image/*,video/*,application/pdf,.doc,.docx"
                  />
                  
                  {fileName ? (
                    <div className="space-y-1">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">✓ File Selected</p>
                      <p className="text-[10px] text-white/85 font-black truncate max-w-xs mx-auto">{fileName}</p>
                      <p className="text-[8px] text-white/40 uppercase">Click to substitute</p>
                    </div>
                  ) : (
                    <div className="space-y-1 py-1 text-white/40">
                      <Upload className="w-5 h-5 mx-auto mb-1 text-white/20" />
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">Drag and drop file or click to browse</p>
                      <p className="text-[7px] uppercase">Accepts Images, PDFs, and Videos</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Web URL & Reminders */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 tracking-wider mb-1.5">Media web-url link</label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="e.g. https://gdrive/doc"
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-[10px] text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 tracking-wider mb-1.5">Reminder Date & Time</label>
                  <input
                    type="datetime-local"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-[10px] text-white uppercase font-bold focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              {/* Button panel */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-colors cursor-pointer"
                >
                  {editingId ? "Save Changes" : "Save Stored Memo"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
