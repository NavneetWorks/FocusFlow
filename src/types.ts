export type PriorityLevel = 'Very Important' | 'Important' | 'Normal' | 'Low' | 'Low Priority' | 'Remember Me';

export interface RememberMeItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'document' | 'other';
  mediaUrl?: string;
  fileName?: string;
  priority: PriorityLevel;
  reminderTime?: string; // Date-time string for reminder
  createdAt: string;
  reminded?: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  order: number;
  completed: boolean;
}

export interface RescueSlot {
  timeSlot: string;
  durationMinutes: number;
  focus: string;
  deliverable: string;
  urgency: 'High' | 'Medium' | 'Low';
}

export interface RescuePlan {
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  completionProbability: number;
  survivalStrategy: string;
  rescueTimeline: RescueSlot[];
  tacticalTips: string[];
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: string; // ISO or date string
  priority: PriorityLevel;
  category: string;
  estimatedDuration: string; // e.g. "2 hours"
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'Pending' | 'In Progress' | 'Completed';
  notes: string;
  createdAt: string;
  completedAt?: string;
  history?: string[];
  
  // AI Generated fields
  difficultyScore?: number; // 1 to 10
  estimatedCompletionTime?: string;
  subtasks?: SubTask[];
  tips?: string[];
  resources?: string[];
  
  // Rescue mode fields
  rescuePlan?: RescuePlan;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  streak: number;
  lastCompleted?: string; // date string e.g. "2026-06-28"
  createdAt: string;
  weekdays?: string[]; // e.g. ["Monday", "Wednesday"]
  history?: string[]; // past completion dates
  priority?: PriorityLevel;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly';
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  history?: string[];
  weekdays?: string[]; // e.g. ["Monday", "Friday"]
  priority?: PriorityLevel;
}

export interface RoutineEvent {
  name: string;
  start: string; // e.g. "09:00"
  end: string; // e.g. "10:30"
  weekdays?: string[]; // e.g. ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}

export interface ScheduleSlot {
  time: string;
  activity: string;
  type: 'task' | 'routine' | 'break';
  durationMinutes: number;
  notes: string;
}

export interface Schedule {
  id: string;
  userId: string;
  date: string; // e.g. "2026-06-28"
  slots: ScheduleSlot[];
  availableHoursStart: string;
  availableHoursEnd: string;
  routineEvents: RoutineEvent[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface UserPreferences {
  pomodoroDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  dailyGoalCount: number;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface ProductivityAnalytics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  averageFocusTime: number; // minutes
  weeklyCompleted: { [key: string]: number }; // e.g. {"Mon": 3, "Tue": 5, ...}
  streakCounter: number;
}
