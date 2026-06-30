import React, { useState } from "react";
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
  Upload
} from "lucide-react";
import { UserPreferences, Task, Habit } from "../types";

interface ProfileSettingsProps {
  userEmail: string;
  preferences: UserPreferences;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  tasks: Task[];
  habits: Habit[];
  profile: { name: string; age: number | ''; profession: string; profilePic?: string } | null;
  onSaveProfile: (prof: { name: string; age: number | ''; profession: string; profilePic?: string }) => Promise<void>;
  onLogout: () => void;
}

export default function ProfileSettings({
  userEmail,
  preferences,
  onUpdatePreferences,
  tasks,
  habits,
  profile,
  onSaveProfile,
  onLogout
}: ProfileSettingsProps) {
  const completedTasksCount = tasks.filter(t => t.status === "Completed").length;
  const habitStreakMax = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;

  // Profile Inputs State
  const [profileName, setProfileName] = useState(profile?.name || "");
  const [profileAge, setProfileAge] = useState<number | ''>(profile?.age || "");
  const [profileProfession, setProfileProfession] = useState(profile?.profession || "");
  const [profilePic, setProfilePic] = useState(profile?.profilePic || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await onSaveProfile({
        name: profileName,
        age: profileAge,
        profession: profileProfession,
        profilePic: profilePic
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

  // Feedback State
  const [feedback, setFeedback] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Help Desk / Problem report state
  const [problemDescription, setProblemDescription] = useState("");
  const [isSubmittingProblem, setIsSubmittingProblem] = useState(false);
  const [problemSuccess, setProblemSuccess] = useState(false);

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setIsSubmittingFeedback(true);

    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setFeedbackSuccess(true);
      setFeedback("");
      setTimeout(() => setFeedbackSuccess(false), 4000);
    }, 1200);
  };

  const handleReportProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim()) return;
    setIsSubmittingProblem(true);

    setTimeout(() => {
      setIsSubmittingProblem(false);
      setProblemSuccess(true);
      setProblemDescription("");
      setTimeout(() => setProblemSuccess(false), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* User Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-850 border border-slate-700 overflow-hidden flex items-center justify-center shadow-lg shadow-indigo-500/10 shrink-0">
            {profile?.profilePic ? (
              <img 
                src={profile.profilePic} 
                alt="Profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="font-bold text-indigo-400 text-2xl uppercase">
                {userEmail ? userEmail.substring(0, 2) : "US"}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">{profile?.name || userEmail || "Productivity Champion"}</h2>
            <p className="text-xs text-indigo-400 font-bold uppercase font-mono mt-0.5 tracking-wider">
              {profile?.profession || "FocusFlow Companion Ninja"} {profile?.age ? `• Age ${profile.age}` : ""}
            </p>
          </div>
        </div>

        {/* Dynamic score summary */}
        <div className="flex gap-4">
          <div className="bg-slate-950/40 px-4 py-2 rounded-xl border border-slate-850/85 text-center">
            <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">Tasks Completed</span>
            <p className="text-lg font-extrabold text-white mt-0.5">{completedTasksCount}</p>
          </div>
          <div className="bg-slate-950/40 px-4 py-2 rounded-xl border border-slate-850/85 text-center">
            <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">Max Habit Streak</span>
            <p className="text-lg font-extrabold text-white mt-0.5">{habitStreakMax}d</p>
          </div>
        </div>
      </div>

      {/* Dynamic Profile Identity Input Card */}
      <form onSubmit={handleUpdateProfile} className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
          <User className="w-4 h-4 text-indigo-400" />
          Personal Ninja Profile
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Your Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Piyush"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Age</label>
            <input
              type="number"
              placeholder="e.g., 22"
              value={profileAge}
              onChange={(e) => setProfileAge(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Profession / Goal</label>
            <input
              type="text"
              placeholder="e.g., CS Student, GATE aspirant"
              value={profileProfession}
              onChange={(e) => setProfileProfession(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
            />
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
                Select a high-tech preset avatar or upload your own:
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
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors h-9 animate-pulse"
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
            <span>Identity files successfully recorded & synchronized! 🟢</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSavingProfile || !profileName.trim()}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSavingProfile ? "Synchronizing..." : "Save Identity"}</span>
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
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Feedback dispatched to FocusFlow. Thank you! 🌸</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!feedback.trim() || isSubmittingFeedback}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmittingFeedback ? "Dispatching..." : "Send Feedback"}</span>
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
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-rose-400" />
                <span>Problem report submitted. We are on it! 🛠️</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!problemDescription.trim() || isSubmittingProblem}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/5"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>{isSubmittingProblem ? "Submitting bug report..." : "Report Problem"}</span>
            </button>
          </form>
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
