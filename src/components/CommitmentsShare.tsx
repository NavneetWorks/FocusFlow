import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  query,
  where,
  deleteDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Task, Habit, Goal, RememberMeItem } from "../types";
import {
  Share2,
  CheckCircle2,
  Flame,
  Target,
  Calendar,
  MessageSquare,
  Send,
  Copy,
  Clock,
  User,
  Sparkles,
  Eye,
  Award,
  Heart,
  Smile,
  Zap,
  ArrowRight,
  Trash2,
  Lock,
  Unlock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CommitmentsShareProps {
  // Owner Mode Props
  tasks?: Task[];
  habits?: Habit[];
  goals?: Goal[];
  rememberMeItems?: RememberMeItem[];
  userId?: string;
  userEmail?: string;
  userName?: string;
  userProfilePic?: string;

  // Shared Viewer Mode Props
  sharedId?: string;
  onCloseViewer?: () => void;
}

interface SharedCommitmentData {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userProfilePic: string;
  date: string;
  progressPercentage: number;
  motivationalNote: string;
  lastUpdated: string;
  goals: Array<{ title: string; completed: boolean; priority?: string }>;
  tasks: Array<{ title: string; status: string; priority?: string; category?: string }>;
  habits: Array<{ title: string; streak: number }>;
  rememberMeItems?: Array<{ title: string; content: string; priority: string }>;
  sharedSections?: string[];
  expiresAtEpoch?: number;
  revoked?: boolean;
  reactions: {
    fire: number;
    clap: number;
    hundred: number;
    target: number;
  };
  comments: Array<{
    id: string;
    name: string;
    text: string;
    createdAt: string;
  }>;
}

export default function CommitmentsShare({
  tasks = [],
  habits = [],
  goals = [],
  rememberMeItems = [],
  userId = "demo_user",
  userEmail = "anonymous@focusflow.ai",
  userName = "Productivity Hero",
  userProfilePic = "",
  sharedId,
  onCloseViewer
}: CommitmentsShareProps) {
  const isViewerMode = !!sharedId;
  const todayDateStr = new Date().toDateString();

  // State for Active Share ID (handles loading generated links live for owners)
  const cachedShareId = typeof window !== "undefined" ? localStorage.getItem(`active_share_${userId}_${todayDateStr}`) : null;
  const [activeShareId, setActiveShareId] = useState<string | null>(sharedId || cachedShareId || null);

  // State for Shared Data
  const [sharedData, setSharedData] = useState<SharedCommitmentData | null>(null);
  const [loading, setLoading] = useState(isViewerMode);
  const [error, setError] = useState<string | null>(null);

  // State for Owner Customization & Selective Sharing
  const [motivationalNote, setMotivationalNote] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(
    activeShareId && !isViewerMode ? `${window.location.origin}?sharedCommitment=${activeShareId}` : null
  );
  const [copied, setCopied] = useState(false);

  const [selectedSections, setSelectedSections] = useState<string[]>([
    "Study Goals",
    "Habit Tracker",
    "Daily Targets",
    "Task List & Completion",
    "Goal Progress",
    "Streaks",
    "Notes",
    "Remember Me items"
  ]);

  const [timeLeft, setTimeLeft] = useState<string>("");

  const toggleSection = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // State for Viewer Interactions
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [userReacted, setUserReacted] = useState<Record<string, boolean>>({});

  // State for tracked Outbound Sent Encouragements
  const [sentEncouragements, setSentEncouragements] = useState<any[]>([]);

  // 1. Calculations for Owner Mode
  const activeTasks = tasks.filter(t => t.status === "Completed" || t.status === "In Progress" || t.status === "Pending");
  const completedTasksCount = tasks.filter(t => t.status === "Completed").length;
  const totalTasksCount = activeTasks.length;

  const completedGoalsCount = goals.filter(g => g.completed).length;
  const totalGoalsCount = goals.length;

  const overallProgress = totalTasksCount > 0
    ? Math.round((completedTasksCount / totalTasksCount) * 100)
    : totalGoalsCount > 0
      ? Math.round((completedGoalsCount / totalGoalsCount) * 100)
      : 0;

  // Real-time Countdown Timer for Expiration
  useEffect(() => {
    if (!sharedData || !sharedData.expiresAtEpoch) {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const diff = sharedData.expiresAtEpoch! - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        if (isViewerMode) {
          setError("This shared link has expired. Expired links do not expose any data.");
          setSharedData(null);
        }
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sharedData, isViewerMode]);

  // 2. Fetch/Subscribe to Shared Commitment (handles activeShareId for owners too!)
  useEffect(() => {
    if (!activeShareId) {
      setSharedData(null);
      return;
    }

    setLoading(true);
    const docRef = doc(db, "commitments", activeShareId);

    // Live update comments/reactions using onSnapshot
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SharedCommitmentData;
        const now = Date.now();
        if (data.revoked || (data.expiresAtEpoch && data.expiresAtEpoch < now)) {
          if (isViewerMode) {
            setError("This shared link has expired or was revoked by the owner.");
          }
          setSharedData(null);
        } else {
          setSharedData(data);
          setError(null);
        }
      } else {
        if (isViewerMode) {
          setError("This commitment share link does not exist or has been removed.");
        }
        setSharedData(null);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Snapshot load warning (likely rules or guest):", err);
      if (isViewerMode) {
        setError("Could not establish a subscription. If you are a guest, you can still view live elements on page reloads.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeShareId, isViewerMode]);

  // 3. Subscribe to Sent Encouragements tracking (Owner mode)
  useEffect(() => {
    if (isViewerMode || !userId) return;

    // Load cached sent list
    const localSaved = localStorage.getItem(`sent_encouragements_${userId}`);
    if (localSaved) {
      try {
        setSentEncouragements(JSON.parse(localSaved));
      } catch (e) {
        console.error(e);
      }
    }

    // Subscribe to Firestore tracking
    if (userId === "demo_user") return;
    try {
      const q = query(collection(db, "sentEncouragements"), where("senderId", "==", userId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort by date desc
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSentEncouragements(list);
        localStorage.setItem(`sent_encouragements_${userId}`, JSON.stringify(list));
      }, (err) => {
        console.warn("sentEncouragements tracking sync skipped (guest/offline mode):", err);
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn("sentEncouragements sync query error:", err);
    }
  }, [userId, isViewerMode]);

  // Helper utility to identify 24-hour expiration
  const isOlderThan24Hours = (isoString: string) => {
    if (!isoString) return false;
    const created = new Date(isoString).getTime();
    const now = Date.now();
    return (now - created) > 24 * 60 * 60 * 1000;
  };

  const getExpirationTimeLeft = (isoString: string) => {
    if (!isoString) return "24h left";
    const created = new Date(isoString).getTime();
    const now = Date.now();
    const msLeft = (24 * 60 * 60 * 1000) - (now - created);
    if (msLeft <= 0) return "Expired";
    const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
    const minsLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    if (hoursLeft > 0) return `${hoursLeft}h left`;
    return `${minsLeft}m left`;
  };

  // Cryptographically secure token generator
  const generateSecureToken = () => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => dec.toString(16).padStart(2, '0')).join('');
  };

  // 4. Create Share link (Owner Mode)
  const handleGenerateShare = async () => {
    setIsGeneratingLink(true);
    try {
      const currentUserId = userId || "demo_user";
      const currentUserEmail = userEmail || "demo@focusflow.ai";

      // Generate a cryptographically secure random token (does not expose sequential database IDs)
      const tokenId = generateSecureToken();
      const expiresAtEpoch = Date.now() + 5 * 60 * 1000; // Strictly expires after 5 minutes

      const payload: SharedCommitmentData = {
        id: tokenId,
        userId: currentUserId,
        userEmail: currentUserEmail,
        userName: userName || currentUserEmail.split("@")[0] || "Hacker",
        userProfilePic: userProfilePic || "",
        date: todayDateStr,
        progressPercentage: selectedSections.includes("Goal Progress") || selectedSections.includes("Task List & Completion") ? overallProgress : 0,
        motivationalNote: selectedSections.includes("Notes")
          ? (motivationalNote.trim() || "Let's stay focused, beat procrastination, and unlock high performance today!")
          : "Locked & Private",
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),

        // Filter elements based on selected sections (Security: recipient only gets what was selected)
        goals: selectedSections.includes("Study Goals")
          ? (goals || []).map(g => ({ title: g.title || "", completed: !!g.completed, priority: g.priority || "medium" }))
          : [],
        tasks: selectedSections.includes("Task List & Completion")
          ? (activeTasks || []).map(t => ({ title: t.title || "", status: t.status || "todo", priority: t.priority || "medium", category: t.category || "work" }))
          : [],
        habits: selectedSections.includes("Habit Tracker")
          ? (habits || []).map(h => ({
              title: h.title || "",
              streak: selectedSections.includes("Streaks") ? (h.streak || 0) : 0
            }))
          : [],
        rememberMeItems: selectedSections.includes("Remember Me items")
          ? (rememberMeItems || []).map(item => ({ title: item.title, content: item.content, priority: item.priority }))
          : [],

        sharedSections: selectedSections,
        expiresAtEpoch,
        revoked: false,
        reactions: { fire: 0, clap: 0, hundred: 0, target: 0 },
        comments: []
      };

      await setDoc(doc(db, "commitments", tokenId), payload);

      const shareUrl = `${window.location.origin}?sharedCommitment=${tokenId}`;
      setGeneratedLink(shareUrl);
      setActiveShareId(tokenId);
      localStorage.setItem(`active_share_${userId}_${todayDateStr}`, tokenId);

      // Automatically copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to generate shareable link. Please check your network connection.");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!activeShareId) return;
    try {
      const docRef = doc(db, "commitments", activeShareId);
      await deleteDoc(docRef); // Pure purge of database record for complete security
      setSharedData(null);
      setGeneratedLink(null);
      setActiveShareId(null);
      localStorage.removeItem(`active_share_${userId}_${todayDateStr}`);
      alert("Shared link revoked and all shared metrics successfully deleted!");
    } catch (err) {
      console.error("Error revoking shared link:", err);
      alert("Failed to revoke shared link.");
    }
  };

  const copyToClipboard = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // 5. Handle Emoji Reaction (Viewer Mode)
  const handleReaction = async (type: 'fire' | 'clap' | 'hundred' | 'target') => {
    const targetId = activeShareId;
    if (!targetId || !sharedData) return;

    // Prevent spamming
    if (userReacted[type]) return;

    setUserReacted(prev => ({ ...prev, [type]: true }));

    try {
      const docRef = doc(db, "commitments", targetId);
      const currentCount = sharedData.reactions[type] || 0;
      await updateDoc(docRef, {
        [`reactions.${type}`]: currentCount + 1
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `commitments/${targetId}/reactions/${type}`);
    }
  };

  // 6. Handle Post Comment (Viewer Mode)
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = activeShareId;
    if (!targetId || !commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const docRef = doc(db, "commitments", targetId);
      const commenterName = commentName.trim() || "Anonymous Friend";

      const newComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: commenterName,
        text: commentText.trim(),
        createdAt: new Date().toISOString()
      };

      await updateDoc(docRef, {
        comments: arrayUnion(newComment)
      });

      // Track outbound encouragement
      const sentId = `sent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const sentPayload = {
        id: sentId,
        senderId: userId || "demo_user",
        senderName: commenterName,
        recipientId: sharedData?.userId || "unknown_user",
        recipientName: sharedData?.userName || "Productivity Buddy",
        commitmentId: targetId,
        text: commentText.trim(),
        createdAt: new Date().toISOString()
      };

      // Save locally as cache/guest backup
      const senderUid = userId || "demo_user";
      const existingSent = JSON.parse(localStorage.getItem(`sent_encouragements_${senderUid}`) || "[]");
      localStorage.setItem(`sent_encouragements_${senderUid}`, JSON.stringify([sentPayload, ...existingSent]));
      setSentEncouragements(prev => [sentPayload, ...prev]);

      // Save to Firestore tracking
      if (userId && userId !== "demo_user") {
        try {
          await setDoc(doc(db, "sentEncouragements", sentId), sentPayload);
        } catch (dbErr) {
          console.warn("Could not write sent encouragement tracking log to Firestore:", dbErr);
        }
      }

      setCommentText("");
      // Retain the commenter's name for convenience
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `commitments/${targetId}/comments`);
      alert("Failed to add comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 7. Handle Delete Comment (Owner/Recipient can delete any comment received)
  const handleDeleteComment = async (commentId: string) => {
    const targetId = activeShareId;
    if (!targetId) return;

    try {
      const docRef = doc(db, "commitments", targetId);
      // Filter out the deleted comment
      const updatedComments = (sharedData?.comments || []).filter(cmt => cmt.id !== commentId);
      await updateDoc(docRef, {
        comments: updatedComments
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `commitments/${targetId}/comments`);
      alert("Failed to delete encouragement message. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#f8fafc] flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-t-indigo-500 border-r-indigo-500 border-b-slate-900 border-l-slate-900 rounded-full animate-spin mb-4" />
        <span className="font-bold text-xs uppercase tracking-widest text-indigo-400">Loading Commitment Feed...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#f8fafc] flex flex-col items-center justify-center p-6">
        <div className="p-6 bg-rose-950/20 border border-rose-900/40 rounded-3xl text-center max-w-md space-y-4">
          <Eye className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-black uppercase text-rose-400">Access Denied</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          {onCloseViewer && (
            <button
              onClick={onCloseViewer}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase transition-colors"
            >
              Return to App
            </button>
          )}
        </div>
      </div>
    );
  }

  const renderData: SharedCommitmentData | null = (isViewerMode || (sharedData && activeShareId)) ? sharedData : {
    id: activeShareId || "local-preview",
    userId,
    userEmail,
    userName,
    userProfilePic,
    date: todayDateStr,
    progressPercentage: overallProgress,
    motivationalNote: motivationalNote || "Let's win today!",
    lastUpdated: "Just now",
    goals: goals.map(g => ({ title: g.title, completed: g.completed, priority: g.priority })),
    tasks: activeTasks.map(t => ({ title: t.title, status: t.status, priority: t.priority, category: t.category })),
    habits: habits.map(h => ({ title: h.title, streak: h.streak })),
    rememberMeItems: rememberMeItems.map(item => ({
      title: item.title,
      content: item.content,
      priority: item.priority
    })),
    sharedSections: selectedSections,
    reactions: { fire: 0, clap: 0, hundred: 0, target: 0 },
    comments: []
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-slate-850 p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950 border border-indigo-500/30 overflow-hidden flex items-center justify-center shadow-lg shadow-indigo-500/10">
              {renderData?.userProfilePic ? (
                <img src={renderData.userProfilePic} alt={renderData.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-8 h-8 text-indigo-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white uppercase tracking-tight">{renderData?.userName}</h1>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase rounded-md tracking-wider border border-indigo-500/20">
                  {isViewerMode ? "Shared Stream" : "My Accountability"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{renderData?.date}</span>
                <span className="text-slate-600">•</span>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Updated {renderData?.lastUpdated}</span>
              </p>
            </div>
          </div>

          {/* Close Viewer Action for external users */}
          {isViewerMode && onCloseViewer && (
            <button
              onClick={onCloseViewer}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>Return to Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Commitments Dashboard */}
        <div className="lg:col-span-2 space-y-6">

          {/* Motivation Note banner */}
          {(!renderData?.sharedSections || renderData.sharedSections.includes("Notes")) && renderData?.motivationalNote && (
            <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-3xl relative">
              <div className="absolute top-4 right-4">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              </div>
              <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider mb-2">Today's Focus Code</h3>
              <p className="text-sm font-medium text-slate-200 italic leading-relaxed">
                "{renderData.motivationalNote}"
              </p>
            </div>
          )}

          {/* Progress visualizer */}
          {(!renderData?.sharedSections || renderData.sharedSections.includes("Daily Targets") || renderData.sharedSections.includes("Goal Progress")) && (
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2 space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Accountability Index</h3>
                <p className="text-2xl font-extrabold text-white">Daily Target Completion is at <span className="text-indigo-400">{renderData?.progressPercentage}%</span></p>
                <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-850">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${renderData?.progressPercentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-indigo-500 h-full rounded-full"
                  />
                </div>
              </div>
              <div className="p-4 bg-indigo-950/20 rounded-2xl border border-indigo-900/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Current Tier</p>
                  <p className="text-xs font-bold text-slate-200 uppercase mt-0.5">
                    {renderData?.progressPercentage >= 80 ? "🔥 Hyper-Focused" : renderData?.progressPercentage >= 50 ? "⚡ Build Momentum" : "⏳ Loading state"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Remember Me Items Section */}
          {renderData?.sharedSections?.includes("Remember Me items") && renderData?.rememberMeItems && renderData.rememberMeItems.length > 0 && (
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-850 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                <Lock className="w-4 h-4 text-indigo-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">Mindful Remember Me Notes</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {renderData.rememberMeItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-indigo-950/5 rounded-xl border border-indigo-500/10 flex flex-col justify-between gap-1.5">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-indigo-300">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{item.content}</p>
                    </div>
                    {item.priority && (
                      <span className="self-start text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-indigo-400 border border-indigo-950">
                        {item.priority}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Commitments lists: Goals, Tasks, Habits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Daily Goals */}
            {(!renderData?.sharedSections || renderData.sharedSections.includes("Study Goals")) && (
              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-850 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">Study Targets & Goals</h3>
                </div>

                {renderData?.goals && renderData.goals.length > 0 ? (
                  <div className="space-y-2.5">
                    {renderData.goals.map((g, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-850/40">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${g.completed ? "bg-emerald-500/20 border-emerald-500/50" : "border-slate-800"}`}>
                            {g.completed && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          </div>
                          <span className={`text-xs font-bold ${g.completed ? "text-slate-500 line-through" : "text-slate-300"}`}>{g.title}</span>
                        </div>
                        {g.priority && (
                          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-750">{g.priority}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No study targets committed for today.</p>
                )}
              </div>
            )}

            {/* Habits tracker */}
            {(!renderData?.sharedSections || renderData.sharedSections.includes("Habit Tracker")) && (
              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-850 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                  <Flame className="w-4 h-4 text-orange-400 animate-bounce" />
                  <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">Locked Habits Streaks</h3>
                </div>

                {renderData?.habits && renderData.habits.length > 0 ? (
                  <div className="space-y-2.5">
                    {renderData.habits.map((h, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-850/40">
                        <span className="text-xs font-bold text-slate-300">{h.title}</span>
                        {(!renderData?.sharedSections || renderData.sharedSections.includes("Streaks")) && (
                          <div className="flex items-center gap-1 text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg text-[10px] font-black">
                            <Flame className="w-3 h-3 fill-orange-400" />
                            <span>{h.streak} DAYS</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No active habit commitments for today.</p>
                )}
              </div>
            )}

            {/* Core Tasks */}
            {(!renderData?.sharedSections || renderData.sharedSections.includes("Task List & Completion")) && (
              <div className="md:col-span-2 bg-slate-950 p-5 rounded-3xl border border-slate-850 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">Committed Tasks Board</h3>
                </div>

                {renderData?.tasks && renderData.tasks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {renderData.tasks.map((t, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/60 rounded-xl border border-slate-850/40 flex flex-col justify-between gap-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-bold text-slate-300 leading-tight">{t.title}</span>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shrink-0 ${
                            t.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            t.status === "In Progress" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-slate-800 text-slate-400 border border-slate-750"
                          }`}>{t.status}</span>
                        </div>

                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          <span>{t.category || "General"}</span>
                          <span>{t.priority || "Normal"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No individual tasks committed for today.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sharing panel or Peer Reactions & Comments */}
        <div className="space-y-6">
          {!isViewerMode ? (
            /* Owner Mode: Customizing & Generating the Accountability Link */
            <div className="space-y-6">
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 space-y-5">
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-indigo-400" />
                    <span>Broadcast Commitments</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Generate a unique shareable dashboard link for today. Post it in study channels, teams, or send it to study buddies to keep you on track.
                  </p>
                </div>

                {/* Secure Selective Sharing checklist */}
                <div className="space-y-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-850">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Secure Selective Sharing</span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal mb-1">
                    Select the sections you wish to include in your shareable snapshot. Unselected items will remain strictly confidential.
                  </p>

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      "Study Goals",
                      "Habit Tracker",
                      "Daily Targets",
                      "Task List & Completion",
                      "Goal Progress",
                      "Streaks",
                      "Notes",
                      "Remember Me items"
                    ].map((section) => {
                      const isChecked = selectedSections.includes(section);
                      return (
                        <button
                          key={section}
                          type="button"
                          onClick={() => toggleSection(section)}
                          className={`flex items-center gap-1.5 p-1.5 rounded-xl text-left text-[9px] font-bold border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-200"
                              : "bg-slate-950/40 border-slate-900 text-slate-500"
                          }`}
                        >
                          <div className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
                            isChecked ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-800"
                          }`}>
                            {isChecked && <CheckCircle2 className="w-2 h-2 text-white" />}
                          </div>
                          <span className="truncate">{section}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Daily High-Performance Prompt
                  </label>
                  <textarea
                    value={motivationalNote}
                    onChange={(e) => setMotivationalNote(e.target.value)}
                    placeholder="Set your major priority or focus quote... e.g. Preparing for OS and DBMS exams. No distractions allowed today."
                    className="w-full bg-slate-900 border border-slate-850 p-3 rounded-2xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-600 leading-relaxed"
                    rows={4}
                  />
                </div>

                <button
                  onClick={handleGenerateShare}
                  disabled={isGeneratingLink}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{isGeneratingLink ? "Writing to cloud..." : "Share Commitment"}</span>
                </button>

                {activeShareId && (
                  <div className="p-4 bg-indigo-950/20 border border-indigo-900/20 rounded-2xl space-y-3 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Link Active for 5 Mins</span>
                      </span>
                      <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        {timeLeft || "Calculating..."}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal">
                      This link uses a secure random token and will permanently self-destruct in 5 minutes.
                    </p>

                    <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-880">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}?sharedCommitment=${activeShareId}`}
                        className="flex-1 bg-transparent text-[10px] text-slate-300 font-bold focus:outline-none select-all"
                      />
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(`${window.location.origin}?sharedCommitment=${activeShareId}`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 3000);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Copy link"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      onClick={handleRevokeShare}
                      className="w-full py-2 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 hover:border-rose-800/50 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke Link Now</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Live Comments & Boosts Received (Shown to Owner in real-time) */}
              {activeShareId && renderData && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Realtime Emojis display */}
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Live Accountability Boosts Got</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { type: "fire", label: "🔥", count: renderData?.reactions?.fire || 0 },
                        { type: "clap", label: "👏", count: renderData?.reactions?.clap || 0 },
                        { type: "hundred", label: "💯", count: renderData?.reactions?.hundred || 0 },
                        { type: "target", label: "🎯", count: renderData?.reactions?.target || 0 }
                      ].map((react) => (
                        <div key={react.type} className="py-2.5 bg-slate-900 rounded-xl border border-slate-850/60 flex flex-col items-center">
                          <span className="text-base">{react.label}</span>
                          <span className="text-xs font-black tracking-widest text-slate-300">{react.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments list with recipient rights to delete */}
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      <span>Encouragements Got ({renderData?.comments?.filter(cmt => !isOlderThan24Hours(cmt.createdAt)).length || 0})</span>
                    </h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase leading-normal">
                      Messages automatically expire after 24 hours. Click the trash icon to delete any message:
                    </p>

                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {renderData?.comments && renderData.comments.filter(cmt => !isOlderThan24Hours(cmt.createdAt)).length > 0 ? (
                        renderData.comments
                          .filter(cmt => !isOlderThan24Hours(cmt.createdAt))
                          .map((cmt) => (
                            <div key={cmt.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-850/40 text-xs flex justify-between items-start gap-2 animate-fadeIn">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  <span className="text-indigo-400">{cmt.name}</span>
                                  <span>•</span>
                                  <span className="text-slate-600 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-600" />
                                    {getExpirationTimeLeft(cmt.createdAt)}
                                  </span>
                                </div>
                                <p className="text-slate-300 leading-relaxed font-medium">{cmt.text}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteComment(cmt.id)}
                                className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer shrink-0"
                                title="Delete encouragement message"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                      ) : (
                        <p className="text-[11px] text-slate-600 py-4 text-center font-bold uppercase">No active encouragements received yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* OUTBOUND ENCOURAGEMENT TRACKER: "Encouragements I've Sent" */}
              {sentEncouragements && sentEncouragements.filter(e => !isOlderThan24Hours(e.createdAt)).length > 0 && (
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 space-y-4 animate-fadeIn">
                  <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Sent Encouragements ({sentEncouragements.filter(e => !isOlderThan24Hours(e.createdAt)).length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                    Tracking history of supportive messages you've sent to study buddies:
                  </p>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {sentEncouragements
                      .filter(e => !isOlderThan24Hours(e.createdAt))
                      .map((item) => (
                        <div key={item.id} className="p-3 bg-slate-900/40 rounded-xl border border-slate-850/40 text-xs space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            <span className="text-purple-400">To: {item.recipientName}</span>
                            <span className="text-slate-600 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-600" />
                              {getExpirationTimeLeft(item.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-300 leading-relaxed italic">"{item.text}"</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Viewer Mode: Reactions & Comments */
            <div className="space-y-6">

              {/* Emojis Board */}
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Accountability Boosts</h3>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">TAP EMOJIS TO REACT TO THEIR PROGRESS:</p>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: "fire", label: "🔥 Fire", count: renderData?.reactions?.fire || 0, color: "hover:bg-orange-500/10 hover:border-orange-500/30 text-orange-400" },
                    { type: "clap", label: "👏 Clap", count: renderData?.reactions?.clap || 0, color: "hover:bg-yellow-500/10 hover:border-yellow-500/30 text-yellow-400" },
                    { type: "hundred", label: "💯 Premium", count: renderData?.reactions?.hundred || 0, color: "hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400" },
                    { type: "target", label: "🎯 Target", count: renderData?.reactions?.target || 0, color: "hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-400" }
                  ].map((react) => (
                    <button
                      key={react.type}
                      onClick={() => handleReaction(react.type as any)}
                      disabled={userReacted[react.type]}
                      className={`py-3 px-4 bg-slate-900 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        userReacted[react.type]
                          ? "border-indigo-500 scale-95 opacity-80"
                          : "border-slate-850 " + react.color
                      }`}
                    >
                      <span className="text-lg">{react.label.split(" ")[0]}</span>
                      <span className="text-xs font-black tracking-widest">{react.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Encouragement Comments list & form */}
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Encouragements ({renderData?.comments?.filter(cmt => !isOlderThan24Hours(cmt.createdAt)).length || 0})</span>
                </h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase leading-normal">
                  Encouragement messages automatically expire after 24 hours.
                </p>

                {/* Form to post a comment */}
                <form onSubmit={handleAddComment} className="space-y-3">
                  <input
                    type="text"
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="Your Display Name (optional)"
                    className="w-full bg-slate-900 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                    maxLength={25}
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Send some motivation!"
                      className="flex-1 bg-slate-900 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                      maxLength={150}
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Comment log list with delete support for recipient */}
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {renderData?.comments && renderData.comments.filter(cmt => !isOlderThan24Hours(cmt.createdAt)).length > 0 ? (
                    renderData.comments
                      .filter(cmt => !isOlderThan24Hours(cmt.createdAt))
                      .map((cmt) => (
                        <div key={cmt.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-850/40 text-xs flex justify-between items-start gap-2 animate-fadeIn">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              <span className="text-indigo-400">{cmt.name}</span>
                              <span>•</span>
                              <span className="text-slate-600 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-600" />
                                {getExpirationTimeLeft(cmt.createdAt)}
                              </span>
                            </div>
                            <p className="text-slate-300 leading-relaxed font-medium">{cmt.text}</p>
                          </div>
                          {/* Owner/recipient can delete any comment on their board */}
                          {userId && renderData?.userId === userId && (
                            <button
                              onClick={() => handleDeleteComment(cmt.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer shrink-0"
                              title="Delete encouragement message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                  ) : (
                    <p className="text-[11px] text-slate-600 py-4 text-center font-bold uppercase">No active comments yet. Be the first to leave one!</p>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
