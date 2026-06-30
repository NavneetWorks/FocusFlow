import React, { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from "firebase/firestore";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "./firebase";
import { Task, SubTask, Habit, Goal, ScheduleSlot, UserPreferences, RoutineEvent, RememberMeItem, PriorityLevel } from "./types";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import TaskManagement from "./components/TaskManagement";
import RememberMe from "./components/RememberMe";
import AIScheduler from "./components/AIScheduler";
import HabitTracker from "./components/HabitTracker";
import GoalsTracker from "./components/GoalsTracker";
import CalendarView from "./components/CalendarView";
import AICoach from "./components/AICoach";
import AnalyticsView from "./components/AnalyticsView";
import ProfileSettings from "./components/ProfileSettings";
import OnboardingModal from "./components/OnboardingModal";
import FlowyAIFriend from "./components/FlowyAIFriend";
import CommitmentsShare from "./components/CommitmentsShare";
import NotificationsView, { StoredNotification } from "./components/NotificationsView";
import { checkAndTriggerProductivityReminders, registerInAppAlertHandler } from "./utils/notificationEngine";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Brain, Lock, Mail, ChevronRight, UserPlus, Info, AlertCircle, Menu, X, Bell, ArrowLeft } from "lucide-react";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  timestamp: Date;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [sharedCommitmentId, setSharedCommitmentId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoEmail, setDemoEmail] = useState("demo.hacker@focusflow.ai");
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [notificationsList, setNotificationsList] = useState<StoredNotification[]>([]);
  const [showDistractionPrompt, setShowDistractionPrompt] = useState(false);
  const [distractionAwaySeconds, setDistractionAwaySeconds] = useState(0);

  // Authentication Fields
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");

  // Navigation state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Focus selection state
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);

  // Global Lists States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rememberMeItems, setRememberMeItems] = useState<RememberMeItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [routineEvents, setRoutineEvents] = useState<RoutineEvent[]>([
    { name: "College Classes", start: "09:00", end: "14:00" },
    { name: "Gym Workout", start: "17:30", end: "19:00" }
  ]);
  const [availableHoursStart, setAvailableHoursStart] = useState("08:00");
  const [availableHoursEnd, setAvailableHoursEnd] = useState("22:00");

  // User preferences
  const [preferences, setPreferences] = useState<UserPreferences>({
    pomodoroDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    dailyGoalCount: 3,
    notificationsEnabled: true,
    theme: "dark"
  });

  // AI Generation Loading triggers
  const [isGeneratingBreakdown, setIsGeneratingBreakdown] = useState(false);
  const [isGeneratingRescue, setIsGeneratingRescue] = useState(false);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);

  // User Profile, Onboarding and responsive states
  const [profile, setProfile] = useState<{
    name: string;
    age: number | '';
    profession: string;
    profilePic?: string;
    company?: string;
    bio?: string;
    focusTarget?: number;
  } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Standardized callback to trigger both in-app and native system notifications
  const playIphoneNotificationSound = React.useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const playNote = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Triangle/sine mix for premium chime bell tone
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, time);

        // Subtle octave metallic bell overtone
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(freq * 2, time);
        gain2.gain.setValueAtTime(0.02, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        gain2.gain.setValueAtTime(0, time);
        gain2.gain.linearRampToValueAtTime(0.02, time + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.5);

        osc.connect(gain);
        osc2.connect(gain2);
        gain.connect(ctx.destination);
        gain2.connect(ctx.destination);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + duration);
        osc2.stop(time + duration);
      };

      const now = ctx.currentTime;
      // Synthesized classic iOS "Tri-tone" melody
      playNote(now, 1046.50, 0.35);       // Note 1: C6
      playNote(now + 0.11, 1318.51, 0.35); // Note 2: E6
      playNote(now + 0.22, 1567.98, 0.45); // Note 3: G6
    } catch (err) {
      console.warn("Audio context not enabled or blocked:", err);
    }
  }, []);

  const triggerAppNotification = React.useCallback(async (
    title: string,
    message: string,
    type: 'info' | 'warning' | 'critical' | 'encouragement' = 'info'
  ) => {
    if (!preferences.notificationsEnabled) return;
    const newId = `notif_${Date.now()}_${Math.random()}`;

    // Play the premium iPhone-like synthesized chime sound!
    playIphoneNotificationSound();

    // 1. Add to in-app toast notification state (for toast banners)
    setAppNotifications(prev => {
      const updated = [...prev, {
        id: newId,
        title,
        message,
        type: type === 'encouragement' ? 'info' : type,
        timestamp: new Date()
      }];
      if (updated.length > 5) {
        updated.shift();
      }
      return updated;
    });

    // Auto-remove toast after 10 seconds
    setTimeout(() => {
      setAppNotifications(prev => prev.filter(n => n.id !== newId));
    }, 10000);

    // 2. Trigger native browser notification
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body: message });
      } catch (e) {
        console.warn("Failed to trigger native notification", e);
      }
    }

    // 3. Save to stored notifications log
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";
    const newStoredNotif = {
      userId: currentUserId,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };

    if (isDemoMode) {
      setNotificationsList(prev => {
        const updated = [{ id: newId, ...newStoredNotif } as StoredNotification, ...prev];
        localStorage.setItem(`notifications_${currentUserId}`, JSON.stringify(updated));
        return updated;
      });
    } else if (user) {
      try {
        await addDoc(collection(db, "notifications"), newStoredNotif);
      } catch (err) {
        console.error("Failed to add notification log to Firestore:", err);
      }
    }
  }, [preferences.notificationsEnabled, user, isDemoMode, demoEmail]);

  // Register in-app alert handler from notificationEngine
  useEffect(() => {
    registerInAppAlertHandler((title, body, category) => {
      const type: 'info' | 'warning' | 'critical' =
        category === 'deadlineAlerts' || category === 'overdueTasks' ? 'critical' : 'info';
      triggerAppNotification(title, body, type);
    });
  }, [triggerAppNotification]);

  // Periodic scheduler polling for background task alerts
  useEffect(() => {
    const userEmail = user?.email || demoEmail || "anonymous@focusflow.ai";
    // Check immediately on load
    checkAndTriggerProductivityReminders(tasks, habits, goals, userEmail);

    const interval = setInterval(() => {
      checkAndTriggerProductivityReminders(tasks, habits, goals, userEmail);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [tasks, habits, goals, user, demoEmail]);

  // Auth Listener and Redirect processor
  useEffect(() => {
    // Check redirect result on load
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
          setIsDemoMode(false);
        }
      })
      .catch((err) => {
        console.error("Redirect sign-in error:", err);
        setAuthError(err.message || "Google Sign-In via redirect failed.");
      });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsDemoMode(false);
      } else {
        setUser(null);
      }
      setIsLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  // Responsive mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check for shared commitment link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const commitmentId = params.get("sharedCommitment");
    if (commitmentId) {
      setSharedCommitmentId(commitmentId);
      setActiveTab("commitments");
    }
  }, []);

  // Synchronize light/dark/system theme
  useEffect(() => {
    const applyTheme = () => {
      let activeTheme: "light" | "dark" = "dark";
      if (preferences.theme === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        activeTheme = isDark ? "dark" : "light";
      } else {
        activeTheme = preferences.theme;
      }

      if (activeTheme === "light") {
        document.body.classList.add("light");
      } else {
        document.body.classList.remove("light");
      }
    };

    applyTheme();

    if (preferences.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme();
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [preferences.theme]);

  // Load User Profile from LocalStorage / Firestore
  useEffect(() => {
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : null;
    if (!currentUserId) {
      setProfile(null);
      setShowOnboarding(false);
      return;
    }

    const localProfile = localStorage.getItem(`profile_${currentUserId}`);
    if (localProfile) {
      setProfile(JSON.parse(localProfile));
      setShowOnboarding(false);
    } else if (isDemoMode) {
      setShowOnboarding(true);
    }

    if (user) {
      const loadProfile = async () => {
        try {
          const docSnap = await getDoc(doc(db, "profiles", user.uid));
          if (docSnap.exists()) {
            const profData = docSnap.data();
            const loadedProf = {
              name: profData.name || "",
              age: profData.age || "",
              profession: profData.profession || "",
              profilePic: profData.profilePic || "",
              company: profData.company || "",
              bio: profData.bio || "",
              focusTarget: profData.focusTarget || 4
            };
            setProfile(loadedProf);
            localStorage.setItem(`profile_${user.uid}`, JSON.stringify(loadedProf));
            setShowOnboarding(false);
          } else if (!localProfile) {
            setShowOnboarding(true);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `profiles/${user.uid}`);
          if (!localProfile) setShowOnboarding(true);
        }
      };
      loadProfile();
    }
  }, [user, isDemoMode, demoEmail]);

  const handleSaveProfile = async (profData: {
    name: string;
    age: number | '';
    profession: string;
    profilePic?: string;
    company?: string;
    bio?: string;
    focusTarget?: number;
  }) => {
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";
    setProfile(profData);
    localStorage.setItem(`profile_${currentUserId}`, JSON.stringify(profData));
    setShowOnboarding(false);

    if (user) {
      try {
        await setDoc(doc(db, "profiles", user.uid), {
          userId: user.uid,
          ...profData,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `profiles/${user.uid}`);
      }
    }
  };

  // Sync state with cloud Firestore when user is logged in
  useEffect(() => {
    if (!user && !isDemoMode) {
      setTasks([]);
      setRememberMeItems([]);
      setHabits([]);
      setGoals([]);
      setSchedule([]);
      setNotificationsList([]);
      return;
    }

    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";

    if (isDemoMode) {
      // Load from LocalStorage if in demo mode
      const localTasks = localStorage.getItem(`tasks_${currentUserId}`);
      const localRememberMe = localStorage.getItem(`rememberMe_${currentUserId}`);
      const localHabits = localStorage.getItem(`habits_${currentUserId}`);
      const localGoals = localStorage.getItem(`goals_${currentUserId}`);
      const localSchedule = localStorage.getItem(`schedule_${currentUserId}`);
      const localNotifications = localStorage.getItem(`notifications_${currentUserId}`);

      if (localTasks) setTasks(JSON.parse(localTasks));
      if (localRememberMe) setRememberMeItems(JSON.parse(localRememberMe));
      if (localHabits) setHabits(JSON.parse(localHabits));
      if (localGoals) setGoals(JSON.parse(localGoals));
      if (localSchedule) setSchedule(JSON.parse(localSchedule));
      if (localNotifications) setNotificationsList(JSON.parse(localNotifications));
      return;
    }

    // Bind real-time Firestore listeners for premium cloud storage sync
    const tasksQuery = query(collection(db, "tasks"), where("userId", "==", currentUserId));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const updatedTasks: Task[] = [];
      snapshot.forEach((doc) => {
        updatedTasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(updatedTasks);
    }, (err) => console.error("Firestore tasks subscription error:", err));

    const rememberMeQuery = query(collection(db, "rememberMe"), where("userId", "==", currentUserId));
    const unsubscribeRememberMe = onSnapshot(rememberMeQuery, (snapshot) => {
      const updatedRM: RememberMeItem[] = [];
      snapshot.forEach((doc) => {
        updatedRM.push({ id: doc.id, ...doc.data() } as RememberMeItem);
      });
      setRememberMeItems(updatedRM);
    }, (err) => console.error("Firestore rememberMe subscription error:", err));

    const habitsQuery = query(collection(db, "habits"), where("userId", "==", currentUserId));
    const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
      const updatedHabits: Habit[] = [];
      snapshot.forEach((doc) => {
        updatedHabits.push({ id: doc.id, ...doc.data() } as Habit);
      });
      setHabits(updatedHabits);
    });

    const goalsQuery = query(collection(db, "goals"), where("userId", "==", currentUserId));
    const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
      const updatedGoals: Goal[] = [];
      snapshot.forEach((doc) => {
        updatedGoals.push({ id: doc.id, ...doc.data() } as Goal);
      });
      setGoals(updatedGoals);
    });

    const scheduleQuery = query(collection(db, "schedules"), where("userId", "==", currentUserId));
    const unsubscribeSchedule = onSnapshot(scheduleQuery, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setSchedule(docSnap.data().slots || []);
      }
    });

    const notificationsQuery = query(collection(db, "notifications"), where("userId", "==", currentUserId));
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const updatedList: StoredNotification[] = [];
      snapshot.forEach((doc) => {
        updatedList.push({ id: doc.id, ...doc.data() } as StoredNotification);
      });
      // Sort by timestamp descending
      updatedList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotificationsList(updatedList);
    }, (err) => console.error("Firestore notifications subscription error:", err));

    const commitmentsQuery = query(collection(db, "commitments"), where("userId", "==", currentUserId));
    const previousCommentsRef = { current: new Set<string>() };
    let isCommitmentsInitialized = false;

    const unsubscribeCommitments = onSnapshot(commitmentsQuery, (snapshot) => {
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const comments = (data.comments || []) as { id: string, name: string, text: string }[];
        comments.forEach((comment) => {
          if (!previousCommentsRef.current.has(comment.id)) {
            previousCommentsRef.current.add(comment.id);
            if (isCommitmentsInitialized) {
              triggerAppNotification(
                `💖 Encouragement from ${comment.name}!`,
                `"${comment.text}"`,
                "encouragement"
              );
            }
          }
        });
      });
      isCommitmentsInitialized = true;
    }, (err) => console.error("Firestore commitments subscription error:", err));

    return () => {
      unsubscribeTasks();
      unsubscribeRememberMe();
      unsubscribeHabits();
      unsubscribeGoals();
      unsubscribeSchedule();
      unsubscribeNotifications();
      unsubscribeCommitments();
    };
  }, [user, isDemoMode, demoEmail]);

  // Save to LocalStorage falling back for simulated workspace
  useEffect(() => {
    if (isDemoMode) {
      const currentUserId = `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      localStorage.setItem(`tasks_${currentUserId}`, JSON.stringify(tasks));
      localStorage.setItem(`rememberMe_${currentUserId}`, JSON.stringify(rememberMeItems));
      localStorage.setItem(`habits_${currentUserId}`, JSON.stringify(habits));
      localStorage.setItem(`goals_${currentUserId}`, JSON.stringify(goals));
      localStorage.setItem(`schedule_${currentUserId}`, JSON.stringify(schedule));
    }
  }, [tasks, rememberMeItems, habits, goals, schedule, isDemoMode, demoEmail]);

  // Notification Permission Request & Task Timer Checking (30-min regular, 5-min close to end)
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const lastNotificationTimes = React.useRef<{[taskId: string]: number}>({});
  const lastRoutineNotificationTimes = React.useRef<{[key: string]: boolean}>({});

  useEffect(() => {
    const checkNotifications = () => {
      if (!preferences.notificationsEnabled) return;
      const now = Date.now();
      const currentFullTime = new Date();
      const currentHour = currentFullTime.getHours();
      const currentDayStr = currentFullTime.toDateString();

      // 1AM, 9AM, and 3PM (15:00) Routine Briefings
      if (currentHour === 1 || currentHour === 9 || currentHour === 15) {
        const slotKey = `${currentDayStr}_${currentHour}`;
        if (!lastRoutineNotificationTimes.current[slotKey]) {
          lastRoutineNotificationTimes.current[slotKey] = true;

          const pendingTasks = tasks.filter(t => t.status !== "Completed");
          const activeGoals = goals.filter(g => !g.completed);
          const activeHabits = habits;

          let brief = "";
          if (pendingTasks.length > 0) {
            brief += `📋 ${pendingTasks.length} Pending Tasks (e.g. "${pendingTasks[0].title}") `;
          }
          if (activeGoals.length > 0) {
            brief += `🎯 ${activeGoals.length} Goals `;
          }
          if (activeHabits.length > 0) {
            brief += `⚡ ${activeHabits.length} Habits `;
          }
          if (!brief) {
            brief = "No active tasks or goals scheduled for today. Have an amazing, productive day!";
          }

          const timeLabel = currentHour === 1 ? "1:00 AM Dawn" : currentHour === 9 ? "9:00 AM Morning" : "3:00 PM Afternoon";
          triggerAppNotification(
            `📅 Today's Routine (${timeLabel})`,
            `Your Daily Brief: ${brief}`,
            'info'
          );
        }
      }

      tasks.forEach((task) => {
        if (task.status === "Completed") {
          delete lastNotificationTimes.current[task.id];
          return;
        }

        let isUrgent = false;
        if (task.deadline) {
          const deadlineTime = new Date(task.deadline).getTime();
          const hoursLeft = (deadlineTime - now) / (1000 * 60 * 60);
          // within 2 hours of the deadline is "very close to very end" (emergency)
          if (hoursLeft > 0 && hoursLeft <= 2) {
            isUrgent = true;
          }
        }

        // Very Important tasks are also emergency priority level
        if (task.priority === "Very Important") {
          isUrgent = true;
        }

        const lastTime = lastNotificationTimes.current[task.id];
        if (lastTime === undefined) {
          // First time seeing this task in this session: initialize to current time to avoid initial spam
          lastNotificationTimes.current[task.id] = now;
          return;
        }

        const intervalMs = isUrgent ? 5 * 60 * 1000 : 30 * 60 * 1000;
        const elapsedMs = now - lastTime;

        if (elapsedMs >= intervalMs) {
          const notifTitle = isUrgent ? "🚨 Urgent Emergency Alert!" : "📋 Task Progress Check-In";
          const notifMsg = isUrgent
            ? `Emergency Reminder: "${task.title}" is high-priority or very close to its end! Please act now.`
            : `Friendly 30-minute progress update: Keep up the excellent work on "${task.title}"!`;
          const notifType = isUrgent ? 'critical' : 'info';

          triggerAppNotification(notifTitle, notifMsg, notifType);
          lastNotificationTimes.current[task.id] = now;
        }
      });

      // 3. Remember Me alarm checking
      rememberMeItems.forEach((item) => {
        if (item.reminderTime && !item.reminded) {
          const remindTime = new Date(item.reminderTime).getTime();
          if (now >= remindTime) {
            triggerAppNotification(
              `🔔 Remember Me Reminder!`,
              `Don't forget: "${item.title}" - ${item.content || "Keep this in mind!"}`,
              "info"
            );
            if (isDemoMode) {
              setRememberMeItems(prev => prev.map(p => p.id === item.id ? { ...p, reminded: true } : p));
            } else {
              updateDoc(doc(db, "rememberMe", item.id), { reminded: true }).catch(err => {
                console.error("Failed to update rememberMe reminded flag in Firestore:", err);
              });
            }
          }
        }
      });
    };

    // Check immediately on mount/update, then every 10 seconds
    checkNotifications();
    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [tasks, goals, habits, rememberMeItems, preferences.notificationsEnabled, triggerAppNotification, isDemoMode]);

  // Tab Visibility change listener for tracking distractions and showing interesting notification alerts
  const lastHiddenTimeRef = React.useRef<number | null>(null);

  const handleConfirmDistraction = () => {
    setShowDistractionPrompt(false);
    const userName = profile?.name || "there";
    const messages = [
      `👀 Busted, ${userName}! A quick trip to check notifications or browse away? Your focus goals missed you!`,
      `🧘 Back so soon, ${userName}? Focus is a muscle—don't let digital noise break your compound gains. Let's lock back in!`,
      `⚡ Welcome back, ${userName}! The internet is designed to steal your attention, but your ambition is designed to win. Let's build!`,
      `🚀 Signal restored! You were away for ${distractionAwaySeconds} seconds. Let's resume the flow and hit that focus target.`,
      `🎯 ${userName}, "Energy flows where attention goes." Put the distractions aside, we've got real work to do!`
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    triggerAppNotification(
      "⚠️ Distraction Alert!",
      randomMsg,
      "warning"
    );
  };

  const handleDeclineDistraction = () => {
    setShowDistractionPrompt(false);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.hidden) {
        // User left the tab, mark the time
        lastHiddenTimeRef.current = now;
      } else {
        // User returned to the tab
        if (lastHiddenTimeRef.current) {
          const durationAwaySeconds = Math.round((now - lastHiddenTimeRef.current) / 1000);
          // If away for more than 5 seconds, register as a distraction!
          if (durationAwaySeconds >= 5) {
            setDistractionAwaySeconds(durationAwaySeconds);
            setShowDistractionPrompt(true);
          }
          lastHiddenTimeRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [profile, triggerAppNotification]);

  // Reactive Change Detection Effect for Tasks (Instant Pending, Done, and Emergency triggers)
  const prevTasksRef = React.useRef<Task[]>([]);
  const isTasksInitializedRef = React.useRef(false);

  useEffect(() => {
    if (tasks.length === 0) return;

    if (!isTasksInitializedRef.current) {
      prevTasksRef.current = tasks;
      isTasksInitializedRef.current = true;
      return;
    }

    const prevTasks = prevTasksRef.current;

    tasks.forEach((task) => {
      const prevTask = prevTasks.find(t => t.id === task.id);

      if (!prevTask) {
        // Newly added task - Pending or Emergency
        const isEmergency = task.priority === "Very Important";
        const notifTitle = isEmergency ? "🚨 Emergency Task Queued" : "📋 Task Queued & Pending";
        const notifMsg = isEmergency
          ? `High Alert: "${task.title}" was added with Very Important priority!`
          : `Task "${task.title}" has been added and is pending.`;
        const notifType = isEmergency ? 'critical' : 'info';

        triggerAppNotification(notifTitle, notifMsg, notifType);
      } else {
        // Status transitions (Done / Pending / Emergency)
        if (prevTask.status !== "Completed" && task.status === "Completed") {
          // Finished / Done
          triggerAppNotification("✅ Task Completed (Done)", `Done! You successfully finished "${task.title}". Great work!`, 'info');
        } else if (prevTask.status === "Completed" && task.status === "Pending") {
          // Reopened / Pending
          triggerAppNotification("📋 Task Reopened (Pending)", `Task "${task.title}" is back on your pending checklist.`, 'info');
        }

        // Priority transitions (Emergency escalation)
        if (prevTask.priority !== "Very Important" && task.priority === "Very Important") {
          triggerAppNotification("🚨 Emergency Escalation", `Critical: "${task.title}" has been escalated to Very Important priority!`, 'critical');
        }
      }
    });

    prevTasksRef.current = tasks;
  }, [tasks, triggerAppNotification]);

  // Reactive Change Detection Effect for Goals (Creation and completion)
  const prevGoalsRef = React.useRef<Goal[]>([]);
  const isGoalsInitializedRef = React.useRef(false);

  useEffect(() => {
    if (goals.length === 0) return;

    if (!isGoalsInitializedRef.current) {
      prevGoalsRef.current = goals;
      isGoalsInitializedRef.current = true;
      return;
    }

    const prevGoals = prevGoalsRef.current;

    goals.forEach((goal) => {
      const prevGoal = prevGoals.find(g => g.id === goal.id);

      if (!prevGoal) {
        triggerAppNotification(
          "🎯 Goal Added",
          `Your new goal "${goal.title}" (${goal.type}) is now active. Let's make it happen!`,
          "info"
        );
      } else {
        if (!prevGoal.completed && goal.completed) {
          triggerAppNotification(
            "🏆 Goal Achieved!",
            `Phenomenal effort! You completed your goal: "${goal.title}"! Keep winning!`,
            "info"
          );
        }
      }
    });

    prevGoalsRef.current = goals;
  }, [goals, triggerAppNotification]);

  // Reactive Change Detection Effect for Habits (Creation and streak completions)
  const prevHabitsRef = React.useRef<Habit[]>([]);
  const isHabitsInitializedRef = React.useRef(false);

  useEffect(() => {
    if (habits.length === 0) return;

    if (!isHabitsInitializedRef.current) {
      prevHabitsRef.current = habits;
      isHabitsInitializedRef.current = true;
      return;
    }

    const prevHabits = prevHabitsRef.current;

    habits.forEach((habit) => {
      const prevHabit = prevHabits.find(h => h.id === habit.id);

      if (!prevHabit) {
        triggerAppNotification(
          "⚡ Habit Tracker Added",
          `A new daily habit "${habit.title}" has been registered. Consistency is power!`,
          "info"
        );
      } else {
        if (prevHabit.streak < habit.streak || (prevHabit.lastCompleted !== habit.lastCompleted && habit.lastCompleted)) {
          triggerAppNotification(
            "🔥 Habit Streak Extended!",
            `Consistency unlocked! You completed "${habit.title}". Current Streak: ${habit.streak} days. Keep going!`,
            "info"
          );
        }
      }
    });

    prevHabitsRef.current = habits;
  }, [habits, triggerAppNotification]);

  // Reactive Change Detection Effect for Remember Me Items (Creation)
  const prevRememberMeRef = React.useRef<RememberMeItem[]>([]);
  const isRememberMeInitializedRef = React.useRef(false);

  useEffect(() => {
    if (rememberMeItems.length === 0) return;

    if (!isRememberMeInitializedRef.current) {
      prevRememberMeRef.current = rememberMeItems;
      isRememberMeInitializedRef.current = true;
      return;
    }

    const prevRM = prevRememberMeRef.current;

    rememberMeItems.forEach((item) => {
      const prevItem = prevRM.find(i => i.id === item.id);

      if (!prevItem) {
        triggerAppNotification(
          "💾 Remember Me Item Added",
          `Saved "${item.title}" successfully. We've locked this in your focus companion's brain!`,
          "info"
        );
      }
    });

    prevRememberMeRef.current = rememberMeItems;
  }, [rememberMeItems, triggerAppNotification]);

  // Auth Submit Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!authEmail || !authPassword) {
      setAuthError("Please provide all fields.");
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err: any) {
      console.error("Firebase auth error, falling back to local workspace option:", err);
      // Fallback for any auth failure in preview/sandbox mode to keep users fully operational
      setAuthError(`auth-blocked-use-local|${authEmail}`);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    try {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobileDevice) {
        setAuthError("Mobile device detected. Launching Google Sign-In redirect...");
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err: any) {
      console.error("Google Sign-In error:", err);
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.message?.includes("popup-closed-by-user") ||
        err.code === "auth/cancelled-popup-request" ||
        err.message?.includes("popup-blocked")
      ) {
        try {
          setAuthError("Popup blocked or closed. Launching Google Sign-In redirect...");
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr: any) {
          console.error("Google Redirect Error:", redirectErr);
          setAuthError(redirectErr.message || "Google Sign-In Redirect failed.");
        }
      } else if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        setAuthError("auth/operation-not-allowed-google");
      } else {
        setAuthError(err.message || "Google Sign-In failed. Try opening the app in a new tab if you are inside an iframe.");
      }
    }
  };

  const handleLogout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
    } else {
      await signOut(auth);
    }
    setActiveTab("dashboard");
  };

  const handleEraseAllData = async () => {
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";

    // 1. Reset localStorage completely
    localStorage.clear();

    // 2. Clear cloud records if authenticated user
    if (user) {
      try {
        const collectionsToPurge = [
          "tasks",
          "habits",
          "goals",
          "rememberMe",
          "schedule",
          "feedback",
          "problems",
          "commitments"
        ];

        for (const colName of collectionsToPurge) {
          const q = query(collection(db, colName), where("userId", "==", currentUserId));
          const snapshot = await getDocs(q);
          const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, colName, docSnap.id)));
          await Promise.all(deletePromises);
        }

        // Delete user profile
        await deleteDoc(doc(db, "profiles", currentUserId));
      } catch (err) {
        console.error("Failed to delete cloud docs during erase:", err);
      }
    }

    // 3. Reset internal memory/states
    setTasks([]);
    setRememberMeItems([]);
    setHabits([]);
    setGoals([]);
    setSchedule([]);
    setProfile(null);

    triggerAppNotification(
      "🧹 Data Erased",
      "All of your personal metrics, goals, and history have been completely and irreversibly erased.",
      "critical"
    );

    // 4. Terminate active session
    await handleLogout();
  };

  // ==========================================
  // DB DATA EDIT ACTIONS
  // ==========================================

  // Task DB handlers
  const handleAddTask = async (taskData: Omit<Task, "id" | "userId" | "createdAt">) => {
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";
    const newTask: Omit<Task, "id"> = {
      ...taskData,
      userId: currentUserId,
      createdAt: new Date().toISOString()
    };

    if (isDemoMode) {
      setTasks(prev => [...prev, { id: `local_task_${Date.now()}`, ...newTask } as Task]);
    } else {
      try {
        await addDoc(collection(db, "tasks"), newTask);
      } catch (err) {
        console.error("Failed to add task to Firestore:", err);
      }
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (isDemoMode) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    } else {
      try {
        await updateDoc(doc(db, "tasks", taskId), updates);
      } catch (err) {
        console.error("Failed to update task in Firestore:", err);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (isDemoMode) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } else {
      try {
        await deleteDoc(doc(db, "tasks", taskId));
      } catch (err) {
        console.error("Failed to delete task from Firestore:", err);
      }
    }
  };

  // Habit DB handlers
  const handleAddHabit = async (title: string, weekdays?: string[], priority?: PriorityLevel) => {
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";
    const newHabit: Omit<Habit, "id"> = {
      userId: currentUserId,
      title,
      streak: 0,
      createdAt: new Date().toISOString(),
      weekdays: weekdays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      priority: priority || "Normal"
    };

    if (isDemoMode) {
      setHabits(prev => [...prev, { id: `local_habit_${Date.now()}`, ...newHabit } as Habit]);
    } else {
      await addDoc(collection(db, "habits"), newHabit);
    }
  };

  const handleCompleteHabit = async (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const todayDateStr = new Date().toISOString().split('T')[0];
    const newHistory = Array.from(new Set([...(habit.history || []), todayDateStr]));

    const updates = {
      streak: habit.streak + 1,
      lastCompleted: new Date().toISOString(),
      history: newHistory
    };

    if (isDemoMode) {
      setHabits(prev => prev.map(h => h.id === habitId ? { ...h, ...updates } : h));
    } else {
      await updateDoc(doc(db, "habits", habitId), updates);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (isDemoMode) {
      setHabits(prev => prev.filter(h => h.id !== habitId));
    } else {
      await deleteDoc(doc(db, "habits", habitId));
    }
  };

  // Goal DB handlers
  const handleAddGoal = async (title: string, type: 'daily' | 'weekly' | 'monthly', weekdays?: string[], priority?: PriorityLevel) => {
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";
    const newGoal: Omit<Goal, "id"> = {
      userId: currentUserId,
      title,
      type,
      completed: false,
      createdAt: new Date().toISOString(),
      weekdays: weekdays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      priority: priority || "Normal"
    };

    if (isDemoMode) {
      setGoals(prev => [...prev, { id: `local_goal_${Date.now()}`, ...newGoal } as Goal]);
    } else {
      await addDoc(collection(db, "goals"), newGoal);
    }
  };

  const handleCompleteGoal = async (goalId: string, currentCompleted: boolean) => {
    const updates = {
      completed: !currentCompleted,
      completedAt: !currentCompleted ? new Date().toISOString() : undefined
    };

    if (isDemoMode) {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...updates } : g));
    } else {
      await updateDoc(doc(db, "goals", goalId), updates);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (isDemoMode) {
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } else {
      await deleteDoc(doc(db, "goals", goalId));
    }
  };

  // Remember Me CRUD handlers
  const handleAddRememberMeItem = async (itemData: Omit<RememberMeItem, "id" | "userId" | "createdAt">) => {
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";
    const newItem: Omit<RememberMeItem, "id"> = {
      ...itemData,
      userId: currentUserId,
      createdAt: new Date().toISOString()
    };

    if (isDemoMode) {
      setRememberMeItems(prev => [...prev, { id: `local_rm_${Date.now()}`, ...newItem } as RememberMeItem]);
    } else {
      try {
        await addDoc(collection(db, "rememberMe"), newItem);
      } catch (err) {
        console.error("Failed to add Remember Me item to Firestore:", err);
      }
    }
  };

  const handleUpdateRememberMeItem = async (itemId: string, updates: Partial<RememberMeItem>) => {
    if (isDemoMode) {
      setRememberMeItems(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
    } else {
      try {
        await updateDoc(doc(db, "rememberMe", itemId), updates);
      } catch (err) {
        console.error("Failed to update Remember Me item in Firestore:", err);
      }
    }
  };

  const handleDeleteRememberMeItem = async (itemId: string) => {
    if (isDemoMode) {
      setRememberMeItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      try {
        await deleteDoc(doc(db, "rememberMe", itemId));
      } catch (err) {
        console.error("Failed to delete Remember Me item from Firestore:", err);
      }
    }
  };

  // Stored Notification Handlers
  const handleClearAllNotifications = async () => {
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";
    if (isDemoMode) {
      setNotificationsList([]);
      localStorage.setItem(`notifications_${currentUserId}`, JSON.stringify([]));
    } else {
      try {
        const notifSnap = await getDocs(query(collection(db, "notifications"), where("userId", "==", currentUserId)));
        const batchPromises = notifSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(batchPromises);
      } catch (err) {
        console.error("Failed to clear notifications in Firestore:", err);
      }
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";
    if (isDemoMode) {
      setNotificationsList(prev => {
        const updated = prev.filter(n => n.id !== notifId);
        localStorage.setItem(`notifications_${currentUserId}`, JSON.stringify(updated));
        return updated;
      });
    } else {
      try {
        await deleteDoc(doc(db, "notifications", notifId));
      } catch (err) {
        console.error("Failed to delete notification in Firestore:", err);
      }
    }
  };

  const markAllNotificationsAsRead = async () => {
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";
    const unreadNotifs = notificationsList.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;

    if (isDemoMode) {
      setNotificationsList(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        localStorage.setItem(`notifications_${currentUserId}`, JSON.stringify(updated));
        return updated;
      });
    } else if (user) {
      try {
        const batchPromises = unreadNotifs.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }));
        await Promise.all(batchPromises);
      } catch (err) {
        console.error("Failed to mark notifications as read in Firestore:", err);
      }
    }
  };

  useEffect(() => {
    if (activeTab === "notifications") {
      const hasUnread = notificationsList.some(n => !n.read);
      if (hasUnread) {
        markAllNotificationsAsRead();
      }
    }
  }, [activeTab, notificationsList]);

  // Routine events
  const handleAddRoutineEvent = (evt: RoutineEvent) => {
    // If weekdays not present, default to all days
    const enrichedEvt = {
      ...evt,
      weekdays: evt.weekdays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    };
    setRoutineEvents(prev => [...prev, enrichedEvt]);
  };

  const handleDeleteRoutineEvent = (evtName: string) => {
    setRoutineEvents(prev => prev.filter(e => e.name !== evtName));
  };

  const handleToggleRoutineEventDay = (evtName: string, day: string) => {
    setRoutineEvents(prev => prev.map(e => {
      if (e.name === evtName) {
        const currentDays = e.weekdays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const nextDays = currentDays.includes(day)
          ? currentDays.filter(d => d !== day)
          : [...currentDays, day];
        return { ...e, weekdays: nextDays };
      }
      return e;
    }));
  };

  const handleUpdateHabit = async (habitId: string, updates: Partial<Habit>) => {
    if (isDemoMode) {
      setHabits(prev => prev.map(h => h.id === habitId ? { ...h, ...updates } : h));
    } else {
      try {
        await updateDoc(doc(db, "habits", habitId), updates);
      } catch (err) {
        console.error("Failed to update habit in Firestore:", err);
      }
    }
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<Goal>) => {
    if (isDemoMode) {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...updates } : g));
    } else {
      try {
        await updateDoc(doc(db, "goals", goalId), updates);
      } catch (err) {
        console.error("Failed to update goal in Firestore:", err);
      }
    }
  };

  // ==========================================
  // GEMINI AI SERVICE TRIGGERS
  // ==========================================

  // 1. AI Breakdown
  const handleGenerateBreakdown = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setIsGeneratingBreakdown(true);
    try {
      const response = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          priority: task.priority,
          category: task.category,
          estimatedDuration: task.estimatedDuration,
          difficulty: task.difficulty
        })
      });

      if (!response.ok) {
        throw new Error("Breakdown generation failed");
      }

      const data = await response.json();

      const subtasksFormatted: SubTask[] = (data.subtasks || []).map((sub: any) => ({
        id: sub.id || `subtask_${Math.random().toString(36).substring(7)}`,
        title: sub.title || "Step item",
        description: sub.description || "",
        durationMinutes: sub.durationMinutes || 15,
        order: sub.order || 0,
        completed: false
      }));

      await handleUpdateTask(taskId, {
        subtasks: subtasksFormatted,
        difficultyScore: data.difficultyScore || 5,
        estimatedCompletionTime: data.estimatedCompletionTime || "2 hours",
        tips: data.tips || [],
        resources: data.resources || []
      });
    } catch (err) {
      console.error(err);
      alert("Failed to build AI roadmap. Ensure GEMINI_API_KEY is active!");
    } finally {
      setIsGeneratingBreakdown(false);
    }
  };

  // 2. Deadline Rescue Mode Action Plan
  const handleGenerateRescue = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setIsGeneratingRescue(true);
    try {
      // Calculate remaining hours
      const hoursLeft = Math.max(1, Math.round((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60)));

      const response = await fetch("/api/rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, hoursLeft })
      });

      if (!response.ok) {
        throw new Error("Emergency plan failed");
      }

      const data = await response.json();
      await handleUpdateTask(taskId, { rescuePlan: data });
    } catch (err) {
      console.error(err);
      alert("Failed to synthesize emergency action plan.");
    } finally {
      setIsGeneratingRescue(false);
    }
  };

  // 3. AI Optimized Schedule
  const handleGenerateSchedule = async () => {
    setIsGeneratingSchedule(true);
    try {
      const pending = tasks.filter(t => t.status !== "Completed");

      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableHoursStart,
          availableHoursEnd,
          routineEvents,
          tasks: pending.map(t => ({ title: t.title, priority: t.priority, estimatedDuration: t.estimatedDuration }))
        })
      });

      if (!response.ok) {
        throw new Error("Schedule calculation failed");
      }

      const data = await response.json();
      const slots: ScheduleSlot[] = data.schedule || [];
      setSchedule(slots);

      // Save schedule to Firestore if logged in
      if (!isDemoMode && user) {
        const currentUserId = user.uid;
        const scheduleSnap = await getDocs(query(collection(db, "schedules"), where("userId", "==", currentUserId)));
        if (!scheduleSnap.empty) {
          await updateDoc(doc(db, "schedules", scheduleSnap.docs[0].id), { slots });
        } else {
          await addDoc(collection(db, "schedules"), { userId: currentUserId, date: new Date().toLocaleDateString(), slots });
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to calculate AI schedule.");
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  // Toggle/start focus helper
  const handleStartFocus = (task: Task) => {
    setActiveFocusTask(task);
    setActiveTab("focus");
  };

  const handleUpdatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  const handleUpdateSchedule = async (newSchedule: ScheduleSlot[]) => {
    setSchedule(newSchedule);
    const currentUserId = user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id";
    if (!isDemoMode && user) {
      try {
        const scheduleSnap = await getDocs(query(collection(db, "schedules"), where("userId", "==", currentUserId)));
        if (!scheduleSnap.empty) {
          await updateDoc(doc(db, "schedules", scheduleSnap.docs[0].id), { slots: newSchedule });
        } else {
          await addDoc(collection(db, "schedules"), { userId: currentUserId, date: new Date().toLocaleDateString(), slots: newSchedule });
        }
      } catch (err) {
        console.error("Failed to save schedule to Firestore:", err);
      }
    } else {
      localStorage.setItem(`schedule_${currentUserId}`, JSON.stringify(newSchedule));
    }
  };

  // Render correct Tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            tasks={tasks}
            habits={habits}
            goals={goals}
            schedule={schedule}
            routineEvents={routineEvents}
            onAddTaskClick={() => setActiveTab("tasks")}
            onSelectTab={setActiveTab}
            onGenerateSchedule={handleGenerateSchedule}
            isGeneratingSchedule={isGeneratingSchedule}
            onUpdateSchedule={handleUpdateSchedule}
            userName={profile ? profile.name : ""}
            userEmail={user ? user.email || "" : demoEmail}
            isDemoMode={isDemoMode}
          />
        );
      case "tasks":
        return (
          <TaskManagement
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            isGeneratingBreakdown={isGeneratingBreakdown}
            onGenerateBreakdown={handleGenerateBreakdown}
            isGeneratingRescue={isGeneratingRescue}
            onGenerateRescue={handleGenerateRescue}
          />
        );
      case "remember-me":
        return (
          <RememberMe
            items={rememberMeItems}
            onAddItem={handleAddRememberMeItem}
            onUpdateItem={handleUpdateRememberMeItem}
            onDeleteItem={handleDeleteRememberMeItem}
          />
        );
      case "schedule":
        return (
          <AIScheduler
            tasks={tasks}
            routineEvents={routineEvents}
            onAddRoutineEvent={handleAddRoutineEvent}
            onDeleteRoutineEvent={handleDeleteRoutineEvent}
            onToggleRoutineEventDay={handleToggleRoutineEventDay}
            onUpdateHabit={handleUpdateHabit}
            onUpdateGoal={handleUpdateGoal}
            availableHoursStart={availableHoursStart}
            setAvailableHoursStart={setAvailableHoursStart}
            availableHoursEnd={availableHoursEnd}
            setAvailableHoursEnd={setAvailableHoursEnd}
            schedule={schedule}
            isGenerating={isGeneratingSchedule}
            onGenerate={handleGenerateSchedule}
            onUpdateSchedule={handleUpdateSchedule}
            habits={habits}
            goals={goals}
          />
        );
      case "habits":
        return (
          <HabitTracker
            habits={habits}
            onAddHabit={handleAddHabit}
            onCompleteHabit={handleCompleteHabit}
            onDeleteHabit={handleDeleteHabit}
            onUpdateHabit={handleUpdateHabit}
          />
        );
      case "goals":
        return (
          <GoalsTracker
            goals={goals}
            onAddGoal={handleAddGoal}
            onCompleteGoal={handleCompleteGoal}
            onDeleteGoal={handleDeleteGoal}
            onUpdateGoal={handleUpdateGoal}
          />
        );
      case "commitments":
        return (
          <CommitmentsShare
            tasks={tasks}
            habits={habits}
            goals={goals}
            rememberMeItems={rememberMeItems}
            userId={user ? user.uid : "demo_user"}
            userEmail={user ? user.email || "" : demoEmail}
            userName={profile ? profile.name : ""}
            userProfilePic={profile ? profile.profilePic : ""}
            sharedId={sharedCommitmentId || undefined}
            onCloseViewer={() => {
              setSharedCommitmentId(null);
              const url = new URL(window.location.href);
              url.searchParams.delete("sharedCommitment");
              window.history.replaceState({}, "", url.toString());
              setActiveTab("dashboard");
            }}
          />
        );
       case "calendar":
        return <CalendarView tasks={tasks} />;
      case "notifications":
        return (
          <NotificationsView
            notifications={notificationsList}
            onClearAll={handleClearAllNotifications}
            onDelete={handleDeleteNotification}
          />
        );
      case "coach":
        return <AICoach tasks={tasks} />;
      case "analytics":
        return <AnalyticsView tasks={tasks} habits={habits} />;
      case "profile":
        return (
          <ProfileSettings
            currentUserId={user ? user.uid : isDemoMode ? `local_${demoEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "demo_user_id"}
            userEmail={user ? user.email || "" : demoEmail}
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
            tasks={tasks}
            habits={habits}
            profile={profile}
            onSaveProfile={handleSaveProfile}
            onLogout={handleLogout}
            onEraseAllData={handleEraseAllData}
          />
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  // Auth/Login page if not signed in or in demo mode
  if (isLoadingAuth) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Brain className="w-12 h-12 text-indigo-500 animate-pulse mb-3" />
        <span className="text-sm font-semibold uppercase tracking-wider">Syncing credentials...</span>
      </div>
    );
  }

  if (!user && !isDemoMode && !sharedCommitmentId) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glowing space layout background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-md shadow-2xl relative z-10 space-y-6"
        >
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-xl shadow-indigo-500/20 mx-auto">
              F
            </div>
            <h1 className="text-2xl font-black text-white mt-4 tracking-tight">FocusFlow <span className="text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase">AI</span></h1>
            <p className="text-xs text-slate-400 font-medium">An AI productivity engine designed to beat procrastination.</p>
          </div>

          {authError && (
            <div className="p-3.5 bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex flex-col gap-2 shadow-lg shadow-rose-950/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="font-semibold leading-relaxed w-full">
                  {authError === "auth/popup-closed-by-user" ? (
                    <div>
                      <p className="font-bold text-rose-200 text-sm">Google Sign-In Window Closed</p>
                      <p className="mt-1 font-normal text-slate-300">
                        The authentication popup was closed or blocked by your browser. This is very common inside cross-origin iframe previews.
                      </p>
                      <div className="mt-2.5 space-y-1.5 font-normal text-slate-400">
                        <p>💡 <strong className="text-slate-200">How to solve:</strong></p>
                        <ul className="list-disc pl-5 space-y-1 text-xs">
                          <li>Click the <strong className="text-slate-200">"Open in New Tab"</strong> button in the top-right corner of the screen to load the app directly outside the iframe, then complete Google Sign-In there.</li>
                          <li>Check if your browser blocked popups and select <strong className="text-slate-200">"Always allow popups"</strong> in your address bar.</li>
                          <li>Alternatively, click <strong className="text-indigo-400 font-semibold cursor-pointer hover:underline" onClick={() => setIsDemoMode(true)}>Instant Guest Workspace (No Sign-Up)</strong> below to access the full application immediately without authenticating.</li>
                        </ul>
                      </div>
                    </div>
                  ) : authError === "auth/operation-not-allowed-google" ? (
                    <div>
                      <p className="font-bold text-rose-200">Google Sign-In is disabled!</p>
                      <p className="mt-1 font-normal text-slate-300">You must enable the Google Authentication provider in the Firebase Console.</p>
                      <a
                        href="https://console.firebase.google.com/project/flowfocus-ai/authentication/providers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer"
                      >
                        Enable Google Provider &rarr;
                      </a>
                    </div>
                  ) : authError.startsWith("auth-blocked-use-local|") ? (
                    <div className="space-y-2">
                      <p className="font-bold text-amber-300 text-sm">Firebase Auth is Restricted</p>
                      <p className="font-normal text-slate-300 text-xs leading-relaxed">
                        To manage sign-in methods in the Firebase Console, project owner permissions are required. Since this is a sandboxed environment, we have enabled a <strong>Personalized Local Workspace</strong> for:
                      </p>
                      <div className="p-2 bg-slate-950/60 rounded border border-slate-800 font-mono text-center text-indigo-300 select-all text-xs">
                        {authError.split("|")[1]}
                      </div>
                      <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                        All FocusFlow features (AI Roadmap, Coach, habits, tasks, calendars, and journals) are 100% active. Your data will be stored securely in your browser's Local Storage.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setDemoEmail(authError.split("|")[1]);
                          setIsDemoMode(true);
                          setAuthError("");
                        }}
                        className="w-full py-2 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        <span>Launch Local Workspace</span>
                      </button>
                    </div>
                  ) : authError.includes("auth/operation-not-allowed") || authError.includes("operation-not-allowed") ? (
                    <div>
                      <p className="font-bold text-rose-200">Email/Password sign-in is disabled!</p>
                      <p className="mt-1 font-normal text-slate-300">You must enable the Email/Password provider in the Firebase Console.</p>
                      <a
                        href="https://console.firebase.google.com/project/flowfocus-ai/authentication/providers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer"
                      >
                        Enable Email/Password Provider &rarr;
                      </a>
                    </div>
                  ) : authError.includes("auth/unauthorized-domain") || authError.includes("unauthorized-domain") ? (
                    <div>
                      <p className="font-bold text-rose-200">Unauthorized Domain!</p>
                      <p className="mt-1 font-normal text-slate-300">This domain ({window.location.hostname}) is not authorized in Firebase.</p>
                      <a
                        href="https://console.firebase.google.com/project/flowfocus-ai/authentication/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer"
                      >
                        Add to Authorized Domains &rarr;
                      </a>
                    </div>
                  ) : (
                    <span>{authError}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  placeholder="name@university.edu"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>

            <button
              id="submit-auth-btn"
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/15 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>{isSignUp ? "Create Workspace" : "Launch Engine"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Fallbacks and Google options */}
          <div className="space-y-3 pt-2">
            <button
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Continue with Google</span>
            </button>

            {/* Instant simulated workspace fallback */}
            <button
              id="demo-mode-btn"
              onClick={() => {
                setIsDemoMode(true);
              }}
              className="w-full py-2.5 border border-indigo-500/20 hover:bg-indigo-950/10 rounded-xl text-xs font-bold text-indigo-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>Instant Guest Workspace (No Sign-Up)</span>
            </button>
          </div>

          <div className="text-center border-t border-slate-800 pt-4">
            <button
              id="toggle-auth-mode-btn"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-bold text-slate-500 hover:text-white transition-colors"
            >
              {isSignUp ? "Already have an engine? Log In" : "New to FocusFlow? Sign Up"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Standalone Public Viewer Mode for shared commitments when viewer is not logged in
  if (!user && !isDemoMode && sharedCommitmentId) {
    return (
      <div className="min-h-screen w-screen bg-[#050507] text-[#f8fafc] flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto relative">
        {/* Decorative ambient background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        {/* Top bar / Logo */}
        <div className="w-full max-w-5xl flex justify-between items-center py-4 mb-8 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xl italic text-white shadow-lg shadow-indigo-600/20">
              F
            </div>
            <span className="text-sm font-black tracking-tighter uppercase text-white">
              FocusFlow <span className="text-indigo-400">AI</span>
            </span>
          </div>

          <button
            onClick={() => {
              setSharedCommitmentId(null);
              const url = new URL(window.location.href);
              url.searchParams.delete("sharedCommitment");
              window.history.replaceState({}, "", url.toString());
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
          >
            Launch My Free Workspace
          </button>
        </div>

        {/* Commitment Share Component directly */}
        <div className="w-full max-w-5xl relative z-10">
          <CommitmentsShare
            sharedId={sharedCommitmentId}
            userId={user ? user.uid : (isDemoMode ? "demo_user" : "demo_user")}
            userEmail={user ? user.email || "" : (isDemoMode ? demoEmail : "anonymous@focusflow.ai")}
            userName={profile ? profile.name : "Productivity Buddy"}
            userProfilePic={profile ? profile.profilePic : ""}
            rememberMeItems={rememberMeItems}
            onCloseViewer={() => {
              setSharedCommitmentId(null);
              const url = new URL(window.location.href);
              url.searchParams.delete("sharedCommitment");
              window.history.replaceState({}, "", url.toString());
            }}
          />
        </div>

        {/* Call to action footer */}
        <div className="w-full max-w-lg mt-12 mb-8 text-center space-y-4 p-6 bg-slate-900/40 border border-slate-800/60 rounded-3xl backdrop-blur-md relative z-10">
          <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider">Join FocusFlow Today</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ready to study smart, boost your accountability, and smash your daily milestones? Experience FocusFlow's full AI workspace for free.
          </p>
          <button
            onClick={() => {
              setSharedCommitmentId(null);
              const url = new URL(window.location.href);
              url.searchParams.delete("sharedCommitment");
              window.history.replaceState({}, "", url.toString());
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>Create Your Productivity Account</span>
          </button>
        </div>
      </div>
    );
  }

  // Authentic flow workspace
  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex ${preferences.theme === "light" ? "light" : ""}`}>

      {/* Mobile Header Bar */}
      {isMobile && (
        <div className="md:hidden h-16 border-b border-white/5 bg-[#050507]/90 backdrop-blur-md px-4 flex items-center justify-between fixed top-0 left-0 right-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xl italic text-white shadow-lg shadow-indigo-600/20">
              F
            </div>
            <span className="text-sm font-black tracking-tighter uppercase text-white">
              FocusFlow <span className="text-indigo-400">AI</span>
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 hover:bg-white/5 rounded-xl text-white/80 cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Dimmer backdrop overlay for mobile navigation menu */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        userEmail={user ? user.email || "" : demoEmail}
        userName={profile ? profile.name : ""}
        onLogout={handleLogout}
        isMobile={isMobile}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        unreadNotificationsCount={notificationsList.filter(n => !n.read).length}
      />

      {/* Main Content Body */}
      <main
        className="flex-1 min-h-screen transition-all duration-300 p-4 md:p-8"
        style={{
          paddingLeft: isMobile ? "0px" : (sidebarCollapsed ? "76px" : "260px"),
          paddingTop: isMobile ? "80px" : "32px"
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="max-w-6xl mx-auto pb-12"
          >
            {activeTab !== "dashboard" && (
              <div className="mb-6 flex items-center justify-between px-1">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900/60 hover:bg-slate-800/85 border border-slate-800/60 text-slate-300 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/5 group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back to Dashboard</span>
                </button>
                <div className="text-[9px] font-black uppercase tracking-widest text-indigo-400/60 bg-indigo-950/20 border border-indigo-500/10 px-2.5 py-1.5 rounded-lg">
                  Focus Zone &bull; {activeTab}
                </div>
              </div>
            )}
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Onboarding Profile Prompt */}
      {showOnboarding && (
        <OnboardingModal onComplete={handleSaveProfile} onLogout={handleLogout} />
      )}

      {/* Distraction Check Dialog */}
      <AnimatePresence>
        {showDistractionPrompt && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-[#09090c] border border-white/10 p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-5 text-center"
            >
              <div className="w-14 h-14 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto animate-bounce">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Attention Check 🧘
                </h3>
                <p className="text-xs text-slate-400 font-bold leading-normal">
                  Welcome back! We noticed you stepped away for {distractionAwaySeconds} seconds. Did you get distracted by something else?
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  id="decline-distraction-btn"
                  onClick={handleDeclineDistraction}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer text-slate-300"
                >
                  No, focused
                </button>
                <button
                  id="confirm-distraction-btn"
                  onClick={handleConfirmDistraction}
                  className="flex-1 py-2.5 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer text-amber-400"
                >
                  Yes, distracted
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Persistent Supportive AI Buddy */}
      {!showOnboarding && (
        <FlowyAIFriend tasks={tasks} userName={profile ? profile.name : ""} />
      )}

      {/* Dynamic Toast Notifications Overlay */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm pointer-events-none w-full px-4 sm:px-0">
        <AnimatePresence>
          {appNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, x: 100 }}
              className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md pointer-events-auto flex gap-3 items-start border-white/10 ${
                notif.type === 'critical'
                  ? 'bg-rose-950/90 text-rose-200 border-rose-500/30'
                  : notif.type === 'warning'
                    ? 'bg-amber-950/90 text-amber-200 border-amber-500/30'
                    : 'bg-slate-900/95 text-slate-100 border-white/10'
              }`}
            >
              <span className="text-xl shrink-0">
                {notif.type === 'critical' ? '🚨' : notif.type === 'warning' ? '⚠️' : '📋'}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-white">
                  {notif.title}
                </h4>
                <p className="text-[10px] font-semibold opacity-80 mt-1 leading-normal">
                  {notif.message}
                </p>
              </div>
              <button
                onClick={() => setAppNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="text-white/40 hover:text-white transition-colors shrink-0 p-1 text-xs cursor-pointer font-bold"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
