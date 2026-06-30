import { Task, Habit, Goal } from "../types";

export interface NotificationSettings {
  upcomingTasks: boolean;
  overdueTasks: boolean;
  goalReminders: boolean;
  habitReminders: boolean;
  dailyTargetReminders: boolean;
  deadlineAlerts: boolean;
  completionCelebrations: boolean;
  streakReminders: boolean;
  masterEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  upcomingTasks: true,
  overdueTasks: true,
  goalReminders: true,
  habitReminders: true,
  dailyTargetReminders: true,
  deadlineAlerts: true,
  completionCelebrations: true,
  streakReminders: true,
  masterEnabled: true,
};

// Keys for localStorage tracking
const SETTINGS_KEY = "focusflow_notification_settings";
const NOTIFIED_IDS_KEY = "focusflow_notified_event_ids";

export function getNotificationSettings(userEmail: string): NotificationSettings {
  const key = `${SETTINGS_KEY}_${userEmail || "default"}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error("Error loading notification settings", e);
    }
  }
  return DEFAULT_SETTINGS;
}

export function saveNotificationSettings(userEmail: string, settings: NotificationSettings) {
  const key = `${SETTINGS_KEY}_${userEmail || "default"}`;
  localStorage.setItem(key, JSON.stringify(settings));
}

// In-app alert queue callback so App.tsx can show custom visual banners
let inAppAlertCallback: ((title: string, body: string, category: string) => void) | null = null;

export function registerInAppAlertHandler(callback: (title: string, body: string, category: string) => void) {
  inAppAlertCallback = callback;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (e) {
      console.error("Error requesting notification permission", e);
    }
  }

  return false;
}

export function triggerNotification(
  title: string,
  body: string,
  category: keyof NotificationSettings,
  userEmail: string
) {
  const settings = getNotificationSettings(userEmail);
  if (!settings.masterEnabled || !settings[category]) {
    console.log(`[Notification Engine] Bypassed notification category "${category}" due to user preferences.`);
    return;
  }

  // 1. Desktop Notification
  let desktopSent = false;
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const options: NotificationOptions = {
        body,
        icon: "/assets/focus_avatar.png", // Fallback to asset or generic emoji if not found
        badge: "/assets/focus_avatar.png",
        tag: `focusflow-${category}`,
        requireInteraction: false,
      };

      // Use service worker notification if available to work better in background
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, options);
        });
      } else {
        new Notification(title, options);
      }
      desktopSent = true;
    } catch (e) {
      console.warn("Desktop Notification instantiation failed. Falling back to in-app banner.", e);
    }
  }

  // 2. Fallback or parallel in-app toast for visual delight
  if (inAppAlertCallback) {
    inAppAlertCallback(title, body, String(category));
  }
}

// Keep track of event hashes we already alerted to avoid duplicate alerts on the same task/goal state
function isAlreadyNotified(eventId: string, userEmail: string): boolean {
  const key = `${NOTIFIED_IDS_KEY}_${userEmail || "default"}`;
  const notified = localStorage.getItem(key);
  if (notified) {
    try {
      const list: string[] = JSON.parse(notified);
      return list.includes(eventId);
    } catch (e) {
      return false;
    }
  }
  return false;
}

function markAsNotified(eventId: string, userEmail: string) {
  const key = `${NOTIFIED_IDS_KEY}_${userEmail || "default"}`;
  const notified = localStorage.getItem(key);
  let list: string[] = [];
  if (notified) {
    try {
      list = JSON.parse(notified);
    } catch (e) {
      list = [];
    }
  }
  if (!list.includes(eventId)) {
    list.push(eventId);
    // Keep it trimmed to avoid growing infinitely
    if (list.length > 500) {
      list = list.slice(list.length - 300);
    }
    localStorage.setItem(key, JSON.stringify(list));
  }
}

export function clearNotifiedHistory(userEmail: string) {
  const key = `${NOTIFIED_IDS_KEY}_${userEmail || "default"}`;
  localStorage.removeItem(key);
}

/**
 * Main Scheduler Engine called periodically (e.g. every 30 seconds)
 */
export function checkAndTriggerProductivityReminders(
  tasks: Task[],
  habits: Habit[],
  goals: Goal[],
  userEmail: string
) {
  const settings = getNotificationSettings(userEmail);
  if (!settings.masterEnabled) return;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

  // ==========================================
  // 1. UPCOMING TASKS & DEADLINE ALERTS (Grouped)
  // ==========================================
  if (settings.upcomingTasks || settings.deadlineAlerts) {
    const upcomingTasksToNotify: Task[] = [];
    const urgentAlertsToNotify: Task[] = [];

    tasks.forEach((t) => {
      if (t.status === "Completed" || !t.deadline) return;

      const deadlineTime = new Date(t.deadline).getTime();
      const diffMs = deadlineTime - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes > 0) {
        // Immediate alert: due in 5 minutes
        if (diffMinutes <= 6 && settings.deadlineAlerts) {
          const id = `deadline_alert_${t.id}`;
          if (!isAlreadyNotified(id, userEmail)) {
            urgentAlertsToNotify.push(t);
            markAsNotified(id, userEmail);
          }
        }
        // General upcoming alert: due in 60 minutes
        else if (diffMinutes <= 60 && settings.upcomingTasks) {
          const id = `upcoming_alert_${t.id}`;
          if (!isAlreadyNotified(id, userEmail)) {
            upcomingTasksToNotify.push(t);
            markAsNotified(id, userEmail);
          }
        }
      }
    });

    // Grouping triggers to prevent spam
    if (urgentAlertsToNotify.length > 1) {
      triggerNotification(
        "⚠️ Multiple Immediate Deadlines!",
        `You have ${urgentAlertsToNotify.length} tasks due in less than 5 minutes! Stop procrastinating, let's smash them! 🚀`,
        "deadlineAlerts",
        userEmail
      );
    } else if (urgentAlertsToNotify.length === 1) {
      const t = urgentAlertsToNotify[0];
      triggerNotification(
        "⏰ Deadline Alert!",
        `"${t.title}" is due in less than 5 minutes! (${t.priority} Priority). You've got this! 💪`,
        "deadlineAlerts",
        userEmail
      );
    }

    if (upcomingTasksToNotify.length > 1) {
      triggerNotification(
        "⚡ Upcoming Task Reminders",
        `You have ${upcomingTasksToNotify.length} high priority tasks starting or due within the hour. Open your workspace to review them. ☕`,
        "upcomingTasks",
        userEmail
      );
    } else if (upcomingTasksToNotify.length === 1) {
      const t = upcomingTasksToNotify[0];
      triggerNotification(
        "⏳ Upcoming Task",
        `"${t.title}" is starting or due within an hour. Prepare to focus! 🧠`,
        "upcomingTasks",
        userEmail
      );
    }
  }

  // ==========================================
  // 2. OVERDUE TASKS
  // ==========================================
  if (settings.overdueTasks) {
    const overdueTasksToNotify: Task[] = [];
    tasks.forEach((t) => {
      if (t.status === "Completed" || !t.deadline) return;

      const deadlineTime = new Date(t.deadline).getTime();
      const isPast = now.getTime() > deadlineTime;
      const hoursOverdue = (now.getTime() - deadlineTime) / (1000 * 60 * 60);

      // Notify if overdue, and only alert once or twice (we'll notify once per task when it first goes overdue)
      if (isPast) {
        const id = `overdue_alert_${t.id}`;
        if (!isAlreadyNotified(id, userEmail)) {
          overdueTasksToNotify.push(t);
          markAsNotified(id, userEmail);
        }
      }
    });

    if (overdueTasksToNotify.length > 1) {
      triggerNotification(
        "⚠️ Overdue Tasks Notice",
        `You have ${overdueTasksToNotify.length} pending tasks past their deadline. Let's schedule a rescue slot! 🛠️`,
        "overdueTasks",
        userEmail
      );
    } else if (overdueTasksToNotify.length === 1) {
      const t = overdueTasksToNotify[0];
      triggerNotification(
        "⌛ Task Overdue",
        `"${t.title}" is past its target deadline. Take action now or update the schedule! 🎯`,
        "overdueTasks",
        userEmail
      );
    }
  }

  // ==========================================
  // 3. GOAL REMINDERS
  // ==========================================
  if (settings.goalReminders) {
    const pendingGoals = goals.filter((g) => !g.completed);
    if (pendingGoals.length > 0) {
      // Gentle reminder at 12:00 PM and 6:00 PM
      const hours = now.getHours();
      const minutes = now.getMinutes();
      if ((hours === 12 || hours === 18) && minutes === 0) {
        const id = `daily_goal_reminder_${todayStr}_${hours}`;
        if (!isAlreadyNotified(id, userEmail)) {
          triggerNotification(
            "🎯 Mid-Day Goal Check-in",
            `You have ${pendingGoals.length} pending study targets committed for today. Take a quick focus sprint! ⚡`,
            "goalReminders",
            userEmail
          );
          markAsNotified(id, userEmail);
        }
      }
    }
  }

  // ==========================================
  // 4. HABIT REMINDERS & STREAKS
  // ==========================================
  if (settings.habitReminders || settings.streakReminders) {
    const pendingHabits = habits.filter((h) => {
      if (!h.lastCompleted) return true;
      return h.lastCompleted !== todayStr;
    });

    if (pendingHabits.length > 0) {
      // Remind about habits and streaks in the evening (8:00 PM)
      const hours = now.getHours();
      if (hours === 20) {
        const id = `habit_streak_reminder_${todayStr}`;
        if (!isAlreadyNotified(id, userEmail)) {
          const highStreakHabits = pendingHabits.filter((h) => h.streak > 2);
          if (highStreakHabits.length > 0 && settings.streakReminders) {
            triggerNotification(
              "🔥 Streak Risk Alert!",
              `Don't break your streak! You have ${highStreakHabits.length} habits with strong streaks pending today. Keep the chain going! 🔗`,
              "streakReminders",
              userEmail
            );
          } else if (settings.habitReminders) {
            triggerNotification(
              "🌸 Daily Habit Routine",
              `You have ${pendingHabits.length} habits left to lock in today. Take a moment to check them off! 🧘`,
              "habitReminders",
              userEmail
            );
          }
          markAsNotified(id, userEmail);
        }
      }
    }
  }
}
