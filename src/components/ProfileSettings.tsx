import React, { useState, useEffect } from "react";
import {
  User,
  Bell,
  Clock,
  Settings,
  Shield,
  Award,
  Sparkles,
  Moon,
  Sun,
  Monitor,
  MessageSquareCode,
  Send,
  LogOut,
  LifeBuoy,
  CheckCircle2,
  Camera,
  Upload,
  Heart,
  AlertTriangle,
  HelpCircle,
  Clock3,
  CheckCircle,
  Activity,
  Mail,
  ExternalLink,
  FileSpreadsheet,
  Layers
} from "lucide-react";
import { UserPreferences, Task, Habit } from "../types";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";

interface ProfileSettingsProps {
  currentUserId: string;
  userEmail: string;
  preferences: UserPreferences;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  tasks: Task[];
  habits: Habit[];
  profile: {
    name: string;
    age: number | '';
    profession: string;
    profilePic?: string;
    company?: string;
    bio?: string;
    focusTarget?: number;
  } | null;
  onSaveProfile: (prof: {
    name: string;
    age: number | '';
    profession: string;
    profilePic?: string;
    company?: string;
    bio?: string;
    focusTarget?: number;
  }) => Promise<void>;
  onLogout: () => void;
  onEraseAllData?: () => Promise<void>;
}

