import React, { useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Brain, CheckCircle2, Award, Briefcase, Calendar } from "lucide-react";

interface OnboardingModalProps {
  onComplete: (data: { name: string; age: number; profession: string }) => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [profession, setProfession] = useState("");
  const [step, setStep] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !age || !profession.trim()) return;
    
    onComplete({
      name: name.trim(),
      age: Number(age),
      profession: profession.trim()
    });
  };

  const professions = [
    "University Student",
    "High School Student",
    "Software Developer",
    "Digital Artist / Creator",
    "Product Manager / Executive",
    "Freelancer",
    "Researcher / Scholar",
    "Other Professional"
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/15 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-[#0d0e12] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-[#f8fafc]"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-6">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-indigo-500" : "bg-white/5"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-indigo-500" : "bg-white/5"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 3 ? "bg-indigo-500" : "bg-white/5"}`} />
        </div>

        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <Brain className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight mt-3">Welcome to FocusFlow AI</h2>
              <p className="text-xs text-white/50">Let's build a customized workspace to double your productivity. What is your name?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-all uppercase tracking-wide"
                />
              </div>

              <button
                disabled={!name.trim()}
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Continue</span>
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight mt-3">Hey, {name}!</h2>
              <p className="text-xs text-white/50">How old are you? We align focus techniques with your energy lifecycle.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2">Your Age</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  required
                  placeholder="e.g., 22"
                  value={age}
                  onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs border border-white/10 transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  disabled={!age}
                  onClick={() => setStep(3)}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <form 
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight mt-3">One last thing</h2>
              <p className="text-xs text-white/50">What is your current occupation or profession? This shapes our AI scheduler recommendations.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2">Select Profession</label>
                <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {professions.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProfession(p)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        profession === p 
                          ? "bg-indigo-500/15 border-indigo-500 text-indigo-400" 
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-white/70"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs border border-white/10 transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!profession}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch!</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
