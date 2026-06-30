import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, HelpCircle, User, Brain, AlertCircle } from "lucide-react";
import { ChatMessage, Task } from "../types";
import { generateGeminiTextFromBrowser } from "../utils/geminiBrowser";

interface AICoachProps {
  tasks: Task[];
}

export default function AICoach({ tasks }: AICoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-coach-msg",
      sender: "ai",
      text: "Hello! I am your FocusFlow AI Productivity Coach. I can help you architect optimized schedules, break down massive tasks, beat procrastination, and sustain dynamic flow. What are we aiming to conquer today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Suggested Prompts
  const suggestions = [
    "How do I beat procrastination today?",
    "Plan a study block for my hardest tasks",
    "Give me an active motivational boost",
    "How does the Pomodoro cycle help focus?"
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const taskContext = tasks
        .map(t => `- ${t.title} | priority: ${t.priority} | status: ${t.status} | deadline: ${t.deadline || "none"}`)
        .join("\n");

      const chatContext = [...messages, userMsg]
        .slice(-12)
        .map(m => `${m.sender === "ai" ? "Coach" : "User"}: ${m.text}`)
        .join("\n");

      const prompt = `You are FocusFlow AI Productivity Coach.\nKeep responses practical, warm, and concise.\nUse markdown bullets when helpful.\n\nCurrent task list:\n${taskContext || "No tasks yet."}\n\nConversation:\n${chatContext}\n\nNow respond to the latest user message with actionable coaching.`;
      let text: string;
      try {
        text = await generateGeminiTextFromBrowser(prompt);
      } catch (browserErr) {
        // Keep app usable when direct browser Gemini is rate-limited or temporarily unavailable.
        const response = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            currentTasks: tasks.map(t => ({ title: t.title, deadline: t.deadline, priority: t.priority, status: t.status }))
          })
        });

        if (!response.ok) {
          const reason = browserErr instanceof Error ? browserErr.message : "Unknown Gemini error";
          throw new Error(reason);
        }

        const data = await response.json();
        text = data.text || "";
      }
      
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: text || "I apologize, my performance synapse hiccuped. Let's try that prompt again!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: `🚨 SYNAPSE OFFLINE: ${error instanceof Error ? error.message : "I couldn't reach Gemini right now. Please retry in a moment."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 flex flex-col h-[580px] relative overflow-hidden">
      
      {/* Coach Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-950 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              Focus AI Coach
              <span className="text-[9px] font-mono font-bold bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase">Core API</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Empathetic productivity advisor</p>
          </div>
        </div>
      </div>

      {/* Message history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin">
        {messages.map((msg) => {
          const isAI = msg.sender === "ai";
          const isErr = msg.text.startsWith("🚨");
          return (
            <div 
              id={`chat-msg-${msg.id}`}
              key={msg.id} 
              className={`flex items-start gap-2.5 max-w-[85%] ${isAI ? "" : "ml-auto flex-row-reverse"}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                isAI ? "bg-indigo-950 text-indigo-400 border border-indigo-500/20" : "bg-slate-800 text-white"
              }`}>
                {isAI ? "A" : <User className="w-3.5 h-3.5" />}
              </div>

              <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed font-medium ${
                isAI 
                  ? isErr 
                    ? "bg-rose-950/20 border-rose-500/20 text-rose-300" 
                    : "bg-slate-950/40 border-slate-850 text-slate-300"
                  : "bg-indigo-600 border-indigo-500 text-white"
              }`}>
                {/* Simplified custom text markdown parsing to display bullets cleanly */}
                <div className="space-y-1 whitespace-pre-line">
                  {msg.text}
                </div>
                <p className={`text-[8px] font-mono mt-2 text-right ${isAI ? "text-slate-500" : "text-indigo-200"}`}>{msg.timestamp}</p>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs animate-pulse">
              A
            </div>
            <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-2xl flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      {/* Suggested quick actions */}
      {messages.length < 3 && (
        <div className="flex gap-2 flex-wrap mb-3.5">
          {suggestions.map((s, idx) => (
            <button
              id={`chat-suggestion-btn-${idx}`}
              key={idx}
              onClick={() => handleSendMessage(s)}
              className="px-3 py-1.5 bg-slate-950/40 hover:bg-slate-900 border border-slate-850 rounded-xl text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="pt-2 border-t border-slate-800 flex gap-2">
        <input
          id="chat-input"
          type="text"
          placeholder="Ask AI coach how to tackle your workload..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputText)}
          className="flex-1 px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
        />
        <button
          id="chat-send-btn"
          onClick={() => handleSendMessage(inputText)}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/10 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