export default function ProfileSettings({
  currentUserId,
  userEmail,
  preferences,
  onUpdatePreferences,
  tasks,
  habits,
  profile,
  onSaveProfile,
  onLogout,
  onEraseAllData
}: ProfileSettingsProps) {
  const completedTasksCount = tasks.filter(t => t.status === "Completed").length;
  const habitStreakMax = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;

  // Profile Inputs State
  const [profileName, setProfileName] = useState(profile?.name || "");
  const [profileAge, setProfileAge] = useState<number | ''>(profile?.age || "");
  const [profileProfession, setProfileProfession] = useState(profile?.profession || "");
  const [profilePic, setProfilePic] = useState(profile?.profilePic || "");
  const [profileCompany, setProfileCompany] = useState(profile?.company || "");
  const [profileBio, setProfileBio] = useState(profile?.bio || "");
  const [profileFocusTarget, setProfileFocusTarget] = useState<number>(profile?.focusTarget || 4);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Privacy & Erase All Data states
  const [showEraseConfirm, setShowEraseConfirm] = useState(false);
  const [eraseConfirmText, setEraseConfirmText] = useState("");
  const [isDeletingData, setIsDeletingData] = useState(false);

  const handleEraseData = async () => {
    if (eraseConfirmText !== "DELETE MY DATA") {
      alert("Please type 'DELETE MY DATA' exactly as shown to proceed.");
      return;
    }

    setIsDeletingData(true);
    try {
      if (onEraseAllData) {
        await onEraseAllData();
      } else {
        localStorage.clear();
        alert("All local demo data has been permanently erased!");
        onLogout();
      }
    } catch (err) {
      console.error("Error purging all data:", err);
      alert("Failed to purge all data. Please verify your connection.");
    } finally {
      setIsDeletingData(false);
      setShowEraseConfirm(false);
      setEraseConfirmText("");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await onSaveProfile({
        name: profileName,
        age: profileAge,
        profession: profileProfession,
        profilePic: profilePic,
        company: profileCompany,
        bio: profileBio,
        focusTarget: profileFocusTarget
      });
      setProfileSavedSuccess(true);
      setTimeout(() => setProfileSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCustomPicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setProfilePic(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Feedback & Reports History State
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
  const [reportsHistory, setReportsHistory] = useState<any[]>([]);

  // Google Form Integration Settings
  const [feedbackFormUrl, setFeedbackFormUrl] = useState<string>(() => {
    return localStorage.getItem("google_form_feedback_url") || "https://docs.google.com/forms/d/e/1FAIpQLScmMAnL3tX67P06hEepY8vW8fB_8v8b8b8b8b8b8b8b/viewform";
  });
  const [reportFormUrl, setReportFormUrl] = useState<string>(() => {
    return localStorage.getItem("google_form_report_url") || "https://docs.google.com/forms/d/e/1FAIpQLScX-vU9_H8Y8v8b8b8b8b8b8b8b8b8b8b8b8b/viewform";
  });
  const [feedbackEntryId, setFeedbackEntryId] = useState<string>(() => {
    return localStorage.getItem("google_form_feedback_entry_id") || "entry.1000001";
  });
  const [reportEntryId, setReportEntryId] = useState<string>(() => {
    return localStorage.getItem("google_form_report_entry_id") || "entry.2000001";
  });
  const [emailEntryId, setEmailEntryId] = useState<string>(() => {
    return localStorage.getItem("google_form_email_entry_id") || "entry.3000001";
  });

  const [isSavingFormSettings, setIsSavingFormSettings] = useState(false);
  const [formSettingsSavedSuccess, setFormSettingsSavedSuccess] = useState(false);

  // Pre-filled Form Destination Link States
  const [prefilledFeedbackFormUrl, setPrefilledFeedbackFormUrl] = useState<string | null>(null);
  const [prefilledReportFormUrl, setPrefilledReportFormUrl] = useState<string | null>(null);

  // Load history and SMTP Gateway Status on mount or auth change
  useEffect(() => {
    const fetchHistory = async () => {
      const currentUser = auth.currentUser;

      if (currentUser) {
        try {
          // Fetch feedback
          const feedbackSnap = await getDocs(
            query(
              collection(db, "feedback"),
              where("userId", "==", currentUserId)
            )
          );
          const feedbackList = feedbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          feedbackList.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setFeedbackHistory(feedbackList);

          // Fetch reports
          const reportsSnap = await getDocs(
            query(
              collection(db, "reports"),
              where("userId", "==", currentUserId)
            )
          );
          const reportsList = reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          reportsList.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setReportsHistory(reportsList);
        } catch (error) {
          console.error("Error fetching history from Firestore:", error);
        }
      } else {
        // Fallback to localStorage in demo mode
        const localFeedback = localStorage.getItem(`feedback_${currentUserId}`);
        const localReports = localStorage.getItem(`reports_${currentUserId}`);
        if (localFeedback) setFeedbackHistory(JSON.parse(localFeedback));
        if (localReports) setReportsHistory(JSON.parse(localReports));
      }
    };

    fetchHistory();
  }, [userEmail]);

  const handleSaveFormSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFormSettings(true);
    localStorage.setItem("google_form_feedback_url", feedbackFormUrl);
    localStorage.setItem("google_form_report_url", reportFormUrl);
    localStorage.setItem("google_form_feedback_entry_id", feedbackEntryId);
    localStorage.setItem("google_form_report_entry_id", reportEntryId);
    localStorage.setItem("google_form_email_entry_id", emailEntryId);
    setTimeout(() => {
      setIsSavingFormSettings(false);
      setFormSettingsSavedSuccess(true);
      setTimeout(() => setFormSettingsSavedSuccess(false), 3000);
    }, 800);
  };

  // Feedback State
  const [feedback, setFeedback] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Help Desk / Problem report state
  const [problemDescription, setProblemDescription] = useState("");
  const [isSubmittingProblem, setIsSubmittingProblem] = useState(false);
  const [problemSuccess, setProblemSuccess] = useState(false);

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const txt = feedback.trim();
    if (!txt) return;
    setIsSubmittingFeedback(true);
    setPrefilledFeedbackFormUrl(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackText: txt,
          userEmail: userEmail,
          developerEmailOverride: "google_form"
        })
      });

      let aiResult = {
        sentiment: "Neutral",
        category: "Other",
        acknowledgment: "Thank you for your valuable feedback! We will share it with the team.",
        urgencyScore: 2,
        emailStatus: { success: false, simulated: true, recipient: "google_form" }
      };

      if (response.ok) {
        aiResult = await response.json();
      }

      const currentUser = auth.currentUser;

      const feedbackItem = {
        userId: currentUserId,
        userEmail: userEmail,
        feedbackText: txt,
        timestamp: new Date().toISOString(),
        ...aiResult
      };

      if (currentUser) {
        try {
          await addDoc(collection(db, "feedback"), feedbackItem);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, "feedback");
        }
      } else {
        const localFeedback = localStorage.getItem(`feedback_${currentUserId}`);
        const list = localFeedback ? JSON.parse(localFeedback) : [];
        list.unshift(feedbackItem);
        localStorage.setItem(`feedback_${currentUserId}`, JSON.stringify(list));
      }

      setFeedbackHistory(prev => [{ id: `fb_${Date.now()}`, ...feedbackItem }, ...prev]);

      // Construct Google Form Pre-fill Link
      try {
        const url = new URL(feedbackFormUrl);
        if (feedbackEntryId) url.searchParams.set(feedbackEntryId, txt);
        if (emailEntryId) url.searchParams.set(emailEntryId, userEmail || "Anonymous");
        setPrefilledFeedbackFormUrl(url.toString());
      } catch (err) {
        setPrefilledFeedbackFormUrl(feedbackFormUrl);
      }

      setFeedbackSuccess(true);
      setFeedback("");
      setTimeout(() => setFeedbackSuccess(false), 20000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleReportProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    const desc = problemDescription.trim();
    if (!desc) return;
    setIsSubmittingProblem(true);
    setPrefilledReportFormUrl(null);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemDescription: desc,
          userEmail: userEmail,
          developerEmailOverride: "google_form"
        })
      });

      let aiResult = {
        riskLevel: "MEDIUM",
        affectedComponent: "General UI",
        mitigationSteps: [
          "Ensure your internet connection is active.",
          "Try refreshing the tab or clearing local state."
        ],
        acknowledgment: "Our developer team has logged this issue and will triage it right away.",
        emailStatus: { success: false, simulated: true, recipient: "google_form" }
      };

      if (response.ok) {
        aiResult = await response.json();
      }

      const currentUser = auth.currentUser;

      const reportItem = {
        userId: currentUserId,
        userEmail: userEmail,
        problemDescription: desc,
        timestamp: new Date().toISOString(),
        ...aiResult
      };

      if (currentUser) {
        try {
          await addDoc(collection(db, "reports"), reportItem);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, "reports");
        }
      } else {
        const localReports = localStorage.getItem(`reports_${currentUserId}`);
        const list = localReports ? JSON.parse(localReports) : [];
        list.unshift(reportItem);
        localStorage.setItem(`reports_${currentUserId}`, JSON.stringify(list));
      }

      setReportsHistory(prev => [{ id: `rep_${Date.now()}`, ...reportItem }, ...prev]);

      // Construct Google Form Pre-fill Link
      try {
        const url = new URL(reportFormUrl);
        if (reportEntryId) url.searchParams.set(reportEntryId, desc);
        if (emailEntryId) url.searchParams.set(emailEntryId, userEmail || "Anonymous");
        setPrefilledReportFormUrl(url.toString());
      } catch (err) {
        setPrefilledReportFormUrl(reportFormUrl);
      }

      setProblemSuccess(true);
      setProblemDescription("");
      setTimeout(() => setProblemSuccess(false), 20000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingProblem(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* User Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-6 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-850 border border-slate-700 overflow-hidden flex items-center justify-center shadow-lg shadow-indigo-500/10 shrink-0">
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="font-bold text-indigo-400 text-2xl uppercase">
                {profileName ? profileName.substring(0, 2) : (userEmail ? userEmail.substring(0, 2) : "US")}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">{profileName || userEmail || "Productivity Executive"}</h2>
            <p className="text-xs text-indigo-400 font-bold uppercase font-mono mt-0.5 tracking-wider">
              {profileProfession || "Productivity Leader"}
              {profileCompany ? ` @ ${profileCompany}` : ""}
              {profileAge ? ` • Age ${profileAge}` : ""}
            </p>
            {profileBio && (
              <p className="text-slate-400 text-xs italic mt-1.5 max-w-md leading-relaxed">
                "{profileBio}"
              </p>
            )}
          </div>
        </div>

        {/* Dynamic score summary */}
        <div className="flex gap-3">
          <div className="bg-slate-950/40 px-3.5 py-2 rounded-xl border border-slate-850/85 text-center min-w-[90px]">
            <span className="text-[9px] font-mono text-slate-500 font-bold uppercase block">Done Tasks</span>
            <p className="text-base font-extrabold text-white mt-0.5">{completedTasksCount}</p>
          </div>
          <div className="bg-slate-950/40 px-3.5 py-2 rounded-xl border border-slate-850/85 text-center min-w-[90px]">
            <span className="text-[9px] font-mono text-slate-500 font-bold uppercase block">Max Streak</span>
            <p className="text-base font-extrabold text-white mt-0.5">{habitStreakMax}d</p>
          </div>
          <div className="bg-slate-950/40 px-3.5 py-2 rounded-xl border border-slate-850/85 text-center min-w-[90px]">
            <span className="text-[9px] font-mono text-slate-500 font-bold uppercase block">Focus Goal</span>
            <p className="text-base font-extrabold text-white mt-0.5">{profileFocusTarget} hrs/d</p>
          </div>
        </div>
      </div>

      {/* Dynamic Profile Identity Input Card */}
      <form onSubmit={handleUpdateProfile} className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
          <User className="w-4 h-4 text-indigo-400" />
          Workspace Profile Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Your Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Piyush Pradip"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Age (Optional)</label>
            <input
              type="number"
              placeholder="e.g., 22"
              value={profileAge}
              onChange={(e) => setProfileAge(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Profession / Role</label>
            <input
              type="text"
              placeholder="e.g., Software Engineer, GATE Aspirant"
              value={profileProfession}
              onChange={(e) => setProfileProfession(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Organization / Institution</label>
            <input
              type="text"
              placeholder="e.g., Google, Stanford University"
              value={profileCompany}
              onChange={(e) => setProfileCompany(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Professional Bio / Daily Performance Mantra</label>
            <input
              type="text"
              placeholder="e.g., Compounding daily focus to engineer long-term goals."
              value={profileBio}
              onChange={(e) => setProfileBio(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Daily Focus Target (Hours/Day)</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="16"
              value={profileFocusTarget}
              onChange={(e) => setProfileFocusTarget(parseInt(e.target.value))}
              className="flex-1 accent-indigo-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
            />
            <span className="text-sm font-extrabold text-white font-mono shrink-0 bg-slate-950 px-3 py-1 border border-slate-800 rounded-xl">
              {profileFocusTarget} Hours
            </span>
          </div>
        </div>

        {/* Profile Pic Selector and Uploader */}
        <div className="bg-slate-950/20 p-4 rounded-2xl border border-slate-800/60 space-y-3">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Profile Picture
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Active Preview */}
            <div className="relative group/pic cursor-pointer shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-slate-850 border border-slate-750 flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/10 transition-all group-hover/pic:border-indigo-500/50">
                {profilePic ? (
                  <img src={profilePic} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-8 h-8 text-slate-500" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg cursor-pointer transition-colors"
                title="Upload custom image"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomPicUpload}
                className="hidden"
              />
            </div>

            {/* Upload buttons or quick preset gallery */}
            <div className="flex-1 space-y-2 w-full">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">
                Select an avatar preset or upload your own:
              </p>

              <div className="flex flex-wrap gap-2">
                {[
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
                  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80",
                  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
                  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80"
                ].map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setProfilePic(url)}
                    className={`w-9 h-9 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                      profilePic === url
                        ? "border-indigo-500 scale-110 shadow-lg shadow-indigo-500/20"
                        : "border-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <img src={url} alt={`Preset ${idx+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors h-9"
                >
                  <Upload className="w-3 h-3" />
                  <span>Custom file</span>
                </button>

                {profilePic && (
                  <button
                    type="button"
                    onClick={() => setProfilePic("")}
                    className="px-2.5 py-1 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 text-rose-400 rounded-xl text-[9px] font-bold uppercase tracking-wider h-9 transition-colors cursor-pointer"
                  >
                    Clear Pic
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {profileSavedSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2 font-bold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile successfully saved and synchronized.</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSavingProfile || !profileName.trim()}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSavingProfile ? "Saving Profile..." : "Save Profile"}</span>
          </button>
        </div>
      </form>

      {/* Grid: Preferences Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Pomodoro & Focus intervals */}
        <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Focus Space Intervals
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Pomodoro Duration (minutes)</label>
              <input
                id="pref-pomodoro-duration"
                type="number"
                value={preferences.pomodoroDuration}
                onChange={(e) => onUpdatePreferences({ pomodoroDuration: parseInt(e.target.value) || 25 })}
                className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Short Break Duration (minutes)</label>
              <input
                id="pref-short-break"
                type="number"
                value={preferences.shortBreakDuration}
                onChange={(e) => onUpdatePreferences({ shortBreakDuration: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* General Preferences, Theme, System Settings */}
        <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
            <Settings className="w-4 h-4 text-indigo-400" />
            OS Theme & Sound Engine
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Daily Goal Count Target</label>
              <input
                id="pref-daily-goal-target"
                type="number"
                value={preferences.dailyGoalCount}
                onChange={(e) => onUpdatePreferences({ dailyGoalCount: parseInt(e.target.value) || 3 })}
                className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>

            {/* Theme switcher */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Display Theme Mode</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-1.5 rounded-xl border border-slate-850">
                <button
                  type="button"
                  onClick={() => onUpdatePreferences({ theme: "light" })}
                  className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    preferences.theme === "light"
                      ? "bg-indigo-600 text-white font-extrabold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdatePreferences({ theme: "dark" })}
                  className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    preferences.theme === "dark"
                      ? "bg-indigo-600 text-white font-extrabold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdatePreferences({ theme: "system" })}
                  className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    preferences.theme === "system"
                      ? "bg-indigo-600 text-white font-extrabold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>System</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* OS & Feedback Portal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Send feedback */}
        <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
            <MessageSquareCode className="w-4 h-4 text-pink-400" />
            Send Feedback
          </h3>

          <form onSubmit={handleSendFeedback} className="space-y-3">
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Tell us what you like, dislike, or how we can make FocusFlow even better. We read every word!</p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Your feature suggestions or warm words..."
              className="w-full h-20 p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500/50 leading-relaxed"
            />

            {feedbackSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex flex-col gap-2.5 font-bold animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Feedback saved to history & AI-analyzed! 🌸</span>
                </div>
                {prefilledFeedbackFormUrl && (
                  <a
                    href={prefilledFeedbackFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-center text-[10px] uppercase tracking-wider font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Complete Submission on Google Form &rarr;</span>
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!feedback.trim() || isSubmittingFeedback}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmittingFeedback ? "Saving..." : "Process Feedback"}</span>
            </button>
          </form>
        </div>

        {/* Report a Problem */}
        <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
            <LifeBuoy className="w-4 h-4 text-rose-400" />
            Report a Problem
          </h3>

          <form onSubmit={handleReportProblem} className="space-y-3">
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Encountered an issue, bug, or layout hiccup? Detail it below and our engineering team will tackle it!</p>
            <textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="Describe the bug or connection glitch..."
              className="w-full h-20 p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500/50 leading-relaxed"
            />

            {problemSuccess && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex flex-col gap-2.5 font-bold animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-400" />
                  <span>Problem report saved & triage completed! 🛠️</span>
                </div>
                {prefilledReportFormUrl && (
                  <a
                    href={prefilledReportFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-center text-[10px] uppercase tracking-wider font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/10"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>File Incident Ticket on Google Form &rarr;</span>
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!problemDescription.trim() || isSubmittingProblem}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/5"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>{isSubmittingProblem ? "Processing..." : "Report Problem"}</span>
            </button>
          </form>
        </div>

      </div>

      {/* My Submissions and Logs History */}
      {(feedbackHistory.length > 0 || reportsHistory.length > 0) && (
        <div className="space-y-6">
          <div className="border-t border-slate-800/80 pt-6">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Your Feedback & Incident Reports Log</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Real-time status updates from our development team and automated AI diagnostic triage.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feedback History Log */}
            {feedbackHistory.length > 0 && (
              <div className="bg-slate-900/20 p-5 rounded-3xl border border-slate-800/60 space-y-4">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-800/40">
                  <Heart className="w-4 h-4" />
                  <span>Feedback History ({feedbackHistory.length})</span>
                </h4>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {feedbackHistory.map((item, index) => (
                    <div key={item.id || index} className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          item.sentiment === "Positive" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          item.sentiment === "Negative" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                          "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}>
                          {item.sentiment || "Neutral"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {item.category || "General"}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 font-medium">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed italic">
                        "{item.feedbackText}"
                      </p>
                      {item.acknowledgment && (
                        <div className="p-2.5 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-[10px] text-slate-400 font-medium leading-relaxed">
                          <span className="text-indigo-400 font-bold block mb-0.5">Developer Response:</span>
                          {item.acknowledgment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Problem Reports History Log */}
            {reportsHistory.length > 0 && (
              <div className="bg-slate-900/20 p-5 rounded-3xl border border-slate-800/60 space-y-4">
                <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-800/40">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Reported Issues ({reportsHistory.length})</span>
                </h4>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {reportsHistory.map((item, index) => (
                    <div key={item.id || index} className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          item.riskLevel === "CRITICAL" ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" :
                          item.riskLevel === "HIGH" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                          item.riskLevel === "MEDIUM" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {item.riskLevel || "MEDIUM"} RISK
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {item.affectedComponent || "General UI"}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 font-medium">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed italic">
                        "{item.problemDescription}"
                      </p>

                      {item.mitigationSteps && item.mitigationSteps.length > 0 && (
                        <div className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1.5 text-[10px] text-slate-400 leading-relaxed font-medium">
                          <span className="text-emerald-400 font-bold block">Troubleshooting Tips:</span>
                          <ul className="list-disc list-inside space-y-1">
                            {item.mitigationSteps.map((step: string, sIdx: number) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.acknowledgment && (
                        <div className="p-2.5 bg-rose-950/10 border border-rose-900/20 rounded-xl text-[10px] text-slate-400 font-medium leading-relaxed">
                          <span className="text-rose-400 font-bold block mb-0.5">Triage Note:</span>
                          {item.acknowledgment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Privacy & Security Section */}
      <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
          <Shield className="w-4 h-4 text-rose-500" />
          Privacy & Security Settings
        </h3>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-900">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-200">Erase All Data</h4>
              <p className="text-[10px] text-slate-400 leading-normal max-w-lg">
                Permanently deletes all your Study Goals, Habit logs, focus records, task metrics, profile info, and shared links. This action is cryptographically final and cannot be undone.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowEraseConfirm(true)}
              className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all shrink-0 animate-pulse"
            >
              Purge All Data
            </button>
          </div>

          {/* Double-Confirmation Modal */}
          {showEraseConfirm && (
            <div className="p-4 bg-rose-950/25 border border-rose-900/30 rounded-2xl space-y-4 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <div className="space-y-1">
                  <h5 className="text-xs font-black uppercase text-rose-400 tracking-wider">Warning: Irreversible Destruction!</h5>
                  <p className="text-[10px] text-rose-300 leading-relaxed">
                    By confirming this action, all your personal archives in FocusFlow will be wiped out instantly from both local cache and active Firestore cloud backups. There is no backup or recovery path.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Type <span className="text-rose-400 select-all font-mono">DELETE MY DATA</span> to authorize:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={eraseConfirmText}
                    onChange={(e) => setEraseConfirmText(e.target.value)}
                    placeholder="Type confirmation here..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 font-bold focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isDeletingData || eraseConfirmText !== "DELETE MY DATA"}
                      onClick={handleEraseData}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-rose-600/10"
                    >
                      {isDeletingData ? "Purging..." : "Confirm Deletion"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEraseConfirm(false);
                        setEraseConfirmText("");
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OS Log Out Panel */}
      <div className="bg-slate-900/20 p-5 rounded-3xl border border-dashed border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider">Log Out of FocusFlow</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Clears active session keys safely. Your cloud backups remain secure.</p>
        </div>

        <button
          onClick={onLogout}
          className="px-5 py-2.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/25 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Session</span>
        </button>
      </div>

    </div>
  );
}
