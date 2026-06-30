import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Smile, Volume2, Heart, ShieldAlert, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage, Task } from "../types";

interface FlowyAIFriendProps {
  tasks: Task[];
  userName: string;
}

export default function FlowyAIFriend({ tasks, userName }: FlowyAIFriendProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Hey ${userName || "friend"}! 👋 I'm Flowy, your ultimate AI bestie! 🌟 I'm right here in your corner to cheer you on, celebrate your wins, and keep procrastination away. How are you feeling right now? We can chat about anything!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, userName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const activeTasksText = tasks
        .filter(t => t.status !== "Completed")
        .slice(0, 3)
        .map(t => `${t.title} (${t.priority} Priority)`)
        .join(", ");

      const systemPrompt = `
        You are "Flowy", the user's ultimate supportive AI Best Friend and energetic focus buddy.
        You are cheerful, extremely empathetic, warm, and highly expressive (use matching emojis!).
        Always refer to the user by their name: "${userName || "friend"}".
        Your goal is to be an encouraging companion who checks in, cheers them up, jokes around, and acts like a true best friend.
        Never suggest anything extreme or harmful. Promote physical breaks, hydration, posture correction, and stretching.
        
        Active tasks they are working on right now: [${activeTasksText || "No active tasks, they are free!"}].
        
        Keep your replies warm, relatively short, punchy, and incredibly caring, like a text message from a close sibling or friend.
      `;

      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { sender: "user", text: `[SYSTEM INSTRUCTION] ${systemPrompt}` },
            ...messages.filter(m => m.id !== "welcome"),
            userMsg
          ],
          currentTasks: tasks
        })
      });

      if (!response.ok) throw new Error("Connection glitch");

      const data = await response.json();
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.text || "Oops! I had a little hiccup, but I'm back. Tell me what's on your mind! 💖",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: "Oh no! My signal is fading a bit. Make sure your Gemini API Key is entered so we can keep talking! 💖",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { text: "Need motivation! 💪", query: "Give me an energetic, hyped up motivational punch to get me working right now! Celebrate my efforts." },
    { text: "Suggest a 5m break 💆", query: "Suggest a healthy, non-screen 5 minute break activity for me. Keep it fun and active." },
    { text: "Tell me a joke! 🎯", query: "Tell me a funny, clean joke to lift my spirits!" },
    { text: "Daily check-in ☕", query: "Do a quick, caring check-in. Ask me about my energy level and how I'm coping with stress today." }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            className="w-[340px] md:w-[380px] h-[520px] bg-white border border-slate-200 dark:bg-slate-900/95 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden mb-4 backdrop-blur-md"
          >
            {/* Header section */}
            <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-bold text-lg text-white animate-pulse">
                    🌸
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-indigo-600 rounded-full animate-bounce" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tight flex items-center gap-1.5">
                    Flowy Friend
                    <span className="bg-white/20 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">BESTIE AI</span>
                  </h3>
                  <p className="text-[10px] text-indigo-100 font-bold">Always ready to support you 💖</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#050507]/20 scrollbar-thin">
              {messages.map((msg) => {
                const isAI = msg.sender === "ai";
                return (
                  <div key={msg.id} className={`flex gap-2.5 max-w-[85%] ${isAI ? "" : "ml-auto flex-row-reverse"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                      isAI ? "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-500 border dark:border-indigo-500/20" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white"
                    }`}>
                      {isAI ? "🌸" : "👤"}
                    </div>
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      isAI 
                        ? "bg-white border border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-white/5 dark:text-white/90" 
                        : "bg-indigo-600 text-white font-medium"
                    }`}>
                      <p className="whitespace-pre-line">{msg.text}</p>
                      <span className="text-[8px] text-slate-400 dark:text-white/30 block text-right mt-1">{msg.timestamp}</span>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center text-xs animate-spin">
                    🌸
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 border dark:border-white/5 rounded-2xl flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions drawer */}
            {messages.length < 5 && (
              <div className="p-2 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#050507]/40 flex gap-1.5 overflow-x-auto scrollbar-none">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.query)}
                    className="flex-shrink-0 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-white/10 dark:hover:bg-slate-900 text-slate-700 dark:text-white/70 text-[10px] font-black uppercase tracking-wider rounded-full transition-colors cursor-pointer shadow-xs"
                  >
                    {p.text}
                  </button>
                ))}
              </div>
            )}

            {/* Input area */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-white/5 flex gap-2 items-center"
            >
              <input
                type="text"
                placeholder="Chat with Flowy..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launcher ball */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-2xl relative cursor-pointer group"
      >
        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
        <span className="text-2xl relative z-10 select-none">🌸</span>
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 border border-white dark:border-slate-950 rounded-full flex items-center justify-center text-[8px] font-black text-white animate-pulse">
          ✓
        </span>
      </motion.button>
    </div>
  );
}
