import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parser for incoming requests
app.use(express.json());

// Initialize Gemini SDK lazily to avoid crashing if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the environment variables.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "FocusFlow AI Backend is running." });
});

// 1. AI Task Breakdown
app.post("/api/breakdown", async (req, res) => {
  try {
    const { title, description, priority, category, estimatedDuration, difficulty } = req.body;
    
    if (!title) {
       res.status(400).json({ error: "Task title is required" });
       return;
    }

    const ai = getGeminiClient();
    
    const prompt = `
      You are an expert Productivity Coach and Task Optimizer. 
      Analyze the following task and generate a structured step-by-step completion plan.
      
      Task Details:
      - Title: ${title}
      - Description: ${description || "None provided"}
      - Category: ${category || "General"}
      - User Stated Priority: ${priority || "Medium"}
      - User Estimated Duration: ${estimatedDuration || "Not specified"}
      - User Difficulty Stated: ${difficulty || "Medium"}
      
      Generate a JSON response that matches exactly this TypeScript interface structure:
      {
        "difficultyScore": number, // 1 to 10
        "estimatedCompletionTime": string, // formatted like "2.5 hours" or "45 mins"
        "subtasks": [
          {
            "id": string, // unique random string id
            "title": string,
            "description": string,
            "durationMinutes": number,
            "order": number
          }
        ],
        "tips": string[], // Actionable cognitive or productivity tips to complete this task efficiently
        "resources": string[] // Tools, links, apps, or materials that would help
      }
      
      Return ONLY raw JSON. No markdown, no wrappers, just the plain JSON text.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    res.json(data);
  } catch (error: any) {
    console.error("Error in AI task breakdown:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI breakdown" });
  }
});

// 2. AI Scheduler Timeline
app.post("/api/schedule", async (req, res) => {
  try {
    const { availableHoursStart, availableHoursEnd, routineEvents, tasks } = req.body;
    
    const ai = getGeminiClient();
    
    const prompt = `
      You are an AI Time-Blocking Scheduler. 
      Create an optimized daily timeline.
      
      Day Context:
      - Working hours: ${availableHoursStart || "08:00"} to ${availableHoursEnd || "22:00"}
      - Routine events (College, Gym, Meetings, Meals, etc.): ${JSON.stringify(routineEvents || [])}
      - Core tasks to fit in: ${JSON.stringify(tasks || [])}
      
      Please pack the tasks into the available free slots during the working hours. Arrange them optimally, placing high-priority or highly difficult tasks during times of higher energy (typically mornings or early blocks), and leaving room for quick items. Include breaks if necessary.
      
      Generate a JSON response containing an array of schedule slots:
      {
        "schedule": [
          {
            "time": string, // e.g., "08:00 - 09:30"
            "activity": string, // Task Title or Routine Event Name or "Break / Rest"
            "type": "task" | "routine" | "break",
            "durationMinutes": number,
            "notes": string // Suggestion on what to focus on
          }
        ]
      }
      
      Return ONLY the raw JSON object. Do not wrap in markdown or code blocks.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    res.json(data);
  } catch (error: any) {
    console.error("Error in AI scheduler:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI schedule" });
  }
});

// 3. AI Coach Chat
app.post("/api/coach", async (req, res) => {
  try {
    const { messages, currentTasks } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
       res.status(400).json({ error: "Messages array is required" });
       return;
    }

    const ai = getGeminiClient();
    
    // Inject system persona and context about current tasks to make the assistant smart
    const systemPrompt = `
      You are "FocusFlow AI Coach", an empathetic, elite productivity strategist, and cognitive performance expert.
      Your goal is to help the user beat procrastination, create solid study/work plans, answer focus questions, and maintain high morale.
      You are pragmatic but warm. Rather than generic advice, offer highly actionable, bite-sized strategies (like Pomodoro, Time-boxing, 5-minute rule, visual momentum).
      
      CRITICAL SAFETY & WELLNESS POLICY:
      You must NEVER suggest harmful, unhealthy, or inhabitual routines. Under no circumstances should you advocate for sleep deprivation (e.g., "pulling an all-nighter"), skipping meals, heavy stimulant usage, or excessive, dangerous study blocks. Consistently prioritize cognitive hygiene, healthy hydration, active rest intervals, proper sleep schedules, and emotional well-being.
      
      User's Active Tasks & Deadlines Context:
      ${JSON.stringify(currentTasks || [])}
      
      Use this context to tailor your advice! If they are struggling, suggest specific tasks from their list to tackle first. Keep responses highly formatted, clean, and elegant using Markdown.
    `;

    // Map chat history to Gemini structure
    const geminiMessages = messages.map(msg => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    // Insert system prompt at the beginning or as systemInstruction
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: "[SYSTEM INSTRUCTION] " + systemPrompt }] },
        ...geminiMessages
      ]
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in AI Coach Chat:", error);
    res.status(500).json({ error: error.message || "Failed to contact AI Coach" });
  }
});

// 3.5 Speak Schedule parser API
app.post("/api/schedule-voice", async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
       res.status(400).json({ error: "Transcript is required" });
       return;
    }

    const ai = getGeminiClient();

    const prompt = `
      You are an AI voice-to-schedule conversion engine.
      The user spoke this message describing their plans, routine constraints, and tasks for the day:
      "${transcript}"

      Analyze their speech and generate an optimal daily timeline schedule. 
      Identify specific routine blockers (classes, dinner, meetings), tasks to carry out, and allocate balanced breaks.
      Ensure the schedule is healthy and realistic (includes meals, hydration, and breaks).

      Generate a JSON response that matches exactly this structure:
      {
        "schedule": [
          {
            "time": string, // e.g., "10:00 - 11:30"
            "activity": string, // specific parsed name
            "type": "task" | "routine" | "break",
            "durationMinutes": number,
            "notes": string // friendly encouragement or smart suggestion
          }
        ],
        "suggestionText": string // a friendly 2-3 sentence summary of why this plan is optimized for their flow and balance
      }

      Return ONLY the raw JSON object. Do not wrap in markdown or code blocks.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    res.json(data);
  } catch (error: any) {
    console.error("Error in voice scheduler:", error);
    res.status(500).json({ error: error.message || "Failed to parse spoken schedule" });
  }
});

// 4. Deadline Rescue Mode Action Plan
app.post("/api/rescue", async (req, res) => {
  try {
    const { task, hoursLeft } = req.body;
    
    if (!task) {
       res.status(400).json({ error: "Task is required" });
       return;
    }

    const ai = getGeminiClient();
    
    const prompt = `
      You are the "FocusFlow Deadline Rescue AI Engine". This is an EMERGENCY situation.
      A high-stakes task is due in only ${hoursLeft || 24} hours, and the user hasn't finished it.
      
      Task Details:
      - Title: ${task.title}
      - Description: ${task.description || "No description"}
      - Category: ${task.category || "General"}
      - Estimated duration: ${task.estimatedDuration || "Not specified"}
      
      You must construct an aggressive, hyper-focused, minute-by-minute survival action plan.
      We need to maximize their chances of delivering a high-quality outcome on time. 
      Identify what aspects to cut, what core elements to prioritize, how to stage study/sprints, and when to force quick review/submitting.
      
      Generate a JSON response that matches exactly this structure:
      {
        "riskLevel": "CRITICAL" | "HIGH" | "MEDIUM",
        "completionProbability": number, // Estimated percentage (e.g. 75)
        "survivalStrategy": string, // 2-3 sentences of core high-level battle strategy
        "rescueTimeline": [
          {
            "timeSlot": string, // e.g., "09:00 - 09:45"
            "durationMinutes": number,
            "focus": string, // Action-oriented, literal focus title
            "deliverable": string, // Concrete outcome for this block
            "urgency": "High" | "Medium" | "Low"
          }
        ],
        "tacticalTips": string[] // Emergency energy-hacks or time-savers
      }
      
      Return ONLY raw JSON text. No markdown formatting wrappers.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    res.json(data);
  } catch (error: any) {
    console.error("Error in deadline rescue:", error);
    res.status(500).json({ error: error.message || "Failed to generate emergency rescue plan" });
  }
});

// ==========================================
// STATIC ASSET SERVING & VITE INNER CORE
// ==========================================

async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FocusFlow AI server is blazing on http://localhost:${PORT}`);
  });
}

initializeServer().catch(err => {
  console.error("Failed to spin up FocusFlow server:", err);
});
