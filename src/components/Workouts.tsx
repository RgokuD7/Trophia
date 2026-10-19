import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Dumbbell, Calendar, RefreshCw, Check, Play, Square, Pause, Flame, Info, ChevronRight, 
  Sparkles, Timer, RotateCcw, Award, Trash, Star, Activity, X, SlidersHorizontal, 
  Eye, HelpCircle, CheckCircle2, ShieldAlert, Plus, BookOpen, Search, Copy, 
  ClipboardList, Clock, Layers, Edit3, ArrowRight, Zap, ChevronDown
} from "lucide-react";
import { 
  WorkoutSession, WorkoutExercise, MuscleRecovery, UserProfile, 
  TrainingEnvironment, ExperienceLevel, CustomExercise, ExerciseTrackingType,
  WeeklyRoutinePlan, RoutineTemplate, RoutineDayKey, LoggedSport
} from "../types";
import { 
  generateRoutineByIA, suggestAlternativeExercisesByIA, 
  analyzeExerciseByIA, parseExerciseBatchByIA 
} from "../services/geminiService";
import { 
  DEFAULT_EXERCISES, findExerciseInCatalog, resolveOrAnalyzeExercise, 
  createWorkoutExerciseFromData, normalizeExerciseName 
} from "../services/exerciseLibrary";
import { 
  getCustomExercises, addCustomExercise, deleteCustomExercise, updateCustomExercise 
} from "../services/dbService";
import { SPORTS_METS, getLocalDateString, formatFriendlyDate, isSameDay } from "../utils/fitnessUtils";
import WorkoutsOnboarding from "./WorkoutsOnboarding";
import WorkoutsRoutineManager, { DAY_KEYS, DAY_LABEL_MAP } from "./WorkoutsRoutineManager";
import ExerciseAiAdvisorModal from "./ExerciseAiAdvisorModal";

export interface ExerciseGuideViewData {
  name: string;
  trackingType: ExerciseTrackingType;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  techniqueTips?: string;
  equipmentNeeded?: string;
  caloriesBurnedPerSet?: number;
  source: "db_cache" | "gemini_ai";
}

interface WorkoutsProps {
  apiKey?: string;
  userProfile: UserProfile;
  userId?: string;
  workoutHistory: WorkoutSession[];
  onAddWorkout: (workout: WorkoutSession) => void;
  onClearWorkouts: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function Workouts({ apiKey, userProfile, userId, workoutHistory, onAddWorkout, onClearWorkouts, onUpdateProfile }: WorkoutsProps) {
  const [activeTab, setActiveTab] = useState<"routine" | "routines" | "recovery">("routine");
  const [selectedDay, setSelectedDay] = useState<string>(getLocalDateString());
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [completedWorkoutSummary, setCompletedWorkoutSummary] = useState<{
    name: string;
    durationMinutes: number;
    totalCalories: number;
    completedSetsCount: number;
  } | null>(null);

  // Helper to convert date string "YYYY-MM-DD" to RoutineDayKey
  const getDayKeyFromDateStr = (dateStr: string): RoutineDayKey => {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      const dayIdx = d.getDay();
      const map: Record<number, RoutineDayKey> = {
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
        6: "saturday",
        0: "sunday"
      };
      return map[dayIdx] || "unassigned";
    }
    return "unassigned";
  };

  // Instantiate a routine template into active session for selectedDay
  const startSessionFromTemplate = (routine: RoutineTemplate, markCompletedDirectly = false) => {
    const newSession: WorkoutSession = {
      id: Math.random().toString(36).substr(2, 9),
      date: selectedDay,
      name: routine.name,
      warmup: routine.warmup && routine.warmup.length > 0 ? routine.warmup : ["Movilidad articular general - 5 min"],
      cooldown: routine.cooldown && routine.cooldown.length > 0 ? routine.cooldown : ["Estiramiento general completo - 5 min"],
      exercises: (routine.exercises || []).map((ex, idx) => {
        const setsCount = ex.sets || 3;
        const repsCount = ex.reps || 12;
        const weightVal = ex.weight || 0;
        return {
          id: `ex-${idx}`,
          name: ex.name,
          sets: setsCount,
          reps: repsCount,
          weight: weightVal,
          trackingType: ex.trackingType || "reps",
          caloriesBurnedPerSet: ex.caloriesBurnedPerSet || 5,
          primaryMuscles: ex.primaryMuscles || [],
          secondaryMuscles: ex.secondaryMuscles || [],
          techniqueTips: ex.techniqueTips,
          equipmentNeeded: ex.equipmentNeeded,
          completedSets: Array.from({ length: setsCount }).map((_, sIdx) => ({
            setIndex: sIdx,
            completed: markCompletedDirectly,
            reps: repsCount,
            weight: weightVal
          }))
        };
      }),
      completed: markCompletedDirectly,
      startTime: markCompletedDirectly ? `${selectedDay}T10:00:00.000Z` : undefined,
      endTime: markCompletedDirectly ? `${selectedDay}T10:45:00.000Z` : undefined,
      durationMinutes: 45
    };
    onAddWorkout(newSession);
    setActiveSession(newSession);
    setActiveTab("routine");

    if (markCompletedDirectly) {
      const totalCal = newSession.exercises.reduce((sum, ex) => {
        return sum + (ex.completedSets.length * ex.caloriesBurnedPerSet);
      }, 0);
      const completedSetsCount = newSession.exercises.reduce((sum, ex) => sum + ex.completedSets.length, 0);
      setCompletedWorkoutSummary({
        name: newSession.name,
        durationMinutes: 45,
        totalCalories: totalCal,
        completedSetsCount
      });
    }
  };

  const handleMarkSessionCompleteDirectly = (customMinutes = 45) => {
    if (!activeSession) return;
    const updatedExercises = activeSession.exercises.map(ex => ({
      ...ex,
      completedSets: ex.completedSets.map(s => ({ ...s, completed: true }))
    }));

    const totalCal = updatedExercises.reduce((sum, ex) => {
      return sum + (ex.completedSets.length * ex.caloriesBurnedPerSet);
    }, 0);

    const completedSetsCount = updatedExercises.reduce((sum, ex) => sum + ex.completedSets.length, 0);

    const updatedSession: WorkoutSession = {
      ...activeSession,
      exercises: updatedExercises,
      completed: true,
      startTime: activeSession.startTime || `${selectedDay}T10:00:00.000Z`,
      endTime: activeSession.endTime || `${selectedDay}T10:45:00.000Z`,
      durationMinutes: customMinutes
    };

    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
    setCompletedWorkoutSummary({
      name: activeSession.name,
      durationMinutes: customMinutes,
      totalCalories: totalCal,
      completedSetsCount
    });
  };

  const todayStr = getLocalDateString();

  // Sports logging states
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [selectedSportKey, setSelectedSportKey] = useState("padel");
  const [sportDuration, setSportDuration] = useState<number | "">(45);
  const [sportIntensity, setSportIntensity] = useState<"low" | "moderate" | "high">("moderate");
  const [sportNotes, setSportNotes] = useState("");
  const [customSportNameInput, setCustomSportNameInput] = useState("");

  const handleLogSport = () => {
    const duration = Number(sportDuration);
    if (!duration || duration <= 0) return;

    const sportInfo = SPORTS_METS[selectedSportKey] || SPORTS_METS.other;
    const name = selectedSportKey === "other" && customSportNameInput.trim() !== ""
      ? customSportNameInput.trim()
      : sportInfo.label;

    const intensityMultiplier = sportIntensity === "high" ? 1.25 : sportIntensity === "low" ? 0.8 : 1.0;
    const caloriesBurned = Math.round(sportInfo.met * intensityMultiplier * 0.0175 * userProfile.weight * duration);

    const newSportLog: LoggedSport = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      sportKey: selectedSportKey,
      durationMinutes: duration,
      caloriesBurned,
      date: selectedDay,
      intensity: sportIntensity,
      notes: sportNotes.trim() || undefined
    };

    const currentSports = userProfile.loggedSportsToday || [];
    onUpdateProfile({
      ...userProfile,
      loggedSportsToday: [...currentSports, newSportLog]
    });

    // Reset and close
    setIsSportModalOpen(false);
    setSportDuration(45);
    setSportIntensity("moderate");
    setSportNotes("");
    setCustomSportNameInput("");
  };

  const handleDeleteSport = (sportId: string) => {
    const currentSports = userProfile.loggedSportsToday || [];
    onUpdateProfile({
      ...userProfile,
      loggedSportsToday: currentSports.filter(s => s.id !== sportId)
    });
  };

  // Live workout elapsed timer state & Completion celebration
  const [workoutElapsedSeconds, setWorkoutElapsedSeconds] = useState(0);

  useEffect(() => {
    if (activeSession && activeSession.startTime && !activeSession.completed) {
      const startMs = new Date(activeSession.startTime).getTime();
      const updateElapsed = () => {
        const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setWorkoutElapsedSeconds(diff);
      };
      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    } else {
      setWorkoutElapsedSeconds(0);
    }
  }, [activeSession?.startTime, activeSession?.completed]);

  const formatWorkoutTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m ${secs < 10 ? "0" : ""}${secs}s`;
    }
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleStartActiveWorkout = () => {
    if (!activeSession) return;
    const nowIso = new Date().toISOString();
    const updated: WorkoutSession = {
      ...activeSession,
      startTime: nowIso
    };
    onAddWorkout(updated);
    setActiveSession(updated);
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Phase 3 States
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [exerciseForAlternatives, setExerciseForAlternatives] = useState<WorkoutExercise | null>(null);

  // Custom Exercises DB Cache State
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);

  // Load custom exercises on mount
  useEffect(() => {
    if (userId) {
      getCustomExercises(userId)
        .then(setCustomExercises)
        .catch((err) => console.error("Error loading custom exercises:", err));
    }
  }, [userId]);

  // Exercise Addition / Batch Import States
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState(3);
  const [newExerciseReps, setNewExerciseReps] = useState(10);
  const [newExerciseWeight, setNewExerciseWeight] = useState(0);
  const [newExerciseTrackingType, setNewExerciseTrackingType] = useState<ExerciseTrackingType>("reps");
  const [isAnalyzingExercise, setIsAnalyzingExercise] = useState(false);
  const [exerciseSearchSuggestions, setExerciseSearchSuggestions] = useState<(CustomExercise | Omit<CustomExercise, "id" | "createdAt">)[]>([]);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchInputText, setBatchInputText] = useState("");
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProcessingStatus, setBatchProcessingStatus] = useState<string | null>(null);

  // Library search and filter states
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState("all");

  // Contextual Modals (Timer and Exercise Library)
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  // Biomechanical Technique Guide State (Gemini + Local DB, zero MuscleWiki dependency)
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedGuideExercise, setSelectedGuideExercise] = useState<ExerciseGuideViewData | null>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);

  // Dedicated Workouts Onboarding & Preferences Flow State
  const [isWorkoutsOnboardingOpen, setIsWorkoutsOnboardingOpen] = useState(
    !userProfile.isWorkoutsOnboardingCompleted && (!userProfile.equipment || userProfile.equipment.length === 0)
  );

  // Auto-prompt initial workouts onboarding if not yet completed and no equipment selected
  useEffect(() => {
    if (!userProfile.isWorkoutsOnboardingCompleted && (!userProfile.equipment || userProfile.equipment.length === 0)) {
      setIsWorkoutsOnboardingOpen(true);
    }
  }, [userProfile.isWorkoutsOnboardingCompleted, userProfile.equipment]);

  // Update suggestions whenever user types in new exercise input
  useEffect(() => {
    const q = newExerciseName.trim().toLowerCase();
    if (!q) {
      setExerciseSearchSuggestions([]);
      return;
    }
    const matches: (CustomExercise | Omit<CustomExercise, "id" | "createdAt">)[] = [];
    // User custom exercises first
    for (const ex of customExercises) {
      const norm = ex.normalizedName || normalizeExerciseName(ex.name);
      if (norm.includes(q) || ex.name.toLowerCase().includes(q)) {
        matches.push(ex);
      }
    }
    // Baseline defaults
    for (const def of DEFAULT_EXERCISES) {
      if (!matches.some(m => normalizeExerciseName(m.name) === normalizeExerciseName(def.name))) {
        const norm = def.normalizedName || normalizeExerciseName(def.name);
        if (norm.includes(q) || def.name.toLowerCase().includes(q)) {
          matches.push(def);
        }
      }
    }
    setExerciseSearchSuggestions(matches.slice(0, 6));
  }, [newExerciseName, customExercises]);

  const handleOpenTechniqueGuide = async (exercise: WorkoutExercise | string) => {
    setIsGuideModalOpen(true);
    setIsLoadingGuide(true);
    setSelectedGuideExercise(null);

    const exerciseName = typeof exercise === "string" ? exercise : exercise.name;
    const existingTips = typeof exercise === "object" ? exercise.techniqueTips : undefined;
    const existingPrimary = typeof exercise === "object" ? exercise.primaryMuscles : undefined;

    // 1. If exercise in session already has tips and muscles, load in 0ms!
    if (existingTips && existingPrimary && existingPrimary.length > 0) {
      setSelectedGuideExercise({
        name: exerciseName,
        trackingType: (typeof exercise === "object" && exercise.trackingType) || "reps",
        primaryMuscles: existingPrimary,
        secondaryMuscles: typeof exercise === "object" ? exercise.secondaryMuscles : [],
        techniqueTips: existingTips,
        equipmentNeeded: typeof exercise === "object" ? exercise.equipmentNeeded : undefined,
        caloriesBurnedPerSet: typeof exercise === "object" ? exercise.caloriesBurnedPerSet : 5,
        source: "db_cache",
      });
      setIsLoadingGuide(false);
      return;
    }

    // 2. Check local DB / baseline catalog
    const cached = findExerciseInCatalog(exerciseName, customExercises);
    if (cached) {
      setSelectedGuideExercise({
        name: cached.name,
        trackingType: cached.trackingType || "reps",
        primaryMuscles: cached.primaryMuscles || [],
        secondaryMuscles: cached.secondaryMuscles || [],
        techniqueTips: cached.techniqueTips || "Ejecuta el ejercicio con postura controlada y rango completo.",
        equipmentNeeded: cached.equipmentNeeded,
        caloriesBurnedPerSet: cached.caloriesBurnedPerSet || 5,
        source: "db_cache",
      });
      setIsLoadingGuide(false);
      return;
    }

    // 3. Fallback: Analyze with Gemini AI and auto-save to Firestore DB
    try {
      const res = await analyzeExerciseByIA(apiKey || "", exerciseName, userProfile.equipment);
      const viewData: ExerciseGuideViewData = {
        name: res.name || exerciseName,
        trackingType: res.trackingType || "reps",
        primaryMuscles: res.primaryMuscles || [],
        secondaryMuscles: res.secondaryMuscles || [],
        techniqueTips: res.techniqueTips || "Mantén la postura y no fuerces las articulaciones.",
        equipmentNeeded: res.equipmentNeeded,
        caloriesBurnedPerSet: res.caloriesBurnedPerSet || 5,
        source: "gemini_ai",
      };
      setSelectedGuideExercise(viewData);

      if (userId) {
        addCustomExercise(userId, {
          name: res.name || exerciseName,
          trackingType: res.trackingType || "reps",
          defaultSets: res.defaultSets || 3,
          defaultReps: res.defaultReps || 10,
          defaultWeight: res.defaultWeight || 0,
          primaryMuscles: res.primaryMuscles || [],
          secondaryMuscles: res.secondaryMuscles || [],
          techniqueTips: res.techniqueTips,
          caloriesBurnedPerSet: res.caloriesBurnedPerSet || 5,
          equipmentNeeded: res.equipmentNeeded,
          createdAt: new Date().toISOString(),
        }).then((saved) => {
          setCustomExercises((prev) => [saved, ...prev]);
        }).catch(console.error);
      }
    } catch (err) {
      console.error("Error analyzing exercise technique with AI:", err);
      setSelectedGuideExercise({
        name: exerciseName,
        trackingType: "reps",
        primaryMuscles: ["Músculo principal"],
        techniqueTips: "Mantén una ejecución controlada y cuida la alineación de la espalda durante todo el movimiento.",
        source: "db_cache",
      });
    } finally {
      setIsLoadingGuide(false);
    }
  };

  const handleCompleteWorkoutsOnboarding = async (data: {
    environment: TrainingEnvironment;
    environments: TrainingEnvironment[];
    equipment: string[];
    customEquipment: string[];
    level: ExperienceLevel;
    jointPainAreas: ("knee" | "back" | "shoulder")[];
    customJointPain: string;
    workoutPreferencesNotes?: string;
    weeklyTrainingDays: number;
  }) => {
    const updatedProfile: UserProfile = {
      ...userProfile,
      environment: data.environment,
      environments: data.environments,
      equipment: data.equipment,
      customEquipment: data.customEquipment,
      level: data.level,
      jointPainAreas: data.jointPainAreas,
      customJointPain: data.customJointPain,
      workoutPreferencesNotes: data.workoutPreferencesNotes,
      weeklyTrainingDays: data.weeklyTrainingDays,
      isWorkoutsOnboardingCompleted: true
    };

    onUpdateProfile(updatedProfile);
    setIsWorkoutsOnboardingOpen(false);
    setActiveTab("routines");

    // Auto-generate weekly routine plan with Gemini
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const routinePlan = await generateRoutineByIA(apiKey || "", {
        goal: updatedProfile.goal,
        level: updatedProfile.level,
        environment: updatedProfile.environment,
        environments: updatedProfile.environments,
        equipment: updatedProfile.equipment,
        jointPainAreas: updatedProfile.jointPainAreas,
        customJointPain: updatedProfile.customJointPain,
        userNotesOrPreferences: updatedProfile.workoutPreferencesNotes,
        requiresMedicalClearance: updatedProfile.requiresMedicalClearance,
        weeklyTrainingDays: updatedProfile.weeklyTrainingDays
      });

      if (routinePlan) {
        const profileWithPlan: UserProfile = {
          ...updatedProfile,
          weeklyRoutinePlan: routinePlan
        };
        onUpdateProfile(profileWithPlan);
        // Direct the user to Tus Rutinas view as requested!
        setActiveTab("routines");
      }
    } catch (err: any) {
      console.error("Error generating routine plan:", err);
      setGenerationError(err?.message || "No se pudo conectar con el creador de rutinas.");
      setActiveTab("routines");
    } finally {
      setIsGenerating(false);
    }
  };

  // Muscle recovery state
  const [recovery, setRecovery] = useState<MuscleRecovery>({
    chest: 85,
    back: 90,
    legs: 60,
    shoulders: 75,
    arms: 80,
    core: 95,
    lastUpdated: new Date().toISOString()
  });

  // Timer states (Rest / HIIT)
  const [timerType, setTimerType] = useState<"rest" | "hiit">("rest");
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hiitCycle, setHiitCycle] = useState<"work" | "rest">("work");
  const [hiitRound, setHiitRound] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load the workout for the selected day if it exists
  useEffect(() => {
    const todaySession = workoutHistory.find(w => w.date === selectedDay);
    if (todaySession) {
      setActiveSession(todaySession);
    } else {
      setActiveSession(null);
    }
  }, [selectedDay, workoutHistory]);

  // Handle active muscle recovery state estimation dynamically based on history
  useEffect(() => {
    // Basic simulation: each workout session reduces recovery for affected muscles by 40%
    // and each day passed without workouts recovers them by 25%
    let calculatedChest = 100;
    let calculatedBack = 100;
    let calculatedLegs = 100;
    let calculatedShoulders = 100;
    let calculatedArms = 100;
    let calculatedCore = 100;

    workoutHistory.forEach(session => {
      if (session.completed) {
        const nameLower = session.name.toLowerCase();
        if (nameLower.includes("pecho") || nameLower.includes("push") || nameLower.includes("empuje")) {
          calculatedChest = Math.max(10, calculatedChest - 45);
          calculatedShoulders = Math.max(15, calculatedShoulders - 25);
          calculatedArms = Math.max(20, calculatedArms - 20);
        }
        if (nameLower.includes("espalda") || nameLower.includes("pull") || nameLower.includes("jalón")) {
          calculatedBack = Math.max(10, calculatedBack - 45);
          calculatedArms = Math.max(20, calculatedArms - 30);
        }
        if (nameLower.includes("pierna") || nameLower.includes("leg") || nameLower.includes("squat")) {
          calculatedLegs = Math.max(10, calculatedLegs - 50);
        }
        if (nameLower.includes("core") || nameLower.includes("abdomen") || nameLower.includes("hiit")) {
          calculatedCore = Math.max(20, calculatedCore - 35);
        }
      }
    });

    setRecovery({
      chest: calculatedChest,
      back: calculatedBack,
      legs: calculatedLegs,
      shoulders: calculatedShoulders,
      arms: calculatedArms,
      core: calculatedCore,
      lastUpdated: new Date().toISOString()
    });
  }, [workoutHistory]);

  // Timer Tick Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Timer expired
            if (timerType === "hiit") {
              // Toggle work/rest
              if (hiitCycle === "work") {
                setHiitCycle("rest");
                return 15; // 15s rest
              } else {
                setHiitCycle("work");
                setHiitRound(r => r + 1);
                return 30; // 30s work
              }
            } else {
              // Rest timer ended
              setIsTimerRunning(false);
              // Simple beep sound simulation if supported
              try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                osc.connect(ctx.destination);
                osc.type = "sine";
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.35);
              } catch (e) {}
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timerType, hiitCycle]);

  const handleStartTimer = (duration: number) => {
    setTimeRemaining(duration);
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeRemaining(timerType === "rest" ? 60 : 30);
    setHiitCycle("work");
    setHiitRound(1);
  };

  // Generate Routine Plan with Gemini
  const handleGenerateRoutine = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setActiveTab("routines");

    try {
      const plan = await generateRoutineByIA(apiKey || "", {
        goal: userProfile.goal,
        level: userProfile.level,
        environment: userProfile.environment,
        environments: userProfile.environments,
        equipment: userProfile.equipment,
        jointPainAreas: userProfile.jointPainAreas,
        customJointPain: userProfile.customJointPain,
        userNotesOrPreferences: userProfile.workoutPreferencesNotes,
        requiresMedicalClearance: userProfile.requiresMedicalClearance,
        weeklyTrainingDays: userProfile.weeklyTrainingDays
      });
      if (plan) {
        onUpdateProfile({
          ...userProfile,
          weeklyRoutinePlan: plan
        });
        setActiveTab("routines");
      } else {
        setGenerationError("No se pudo formular el plan de rutinas.");
      }
    } catch (err: any) {
      console.error("Error generating routine plan:", err);
      setGenerationError(err?.message || "No se pudo conectar con el creador de rutinas.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDefaultOffline = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setActiveTab("routines");
    try {
      // generateRoutineByIA with empty apiKey falls back to full multi-routine offline templates
      const plan = await generateRoutineByIA("", {
        goal: userProfile.goal,
        level: userProfile.level,
        environment: userProfile.environment,
        environments: userProfile.environments,
        equipment: userProfile.equipment,
        jointPainAreas: userProfile.jointPainAreas,
        customJointPain: userProfile.customJointPain,
        userNotesOrPreferences: userProfile.workoutPreferencesNotes,
        requiresMedicalClearance: userProfile.requiresMedicalClearance,
        weeklyTrainingDays: userProfile.weeklyTrainingDays
      });
      if (plan) {
        onUpdateProfile({
          ...userProfile,
          weeklyRoutinePlan: plan
        });
        setActiveTab("routines");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle single set completion state & handle progressive overload edit
  const handleToggleSet = (exId: string, setIndex: number) => {
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id === exId) {
        const updatedSets = ex.completedSets.map(set => {
          if (set.setIndex === setIndex) {
            return { ...set, completed: !set.completed };
          }
          return set;
        });
        return { ...ex, completedSets: updatedSets };
      }
      return ex;
    });

    const updatedSession = { ...activeSession, exercises: updatedExercises };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);

    // Auto launch a 60s rest timer if a set is newly marked completed to assist resting
    const newlyCompleted = updatedExercises
      .find(ex => ex.id === exId)
      ?.completedSets.find(set => set.setIndex === setIndex)?.completed;

    if (newlyCompleted && timerType === "rest" && !isTimerRunning) {
      handleStartTimer(60);
    }
  };

  const handleUpdateSetWeightOrReps = (exId: string, setIndex: number, weight: number, reps: number) => {
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id === exId) {
        const updatedSets = ex.completedSets.map(set => {
          if (set.setIndex === setIndex) {
            return { ...set, weight, reps };
          }
          return set;
        });
        return { ...ex, completedSets: updatedSets };
      }
      return ex;
    });

    const updatedSession = { ...activeSession, exercises: updatedExercises };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
  };

  // Toggle exercise tracking type ("reps" vs "time")
  const handleToggleTrackingType = (exId: string) => {
    if (!activeSession) return;
    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id === exId) {
        const nextType: ExerciseTrackingType = ex.trackingType === "time" ? "reps" : "time";
        const newReps = nextType === "time" ? 45 : 10;
        return {
          ...ex,
          trackingType: nextType,
          reps: newReps,
          completedSets: ex.completedSets.map(s => ({
            ...s,
            reps: newReps
          }))
        };
      }
      return ex;
    });
    const updatedSession = { ...activeSession, exercises: updatedExercises };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
  };

  // Add a new set to an exercise
  const handleAddSet = (exId: string) => {
    if (!activeSession) return;
    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id === exId) {
        const lastSet = ex.completedSets[ex.completedSets.length - 1];
        const newSetIndex = ex.completedSets.length;
        const newSet = {
          setIndex: newSetIndex,
          completed: false,
          reps: lastSet ? lastSet.reps : ex.reps,
          weight: lastSet ? lastSet.weight : ex.weight,
        };
        const updatedCompletedSets = [...ex.completedSets, newSet];
        return {
          ...ex,
          sets: updatedCompletedSets.length,
          completedSets: updatedCompletedSets,
        };
      }
      return ex;
    });
    const updatedSession = { ...activeSession, exercises: updatedExercises };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
  };

  // Remove the last set from an exercise
  const handleRemoveSet = (exId: string) => {
    if (!activeSession) return;
    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id === exId && ex.completedSets.length > 1) {
        const updatedCompletedSets = ex.completedSets.slice(0, -1);
        return {
          ...ex,
          sets: updatedCompletedSets.length,
          completedSets: updatedCompletedSets,
        };
      }
      return ex;
    });
    const updatedSession = { ...activeSession, exercises: updatedExercises };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
  };

  // Remove an exercise from the active session
  const handleRemoveExercise = (exId: string) => {
    if (!activeSession) return;
    const updatedExercises = activeSession.exercises.filter(ex => ex.id !== exId);
    const updatedSession = { ...activeSession, exercises: updatedExercises };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
  };

  // Start an empty session if user wants to build from scratch or paste a list
  const handleStartManualSession = () => {
    const newSession: WorkoutSession = {
      id: Math.random().toString(36).substr(2, 9),
      date: selectedDay,
      name: `Entrenamiento Personalizado`,
      warmup: ["Movilidad articular general - 5 min"],
      cooldown: ["Estiramientos generales - 5 min"],
      exercises: [],
      completed: false,
      durationMinutes: 45,
    };
    onAddWorkout(newSession);
    setActiveSession(newSession);
    setIsAddExerciseOpen(true);
  };

  // Add exercise to active session (checks DB / catalog first, falls back to AI, saves to DB)
  const handleAddExerciseToSession = async (
    nameInput: string,
    overrideType?: ExerciseTrackingType,
    overrideSets?: number,
    overrideReps?: number,
    overrideWeight?: number
  ) => {
    const rawName = nameInput.trim();
    if (!rawName) return;

    setIsAnalyzingExercise(true);
    try {
      let session = activeSession;
      if (!session) {
        session = {
          id: Math.random().toString(36).substr(2, 9),
          date: selectedDay,
          name: `Entrenamiento Personalizado`,
          warmup: ["Movilidad articular general - 5 min"],
          cooldown: ["Estiramientos generales - 5 min"],
          exercises: [],
          completed: false,
          durationMinutes: 45,
        };
      }

      // Check cache / catalog first
      const cached = findExerciseInCatalog(rawName, customExercises);
      let newWorkoutEx: WorkoutExercise;

      if (cached) {
        newWorkoutEx = createWorkoutExerciseFromData(
          cached,
          overrideSets,
          overrideReps,
          overrideWeight
        );
        if (overrideType) newWorkoutEx.trackingType = overrideType;
      } else {
        // Not in DB: analyze with Gemini AI
        const aiData = await analyzeExerciseByIA(apiKey || "", rawName, userProfile.equipment);
        newWorkoutEx = createWorkoutExerciseFromData(
          aiData,
          overrideSets,
          overrideReps,
          overrideWeight
        );
        if (overrideType) newWorkoutEx.trackingType = overrideType;

        // Save newly discovered exercise to Firestore DB so future calls are instant
        if (userId) {
          try {
            const saved = await addCustomExercise(userId, {
              name: aiData.name || rawName,
              trackingType: aiData.trackingType || "reps",
              defaultSets: aiData.defaultSets || 3,
              defaultReps: aiData.defaultReps || 10,
              defaultWeight: aiData.defaultWeight || 0,
              primaryMuscles: aiData.primaryMuscles || [],
              secondaryMuscles: aiData.secondaryMuscles || [],
              techniqueTips: aiData.techniqueTips,
              caloriesBurnedPerSet: aiData.caloriesBurnedPerSet || 5,
              equipmentNeeded: aiData.equipmentNeeded,
              createdAt: new Date().toISOString(),
            });
            setCustomExercises(prev => [saved, ...prev]);
          } catch (e) {
            console.error("Error saving custom exercise to DB:", e);
          }
        }
      }

      const updatedSession: WorkoutSession = {
        ...session,
        exercises: [...session.exercises, newWorkoutEx],
      };
      onAddWorkout(updatedSession);
      setActiveSession(updatedSession);

      // Reset form
      setNewExerciseName("");
      setNewExerciseSets(3);
      setNewExerciseReps(10);
      setNewExerciseWeight(0);
      setIsAddExerciseOpen(false);
    } catch (err: any) {
      console.error("Error adding exercise:", err);
      alert("No se pudo analizar el ejercicio: " + (err?.message || "Inténtalo de nuevo"));
    } finally {
      setIsAnalyzingExercise(false);
    }
  };

  // Batch import exercises from multi-line text
  const handleImportBatch = async (rawText: string) => {
    const lines = rawText
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith("#"));

    if (lines.length === 0) return;

    setIsProcessingBatch(true);
    setBatchProcessingStatus("Revisando biblioteca y base de datos...");

    try {
      let session = activeSession;
      if (!session) {
        session = {
          id: Math.random().toString(36).substr(2, 9),
          date: selectedDay,
          name: `Entrenamiento Personalizado`,
          warmup: ["Movilidad articular general - 5 min"],
          cooldown: ["Estiramientos generales - 5 min"],
          exercises: [],
          completed: false,
          durationMinutes: 45,
        };
      }

      const resolvedExercises: WorkoutExercise[] = [];
      const linesNeedingAI: string[] = [];

      // Check each line against DB / catalog first
      for (const line of lines) {
        const cached = findExerciseInCatalog(line, customExercises);
        if (cached) {
          resolvedExercises.push(createWorkoutExerciseFromData(cached));
        } else {
          linesNeedingAI.push(line);
        }
      }

      // If any line is unknown, call Gemini batch parser
      if (linesNeedingAI.length > 0) {
        setBatchProcessingStatus(`Analizando ${linesNeedingAI.length} ejercicio(s) con Inteligencia Artificial...`);
        const aiParsed = await parseExerciseBatchByIA(
          apiKey || "",
          linesNeedingAI.join("\n"),
          userProfile.equipment
        );

        for (const item of aiParsed) {
          const workoutEx = createWorkoutExerciseFromData(item);
          resolvedExercises.push(workoutEx);

          // Save to Firestore DB
          if (userId) {
            try {
              const saved = await addCustomExercise(userId, {
                name: item.name,
                trackingType: item.trackingType || "reps",
                defaultSets: item.defaultSets || 3,
                defaultReps: item.defaultReps || 10,
                defaultWeight: item.defaultWeight || 0,
                primaryMuscles: item.primaryMuscles || [],
                secondaryMuscles: item.secondaryMuscles || [],
                techniqueTips: item.techniqueTips,
                caloriesBurnedPerSet: item.caloriesBurnedPerSet || 5,
                equipmentNeeded: item.equipmentNeeded,
                createdAt: new Date().toISOString(),
              });
              setCustomExercises(prev => [saved, ...prev]);
            } catch (e) {
              console.error("Error saving batched exercise to DB:", e);
            }
          }
        }
      }

      const updatedSession: WorkoutSession = {
        ...session,
        exercises: [...session.exercises, ...resolvedExercises],
      };
      onAddWorkout(updatedSession);
      setActiveSession(updatedSession);

      setBatchInputText("");
      setIsBatchModalOpen(false);
    } catch (err: any) {
      console.error("Error importing batch exercises:", err);
      alert("Error al procesar la lista: " + (err?.message || "Inténtalo de nuevo"));
    } finally {
      setIsProcessingBatch(false);
      setBatchProcessingStatus(null);
    }
  };

  // Delete custom exercise from Firestore DB
  const handleDeleteCustomExercise = async (exerciseId: string) => {
    if (!userId) return;
    try {
      await deleteCustomExercise(userId, exerciseId);
      setCustomExercises(prev => prev.filter(e => e.id !== exerciseId));
    } catch (err) {
      console.error("Error deleting custom exercise:", err);
    }
  };

  const handleMarkSessionComplete = () => {
    if (!activeSession) return;

    const now = new Date();
    const startTimeMs = activeSession.startTime 
      ? new Date(activeSession.startTime).getTime() 
      : now.getTime() - (45 * 60000);
    const elapsedMinutes = Math.max(1, Math.round((now.getTime() - startTimeMs) / 60000));

    const totalCal = activeSession.exercises.reduce((sum, ex) => {
      const completedSets = ex.completedSets.filter(s => s.completed).length;
      return sum + (completedSets * ex.caloriesBurnedPerSet);
    }, 0);

    const completedSetsCount = activeSession.exercises.reduce((sum, ex) => {
      return sum + ex.completedSets.filter(s => s.completed).length;
    }, 0);

    const updatedSession: WorkoutSession = {
      ...activeSession,
      completed: true,
      endTime: now.toISOString(),
      durationMinutes: elapsedMinutes
    };

    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
    setCompletedWorkoutSummary({
      name: activeSession.name,
      durationMinutes: elapsedMinutes,
      totalCalories: totalCal,
      completedSetsCount
    });
  };

  // Build weekly calendar dates array helper
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    // Get past 3 days and next 3 days for calendar
    for (let i = -3; i <= 3; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      dates.push({
        dayName: d.toLocaleDateString("es-ES", { weekday: "short" }).substring(0, 2),
        dateStr: getLocalDateString(d),
        dayNum: d.getDate(),
        isToday: d.toDateString() === today.toDateString()
      });
    }
    return dates;
  };

  const weekDates = getWeekDates();

  // Get month grid dates helper
  const getMonthDates = () => {
    const dates = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // Get Monday-indexed weekday: (day + 6) % 7
    const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    const totalCells = 42; // 6 weeks * 7 days

    for (let i = 0; i < totalCells; i++) {
      let d;
      let isCurrentMonth = true;

      if (i < firstDayOfWeek) {
        const dayNum = prevMonthDays - firstDayOfWeek + i + 1;
        d = new Date(currentYear, currentMonth - 1, dayNum);
        isCurrentMonth = false;
      } else if (i >= firstDayOfWeek + totalDaysInMonth) {
        const dayNum = i - firstDayOfWeek - totalDaysInMonth + 1;
        d = new Date(currentYear, currentMonth + 1, dayNum);
        isCurrentMonth = false;
      } else {
        const dayNum = i - firstDayOfWeek + 1;
        d = new Date(currentYear, currentMonth, dayNum);
      }

      dates.push({
        dateStr: getLocalDateString(d),
        dayNum: d.getDate(),
        isToday: d.toDateString() === today.toDateString(),
        isCurrentMonth
      });
    }
    return dates;
  };

  const handleToggleFavorite = (exerciseName: string) => {
    const favorites = userProfile.favoriteExercises || [];
    let updatedFavorites;
    if (favorites.includes(exerciseName)) {
      updatedFavorites = favorites.filter(ex => ex !== exerciseName);
    } else {
      updatedFavorites = [...favorites, exerciseName];
    }
    onUpdateProfile({
      ...userProfile,
      favoriteExercises: updatedFavorites
    });
  };

  const handleOpenAlternatives = (exercise: WorkoutExercise) => {
    setExerciseForAlternatives(exercise);
  };

  const handleApplyExerciseReplacementInActiveSession = (newExercise: WorkoutExercise) => {
    if (!activeSession || !exerciseForAlternatives) return;

    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id === exerciseForAlternatives.id || ex.name === exerciseForAlternatives.name) {
        return newExercise;
      }
      return ex;
    });

    const updatedSession = { ...activeSession, exercises: updatedExercises };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
    setExerciseForAlternatives(null);
  };

  const getMonthlyStats = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthlySessions = workoutHistory.filter(w => {
      const dateParts = w.date.split("-");
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        return year === currentYear && month === currentMonth;
      }
      const d = new Date(w.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const completedCount = monthlySessions.filter(w => w.completed).length;
    
    const totalCalories = monthlySessions.reduce((sum, session) => {
      const sessionCal = session.exercises.reduce((exSum, ex) => {
        const completedSetsCount = ex.completedSets.filter(s => s.completed).length || (session.completed ? ex.sets : 0);
        return exSum + (completedSetsCount * ex.caloriesBurnedPerSet);
      }, 0);
      return sum + sessionCal;
    }, 0);

    return {
      completedCount,
      totalCalories,
      totalSessions: monthlySessions.length
    };
  };

  const monthlyStats = getMonthlyStats();

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0d0e15] text-gray-900 dark:text-gray-100 overflow-y-auto no-scrollbar pb-16">
      
      {/* Tab Header Selector */}
      <div className="px-6 pt-5 border-b border-gray-200 dark:border-gray-800/40">
        <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Módulo Fitness</span>
        <div className="flex justify-between items-center mt-0.5">
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-1.5">
            <Dumbbell className="h-5 w-5 text-emerald-400" />
            <span>Plan de Entrenamiento</span>
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsWorkoutsOnboardingOpen(true)}
              className="py-1.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-[10px] font-extrabold transition flex items-center gap-1.5 cursor-pointer border border-gray-200 dark:border-white/10"
              title="Configurar lugar, equipamiento y lesiones"
            >
              <SlidersHorizontal className="h-3 w-3 text-emerald-400" />
              <span>Preferencias</span>
            </button>
          </div>
        </div>

        <div className="flex gap-4 sm:gap-6 mt-3 border-b border-gray-200 dark:border-gray-800/20">
          <button
            onClick={() => setActiveTab("routine")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "routine" ? "border-emerald-500 text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            Sesión Diaria
          </button>
          <button
            onClick={() => setActiveTab("routines")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "routines" ? "border-emerald-500 text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            {isGenerating ? (
              <RefreshCw className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
            ) : (
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span>Tus Rutinas</span>
            {isGenerating ? (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold animate-pulse">
                Creando...
              </span>
            ) : userProfile.weeklyRoutinePlan?.routines?.length ? (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-[9px] font-bold">
                {userProfile.weeklyRoutinePlan.routines.length}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab("recovery")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "recovery" ? "border-emerald-500 text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            Recuperación Muscular
          </button>
        </div>
      </div>

      {activeTab === "routine" && (
        <div className="flex-1 flex flex-col">
              {/* 1. Calendario Semanal / Mensual */}
          <div className="px-6 py-4 bg-white dark:bg-[#12131d]/60 border-b border-gray-200 dark:border-b-gray-800/30 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <span>Calendario de Entrenamientos</span>
              </span>
              <div className="flex bg-gray-100 dark:bg-[#161824] p-0.5 rounded-lg border border-gray-200 dark:border-gray-800 text-[10px]">
                <button
                  onClick={() => setCalendarView("week")}
                  className={`px-2 py-1 font-bold rounded-md transition cursor-pointer ${
                    calendarView === "week" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setCalendarView("month")}
                  className={`px-2 py-1 font-bold rounded-md transition cursor-pointer ${
                    calendarView === "month" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  Mes
                </button>
              </div>
            </div>

            {calendarView === "week" ? (
              <div className="flex justify-between gap-1.5 overflow-x-auto no-scrollbar py-1">
                {weekDates.map((day) => {
                  const isSelected = selectedDay === day.dateStr;
                  const hasSession = workoutHistory.some(w => w.date === day.dateStr);
                  const completedSession = workoutHistory.some(w => w.date === day.dateStr && w.completed);
                  const hasSports = (userProfile.loggedSportsToday || []).some(s => isSameDay(s.date, day.dateStr));

                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => setSelectedDay(day.dateStr)}
                      className={`flex-grow min-w-[42px] py-2 rounded-xl border flex flex-col items-center justify-between transition cursor-pointer ${
                        isSelected 
                          ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/10"
                          : "bg-white dark:bg-[#161824] border-gray-200 dark:border-gray-800/80 text-gray-550 dark:text-gray-400 shadow-sm dark:shadow-none"
                      }`}
                    >
                      <span className="text-[9px] font-mono uppercase font-bold opacity-80">{day.dayName}</span>
                      <span className="text-sm font-black mt-1">{day.dayNum}</span>
                      
                      {/* Completion indicators */}
                      <div className="flex gap-1 mt-1.5 items-center">
                        {hasSession && (
                          <div className={`w-1.5 h-1.5 rounded-full ${completedSession ? (isSelected ? "bg-white" : "bg-emerald-300") : (isSelected ? "bg-white" : "bg-amber-400")}`} />
                        )}
                        {hasSports && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-orange-200" : "bg-orange-500"}`} title="Deporte registrado" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Grid Calendario Mensual (7x6 days) */
              <div className="space-y-2">
                {/* Headers: Lu Ma Mi Ju Vi Sá Do */}
                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider font-mono">
                  <span>Lu</span>
                  <span>Ma</span>
                  <span>Mi</span>
                  <span>Ju</span>
                  <span>Vi</span>
                  <span>Sá</span>
                  <span>Do</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {getMonthDates().map((day, idx) => {
                    const isSelected = selectedDay === day.dateStr;
                    const hasSession = workoutHistory.some(w => w.date === day.dateStr);
                    const completedSession = workoutHistory.some(w => w.date === day.dateStr && w.completed);
                    const hasSports = (userProfile.loggedSportsToday || []).some(s => isSameDay(s.date, day.dateStr));

                    return (
                      <button
                        key={`${day.dateStr}-${idx}`}
                        onClick={() => setSelectedDay(day.dateStr)}
                        className={`aspect-square p-1 rounded-lg border flex flex-col items-center justify-between transition relative cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-400 text-white z-10 shadow-md shadow-emerald-500/10"
                            : !day.isCurrentMonth
                              ? "bg-transparent border-transparent text-gray-300 dark:text-gray-700 pointer-events-none"
                              : "bg-white dark:bg-[#161824] border-gray-200 dark:border-gray-800/80 text-gray-750 dark:text-gray-300"
                        }`}
                      >
                        <span className={`text-[10px] font-bold ${!day.isCurrentMonth ? "opacity-30" : ""}`}>
                          {day.dayNum}
                        </span>

                        {/* Session indicators */}
                        {day.isCurrentMonth && (hasSession || hasSports) && (
                          <div className="absolute bottom-1 flex gap-0.5 justify-center">
                            {hasSession && (
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                completedSession 
                                  ? isSelected ? "bg-white" : "bg-emerald-500" 
                                  : isSelected ? "bg-white" : "bg-amber-500"
                              }`} />
                            )}
                            {hasSports && (
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? "bg-orange-200" : "bg-orange-500"
                              }`} />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-4 justify-center text-[9px] font-bold text-gray-450 dark:text-gray-550 pt-1.5 border-t border-gray-100 dark:border-gray-800/20 font-mono">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Rutina</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span>Deporte</span>
                  </div>
                </div>

                {/* Stats Panel */}
                <div className="bg-emerald-500/5 dark:bg-[#12131d]/60 border border-emerald-500/10 dark:border-gray-800/80 p-3.5 rounded-2xl grid grid-cols-2 gap-3.5 mt-2.5 text-left shadow-inner">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase block">Entrenamientos Completados</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white flex items-baseline gap-1 mt-0.5">
                      {monthlyStats.completedCount}
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">de {monthlyStats.totalSessions} creados</span>
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase block">Calorías Quemadas</span>
                    <span className="text-xs font-black text-emerald-500 flex items-baseline gap-0.5 mt-0.5">
                      ~{monthlyStats.totalCalories}
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">kcal</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-5 space-y-4 flex-1">
            
            {isGenerating && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-md text-left">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <RefreshCw className="h-5 w-5 text-emerald-500 dark:text-emerald-400 animate-spin" />
                    <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-sm animate-ping" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-gray-900 dark:text-white block">
                      Diseñando tu Plan de Rutinas con IA...
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Calculando la distribución óptima y ejercicios en "Tus Rutinas".
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("routines")}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0 transition"
                >
                  Ver Progreso
                </button>
              </div>
            )}
            {/* Widget de Deportes Registrados */}
            {(() => {
              const isSelectedDayToday = selectedDay === todayStr;
              const selectedDaySports = (userProfile.loggedSportsToday || []).filter(s => isSameDay(s.date, selectedDay));

              return (
                <div className="bg-white dark:bg-[#161824] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-orange-500/15 border border-orange-500/25 text-orange-500 flex items-center justify-center shrink-0">
                        <Activity className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-wider block">
                          {isSelectedDayToday ? "Actividad Deportiva" : `Actividad Deportiva · ${formatFriendlyDate(selectedDay)}`}
                        </span>
                        <h4 className="text-xs font-black text-gray-900 dark:text-white">
                          {selectedDaySports.length > 0 
                            ? `${selectedDaySports.length} ${selectedDaySports.length === 1 ? "deporte registrado" : "deportes registrados"}`
                            : (isSelectedDayToday ? "¿Practicaste algún deporte hoy?" : "¿Practicaste algún deporte este día?")}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSportModalOpen(true)}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-orange-500/15 active:scale-95 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      <span>{selectedDaySports.length > 0 ? "Añadir Otro" : "Registrar Deporte"}</span>
                    </button>
                  </div>

                  {/* Si hay deportes registrados para este día */}
                  {selectedDaySports.length > 0 ? (
                    <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800/60">
                      {selectedDaySports.map((sport) => {
                        const sportInfo = SPORTS_METS[sport.sportKey || ""] || SPORTS_METS.other;
                        return (
                          <div
                            key={sport.id}
                            className="p-3 rounded-2xl bg-gray-50 dark:bg-[#12131d] border border-gray-200/80 dark:border-gray-800/60 flex items-start justify-between gap-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-base leading-none">{sportInfo.emoji || "⚡"}</span>
                                <span className="text-xs font-black text-gray-900 dark:text-white">
                                  {sport.name}
                                </span>
                                {sport.intensity && (
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                    sport.intensity === "high"
                                      ? "bg-rose-500/15 text-rose-500 font-black"
                                      : sport.intensity === "low"
                                        ? "bg-blue-500/15 text-blue-500 font-bold"
                                        : "bg-amber-500/15 text-amber-500 font-bold"
                                  }`}>
                                    {sport.intensity === "high" ? "Intenso" : sport.intensity === "low" ? "Suave" : "Moderado"}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                <span>⏱️ {sport.durationMinutes} min</span>
                                <span>·</span>
                                <span className="font-bold text-orange-500">🔥 ~{sport.caloriesBurned} kcal quemadas</span>
                              </div>
                              {sport.notes && (
                                <p className="text-[10px] text-gray-600 dark:text-gray-300 italic mt-1.5 bg-white/70 dark:bg-black/30 p-2 rounded-xl border border-gray-200/50 dark:border-white/5 leading-relaxed">
                                  "{sport.notes}"
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSport(sport.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-500 transition cursor-pointer shrink-0 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                              title="Eliminar este deporte"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      {isSelectedDayToday 
                        ? "Registra tus partidos de pádel, fútbol, salidas en bicicleta o natación para sumar su gasto calórico a tu balance diario."
                        : `Sin deportes registrados para el ${formatFriendlyDate(selectedDay)}. Puedes registrar cualquier actividad que hayas realizado este día.`}
                    </p>
                  )}
                </div>
              );
            })()}

            {!activeSession ? (() => {
              const selectedDayKey = getDayKeyFromDateStr(selectedDay);
              const assignedRoutine = userProfile.weeklyRoutinePlan?.routines?.find(
                r => r.assignedDay === selectedDayKey
              );
              const hasRoutinePlan = !!(userProfile.weeklyRoutinePlan && userProfile.weeklyRoutinePlan.routines && userProfile.weeklyRoutinePlan.routines.length > 0);

              if (assignedRoutine) {
                return (
                  <div className="space-y-4 text-left">
                    {/* Scheduled Routine Card */}
                    <div className="bg-white dark:bg-[#161824] p-5 rounded-3xl border border-emerald-500/30 dark:border-emerald-500/20 shadow-lg space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{DAY_LABEL_MAP[selectedDayKey]}</span>
                          </span>
                          {assignedRoutine.focus && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 text-[10px] font-bold">
                              🎯 {assignedRoutine.focus}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono font-bold">
                          {assignedRoutine.exercises.length} ejercicios · ~45 min
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                          {selectedDay === todayStr ? "Rutina Programada para Hoy" : `Rutina del ${DAY_LABEL_MAP[selectedDayKey]} (${formatFriendlyDate(selectedDay)})`}
                        </span>
                        <h3 className="text-base font-black text-gray-900 dark:text-white mt-0.5">
                          {assignedRoutine.name}
                        </h3>
                      </div>

                      {/* Warmup preview */}
                      {assignedRoutine.warmup && assignedRoutine.warmup.length > 0 && (
                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#12131d] border border-gray-200 dark:border-gray-800/60 space-y-1.5">
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                            Calentamiento sugerido:
                          </span>
                          <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                            {assignedRoutine.warmup.map((w, wIdx) => (
                              <li key={wIdx} className="flex items-start gap-1.5">
                                <span className="text-emerald-400 font-bold">•</span>
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Exercises preview */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                          Ejercicios de la sesión:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {assignedRoutine.exercises.map((ex, exIdx) => (
                            <div
                              key={exIdx}
                              className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#12131d] border border-gray-200 dark:border-gray-800/60 flex items-center justify-between"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="block text-xs font-bold text-gray-900 dark:text-white truncate">
                                  {ex.name}
                                </span>
                                <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                                  {ex.sets} series × {ex.reps} {ex.trackingType === "time" ? "seg" : "reps"}
                                  {ex.weight > 0 ? ` · ${ex.weight}kg` : ""}
                                </span>
                              </div>
                              {ex.primaryMuscles && ex.primaryMuscles[0] && (
                                <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium shrink-0">
                                  {ex.primaryMuscles[0]}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => startSessionFromTemplate(assignedRoutine)}
                          className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          <span>{selectedDay === todayStr ? "Iniciar Entrenamiento de Hoy" : "Cargar Rutina para este Día"}</span>
                        </button>
                        {selectedDay < todayStr && (
                          <button
                            onClick={() => startSessionFromTemplate(assignedRoutine, true)}
                            className="py-3 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-500/25 shadow-sm active:scale-98"
                            title="Registra esta rutina como completada en esta fecha"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Registrar ya Realizada</span>
                          </button>
                        )}
                        <button
                          onClick={() => setActiveTab("routines")}
                          className="py-3 px-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-gray-200 dark:border-white/10"
                        >
                          <Layers className="h-4 w-4 text-emerald-400" />
                          <span>Reorganizar en Tus Rutinas</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // Rest day or no plan
              return (
                <div className="space-y-4">
                  {hasRoutinePlan ? (
                    /* Scheduled Rest Day */
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-[#161824] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-md space-y-3.5 text-left">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-500 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider">
                            🧘 Día de Descanso Programado
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                            {DAY_LABEL_MAP[selectedDayKey]}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-gray-900 dark:text-white">
                            Hoy no tienes ninguna rutina asignada
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-1">
                            Según tu plan de {userProfile.weeklyRoutinePlan?.weeklyDaysCount || userProfile.weeklyRoutinePlan?.routines.length} días de entrenamiento, hoy es una jornada de descanso o actividad ligera. El descanso es cuando ocurre la verdadera síntesis de proteínas e hipertrofia.
                          </p>
                        </div>

                        {/* Active Rest Tip */}
                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#12131d] border border-gray-200 dark:border-gray-800/60">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                            Sugerencia de Descanso Activo:
                          </span>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                            {userProfile.goal === "lose_weight" 
                              ? "🚶 Caminata ligera de 30-45 minutos para mantener gasto energético sin sobrecargar articulaciones."
                              : userProfile.goal === "gain_muscle"
                                ? "🧘 15 minutos de elongaciones estáticas completas y buena hidratación para descomprimir la columna."
                                : "🏃 Movilidad articular suave de 20 minutos para mantener el cuerpo ágil y sin rigidez."}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <button
                            onClick={() => setActiveTab("routines")}
                            className="flex-1 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/15 cursor-pointer"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Ver y Asignar Días en Tus Rutinas</span>
                          </button>
                          <button
                            onClick={() => setIsSportModalOpen(true)}
                            className="py-2.5 px-3 bg-orange-500/15 hover:bg-orange-500/25 text-orange-500 dark:text-orange-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-orange-500/20"
                          >
                            <Activity className="h-3.5 w-3.5" />
                            <span>Registrar Deporte</span>
                          </button>
                        </div>
                      </div>

                      {/* Option to train an unassigned or any routine from plan today anyway */}
                      {userProfile.weeklyRoutinePlan && userProfile.weeklyRoutinePlan.routines.length > 0 && (
                        <div className="p-4 rounded-2xl bg-white dark:bg-[#12131d] border border-gray-200 dark:border-gray-800/80 space-y-3 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              ¿Quieres entrenar hoy de todas formas?
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              Elige una rutina:
                            </span>
                          </div>
                          <div className="space-y-2">
                            {userProfile.weeklyRoutinePlan.routines.map((r) => (
                              <div
                                key={r.id}
                                className="p-3 rounded-xl bg-gray-50 dark:bg-[#161824] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                      {r.name}
                                    </span>
                                    {r.assignedDay && r.assignedDay !== "unassigned" && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 font-mono">
                                        ({DAY_LABEL_MAP[r.assignedDay]})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate">
                                    {r.exercises.length} ejercicios · {r.focus}
                                  </span>
                                </div>
                                <button
                                  onClick={() => startSessionFromTemplate(r)}
                                  className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 dark:text-emerald-400 rounded-lg text-xs font-black transition flex items-center gap-1 shrink-0 cursor-pointer border border-emerald-500/25"
                                >
                                  <Play className="h-3 w-3 fill-current" />
                                  <span>Hacer hoy</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* No Routine Plan configured yet */
                    <div className="bg-white dark:bg-[#12131d] border border-gray-250 dark:border-gray-800 border-dashed rounded-3xl p-6 text-center space-y-4 shadow-sm dark:shadow-none">
                      <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">Configura tus Rutinas Semanales</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1 leading-relaxed">
                          La IA creará tus rutinas para cada día según tu equipamiento y disponibilidad.
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        <button
                          onClick={() => setIsWorkoutsOnboardingOpen(true)}
                          disabled={isGenerating}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 active:scale-98 cursor-pointer"
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              <span>Formulando tus rutinas...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              <span>Configurar y Crear Rutinas con IA</span>
                            </>
                          )}
                        </button>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button
                            onClick={handleStartManualSession}
                            className="py-2.5 px-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-gray-200 dark:border-white/10 truncate"
                          >
                            <Plus className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">Crear Sesión</span>
                          </button>
                          <button
                            onClick={() => {
                              handleStartManualSession();
                              setIsLibraryModalOpen(true);
                            }}
                            className="py-2.5 px-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-purple-500/20 truncate"
                          >
                            <BookOpen className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Biblioteca</span>
                          </button>
                          <button
                            onClick={() => {
                              handleStartManualSession();
                              setIsBatchModalOpen(true);
                            }}
                            className="py-2.5 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-blue-500/20 truncate"
                          >
                            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Pegar Lista</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              /* Session active display */
              <div className="space-y-4">
                
                {/* Session title bar */}
                <div className="bg-white dark:bg-[#161824] p-4.5 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md text-left">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                        {selectedDay === todayStr ? "Plan del día" : `Plan · ${formatFriendlyDate(selectedDay)}`}
                      </span>
                      {selectedDay !== todayStr && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold">
                          📅 {selectedDay}
                        </span>
                      )}
                      {activeSession.completed ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black flex items-center gap-1">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                          <span>Completada ({activeSession.durationMinutes} min)</span>
                        </span>
                      ) : activeSession.startTime ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>⏱️ En curso · {formatWorkoutTime(workoutElapsedSeconds)}</span>
                        </span>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold">
                          ⏳ Lista para iniciar
                        </span>
                      )}
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                        {activeSession.exercises.length} ejercicios
                      </span>
                    </div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white">
                      {activeSession.name}
                    </h3>
                  </div>

                  {activeSession.completed ? (
                    <div className="flex items-center gap-2.5 self-start sm:self-auto">
                      <span className="text-xs font-black text-emerald-500">
                        🔥 ~{activeSession.exercises.reduce((s, ex) => s + (ex.completedSets.filter(c => c.completed).length * ex.caloriesBurnedPerSet), 0)} kcal
                      </span>
                      <button
                        onClick={handleStartActiveWorkout}
                        className="text-[10px] font-bold text-gray-500 hover:text-emerald-400 underline cursor-pointer"
                        title="Reiniciar temporizador y registrar de nuevo"
                      >
                        Reiniciar
                      </button>
                    </div>
                  ) : !activeSession.startTime ? (
                    /* BOTÓN INICIAR ENTRENAMIENTO / GUARDAR COMO REALIZADA */
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <button
                        onClick={handleStartActiveWorkout}
                        className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        <span>{selectedDay === todayStr ? "Iniciar Entrenamiento" : "Iniciar en Vivo"}</span>
                      </button>
                      {selectedDay < todayStr && (
                        <button
                          onClick={() => handleMarkSessionCompleteDirectly()}
                          className="py-2.5 px-3.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-emerald-500/25 active:scale-95 cursor-pointer shadow-sm"
                          title="Guardar esta sesión pasada como completada con todas sus series"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span>Guardar como Realizada</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    /* EN PROGRESO: TEMPORIZADOR Y TERMINAR SESIÓN */
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setIsTimerModalOpen(true)}
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 text-xs font-bold py-2 px-3 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-gray-200 dark:border-white/10"
                        title="Abrir cronómetro y temporizador de descanso"
                      >
                        <Timer className="h-4 w-4 text-emerald-400" />
                        <span>Descanso</span>
                        {isTimerRunning && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-mono animate-pulse">
                            {timeRemaining}s
                          </span>
                        )}
                      </button>
                      <button
                        onClick={handleMarkSessionComplete}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black py-2 px-4 rounded-xl transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Terminar Sesión</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Warm up block */}
                <div className="bg-white dark:bg-[#12131d] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800/60 space-y-2 text-left">
                  <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    1. Calentamiento (Movilidad)
                  </span>
                  <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                    {activeSession.warmup.map((w, idx) => (
                      <li key={idx} className="flex gap-1.5 items-start">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Exercises Tracker Block */}
                <div className="space-y-3.5 text-left">
                  <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    2. Rutina Central (Ejercicios)
                  </span>
                  
                  {activeSession.exercises.map((ex) => {
                    const allCompleted = ex.completedSets.every(s => s.completed);
                    const isTimeTracking = ex.trackingType === "time";

                    return (
                      <div 
                        key={ex.id}
                        className={`bg-white dark:bg-[#161824] rounded-3xl border p-4 sm:p-5 space-y-3.5 shadow-md transition text-left ${
                          allCompleted ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-[#161824]/40" : "border-gray-200 dark:border-gray-800"
                        }`}
                      >
                        {/* Fila 1: Estrella + Nombre + Fav Badge a la izq | Pastilla de Calorías a la der */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              onClick={() => handleToggleFavorite(ex.name)}
                              className={`p-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                                (userProfile.favoriteExercises || []).includes(ex.name)
                                  ? "bg-amber-500/15 border-amber-500/30 text-amber-500 shadow-sm shadow-amber-500/10"
                                  : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400 hover:text-amber-500"
                              }`}
                              title="Marcar como favorito"
                            >
                              <Star className={`h-4 w-4 ${(userProfile.favoriteExercises || []).includes(ex.name) ? "fill-current" : ""}`} />
                            </button>

                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">
                                {ex.name}
                              </h4>
                              {(userProfile.favoriteExercises || []).includes(ex.name) && (
                                <span className="text-[9px] bg-amber-500/15 text-amber-500 font-black px-1.5 py-0.5 rounded-md border border-amber-500/20 font-mono shrink-0">
                                  FAV
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Pastilla de Calorías quemadas */}
                          <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0 flex items-center gap-1" title="Gasto calórico estimado conservador">
                            <Flame className="h-3.5 w-3.5" />
                            <span className="text-xs font-black">~{ex.sets * ex.caloriesBurnedPerSet} kcal</span>
                          </div>
                        </div>

                        {/* Fila 2: Músculo + Series/Reps info + Toggle Tiempo/Reps | Acciones: Técnica y Alternativas */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-800/40">
                          <div className="flex items-center gap-2 flex-wrap">
                            {ex.primaryMuscles && ex.primaryMuscles.length > 0 && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                🎯 {ex.primaryMuscles[0]}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">
                              {ex.sets} series × {ex.reps} {isTimeTracking ? "seg" : "reps"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleTrackingType(ex.id)}
                              className="text-[9px] font-bold text-gray-600 dark:text-gray-300 hover:text-emerald-400 bg-gray-100 dark:bg-white/5 hover:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-gray-200 dark:border-white/10 transition cursor-pointer"
                              title="Alternar entre Repeticiones y Segundos de duración"
                            >
                              {isTimeTracking ? "⏱️ Tiempo" : "🔄 Reps"}
                            </button>
                          </div>

                          {/* Acciones: Técnica + Alternativas */}
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              onClick={() => handleOpenTechniqueGuide(ex)}
                              className="text-[10px] font-black text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-xl border border-blue-500/20 flex items-center gap-1 transition cursor-pointer"
                              title="Ver biomecánica y técnica del ejercicio"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>Técnica</span>
                            </button>
                            <button
                              onClick={() => handleOpenAlternatives(ex)}
                              className="text-[10px] font-black text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1 transition cursor-pointer"
                              title="Consultar con la IA o pedir cambio para este ejercicio"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>Consultar / Cambiar</span>
                            </button>
                          </div>
                        </div>
                          
                        {/* Tabla de Series con Columnas Claras */}
                        <div className="space-y-1.5 border-t border-gray-100 dark:border-gray-800/60 pt-2.5">
                          <div className="flex items-center justify-between text-[9px] font-mono uppercase font-bold text-gray-400 dark:text-gray-500 px-1 mb-1">
                            <span>Serie</span>
                            <div className="flex items-center gap-4 sm:gap-6 mr-6 sm:mr-8">
                              <span>{isTimeTracking ? "Duración" : "Repeticiones"}</span>
                              <span>Carga (kg)</span>
                            </div>
                            <span>Listo</span>
                          </div>

                          {ex.completedSets.map((set) => (
                            <div 
                              key={set.setIndex}
                              className={`flex items-center justify-between p-1.5 rounded-xl transition ${
                                set.completed 
                                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                                  : "bg-gray-50/70 dark:bg-[#0f101a] border border-gray-200/70 dark:border-gray-800/70"
                              }`}
                            >
                              <span className="font-mono text-[11px] font-black text-gray-500 dark:text-gray-400 pl-1">
                                SET {set.setIndex + 1}
                              </span>
                              
                              <div className="flex items-center gap-2">
                                {/* Edit Reps / Seconds */}
                                <div className="flex items-center gap-1 bg-white dark:bg-black/30 border border-gray-200 dark:border-gray-700/60 rounded-lg px-2 py-1 shadow-inner">
                                  <input
                                    type="number"
                                    value={set.reps}
                                    onChange={(e) => handleUpdateSetWeightOrReps(ex.id, set.setIndex, set.weight, Math.max(1, Number(e.target.value) || set.reps))}
                                    className="w-10 text-center text-xs font-bold bg-transparent text-gray-900 dark:text-white focus:outline-none"
                                  />
                                  <span className="text-[9px] text-gray-400 font-semibold">{isTimeTracking ? "seg" : "reps"}</span>
                                </div>

                                {/* Edit Weight */}
                                <div className="flex items-center gap-1 bg-white dark:bg-black/30 border border-gray-200 dark:border-gray-700/60 rounded-lg px-2 py-1 shadow-inner">
                                  <input
                                    type="number"
                                    value={set.weight}
                                    onChange={(e) => handleUpdateSetWeightOrReps(ex.id, set.setIndex, Math.max(0, Number(e.target.value) || 0), set.reps)}
                                    className="w-10 text-center text-xs font-bold bg-transparent text-gray-900 dark:text-white focus:outline-none"
                                  />
                                  <span className="text-[9px] text-gray-400 font-semibold">kg</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleToggleSet(ex.id, set.setIndex)}
                                className={`w-7 h-7 rounded-xl border flex items-center justify-center transition cursor-pointer shadow-sm ${
                                  set.completed
                                    ? "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20"
                                    : "bg-white dark:bg-[#161824] border-gray-300 dark:border-gray-700 text-gray-400 hover:text-emerald-400 hover:border-emerald-400"
                                }`}
                                title={set.completed ? "Serie completada" : "Marcar como completada"}
                              >
                                {set.completed ? <Check className="h-4 w-4 stroke-[3]" /> : <Play className="h-3 w-3 fill-current ml-0.5" />}
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Exercise Controls Row: Add Set, Remove Set, Delete Exercise */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/40 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAddSet(ex.id)}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="h-3 w-3 text-emerald-400" />
                              <span>Serie</span>
                            </button>
                            {ex.completedSets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSet(ex.id)}
                                className="px-2.5 py-1 bg-gray-100 hover:bg-rose-500/10 dark:bg-white/5 dark:hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 font-bold rounded-lg transition cursor-pointer"
                                title="Eliminar última serie"
                              >
                                - Serie
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(ex.id)}
                            className="p-1 text-gray-400 hover:text-rose-500 transition cursor-pointer"
                            title="Eliminar este ejercicio de la sesión"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Exercise & Batch Importer Bar */}
                  <div className="pt-1 space-y-3">
                    {!isAddExerciseOpen ? (
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddExerciseOpen(true)}
                          className="py-2.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20 transition flex items-center justify-center gap-1 cursor-pointer truncate"
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Escribir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsLibraryModalOpen(true)}
                          className="py-2.5 px-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold border border-purple-500/20 transition flex items-center justify-center gap-1 cursor-pointer truncate"
                        >
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Biblioteca</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBatchModalOpen(true)}
                          className="py-2.5 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-500/20 transition flex items-center justify-center gap-1 cursor-pointer truncate"
                        >
                          <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Pegar Lista</span>
                        </button>
                      </div>
                    ) : (
                      /* Inline Add Exercise Card with Autocomplete & Defaults */
                      <div className="bg-white dark:bg-[#161824] p-4 rounded-2xl border border-emerald-500/30 space-y-3 shadow-lg text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            Nuevo Ejercicio
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddExerciseOpen(false);
                                setIsLibraryModalOpen(true);
                              }}
                              className="text-[10px] text-purple-500 dark:text-purple-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <BookOpen className="h-3 w-3" />
                              <span>Abrir Biblioteca</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddExerciseOpen(false);
                                setExerciseSearchSuggestions([]);
                              }}
                              className="text-gray-400 hover:text-gray-200 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Search / Name Input */}
                        <div className="relative">
                          <input
                            type="text"
                            value={newExerciseName}
                            onChange={(e) => setNewExerciseName(e.target.value)}
                            placeholder="Ej: Press militar con mancuernas, Sentadilla búlgara, Plancha..."
                            className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                            autoFocus
                          />

                          {/* Autocomplete Suggestions Dropdown */}
                          {exerciseSearchSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#12131d] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                              {exerciseSearchSuggestions.map((sug, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setNewExerciseName(sug.name);
                                    setNewExerciseSets(sug.defaultSets || 3);
                                    setNewExerciseReps(sug.defaultReps || (sug.trackingType === "time" ? 45 : 10));
                                    setNewExerciseWeight(sug.defaultWeight || 0);
                                    setNewExerciseTrackingType(sug.trackingType || "reps");
                                    setExerciseSearchSuggestions([]);
                                  }}
                                  className="w-full p-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-gray-800/40 flex items-center justify-between cursor-pointer"
                                >
                                  <div>
                                    <span className="block text-xs font-bold text-gray-800 dark:text-gray-200">{sug.name}</span>
                                    <span className="block text-[9px] text-gray-400">
                                      {sug.primaryMuscles?.join(", ") || "General"} · {sug.trackingType === "time" ? "⏱️ Tiempo" : "🔄 Reps"}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    {"createdAt" in sug ? "Tu BBDD" : "Base"}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Sets, Reps/Time, Weight Controls */}
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 mb-1">Tipo</label>
                            <select
                              value={newExerciseTrackingType}
                              onChange={(e) => {
                                const t = e.target.value as ExerciseTrackingType;
                                setNewExerciseTrackingType(t);
                                if (t === "time" && newExerciseReps === 10) setNewExerciseReps(45);
                                if (t === "reps" && newExerciseReps === 45) setNewExerciseReps(10);
                              }}
                              className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white"
                            >
                              <option value="reps">Reps</option>
                              <option value="time">Tiempo</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 mb-1">Series</label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={newExerciseSets}
                              onChange={(e) => setNewExerciseSets(Math.max(1, Number(e.target.value) || 1))}
                              className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-xs text-center text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 mb-1">
                              {newExerciseTrackingType === "time" ? "Segundos" : "Reps"}
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={newExerciseReps}
                              onChange={(e) => setNewExerciseReps(Math.max(1, Number(e.target.value) || 1))}
                              className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-xs text-center text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 mb-1">Peso (kg)</label>
                            <input
                              type="number"
                              min={0}
                              value={newExerciseWeight}
                              onChange={(e) => setNewExerciseWeight(Math.max(0, Number(e.target.value) || 0))}
                              className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-xs text-center text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Add Button */}
                        <button
                          type="button"
                          disabled={!newExerciseName.trim() || isAnalyzingExercise}
                          onClick={() => handleAddExerciseToSession(
                            newExerciseName,
                            newExerciseTrackingType,
                            newExerciseSets,
                            newExerciseReps,
                            newExerciseWeight
                          )}
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                        >
                          {isAnalyzingExercise ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>Analizando con IA y guardando en BD...</span>
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Guardar y Agregar Ejercicio</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cooldown stretching list */}
                <div className="bg-white dark:bg-[#12131d] p-3 rounded-xl border border-gray-200 dark:border-gray-800/60 space-y-2">
                  <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">3. Enfriamiento (Elongación)</span>
                  <ul className="space-y-1 text-xs text-gray-750 dark:text-gray-300">
                    {activeSession.cooldown.map((c, idx) => (
                      <li key={idx} className="flex gap-1.5 items-start">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Clear Workout Option */}
                <button
                  onClick={onClearWorkouts}
                  className="w-full bg-white hover:bg-rose-50 dark:bg-gray-900 dark:hover:bg-rose-950/20 border border-gray-250 dark:border-gray-800 hover:border-rose-350 dark:hover:border-rose-900/30 text-xs text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm dark:shadow-none cursor-pointer"
                >
                  <Trash className="h-4 w-4" />
                  <span>Eliminar todas las sesiones</span>
                </button>

              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "routines" && (
        <WorkoutsRoutineManager
          plan={userProfile.weeklyRoutinePlan}
          isGenerating={isGenerating}
          generationError={generationError}
          onRetryGenerate={handleGenerateRoutine}
          onUpdatePlan={(updatedPlan) => {
            onUpdateProfile({
              ...userProfile,
              weeklyRoutinePlan: updatedPlan
            });
          }}
          onSelectRoutineForToday={(routine) => {
            startSessionFromTemplate(routine);
          }}
          onOpenPreferences={() => setIsWorkoutsOnboardingOpen(true)}
          onGoToDailySession={() => setActiveTab("routine")}
          apiKey={apiKey}
          userId={userId}
          userEquipment={userProfile.equipment}
          userProfile={userProfile}
          customExercises={customExercises}
          onAddCustomExercise={(newEx) => setCustomExercises(prev => [newEx, ...prev])}
        />
      )}

      {activeTab === "recovery" && (
        <div className="px-6 py-5 space-y-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
            Porcentaje de recuperación muscular estimado basado en el historial de ejercicios completados. Deja descansar los músculos si están por debajo de 35% de recuperación.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "chest", label: "Pecho / Empuje", value: recovery.chest, color: "from-blue-500 to-indigo-500" },
              { id: "back", label: "Espalda / Tracción", value: recovery.back, color: "from-emerald-500 to-teal-500" },
              { id: "legs", label: "Piernas (Glúteos/Cuádriceps)", value: recovery.legs, color: "from-orange-500 to-amber-500" },
              { id: "shoulders", label: "Hombros", value: recovery.shoulders, color: "from-cyan-500 to-blue-500" },
              { id: "arms", label: "Brazos (Bíceps/Tríceps)", value: recovery.arms, color: "from-purple-500 to-pink-500" },
              { id: "core", label: "Core / Abdomen", value: recovery.core, color: "from-pink-500 to-rose-500" }
            ].map((muscle) => (
              <div 
                key={muscle.id}
                className="bg-white dark:bg-[#161824] p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2.5 shadow-md"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-300 truncate">{muscle.label}</span>
                  <span className={`font-black ${
                    muscle.value < 40 ? "text-rose-450 dark:text-rose-400" : muscle.value < 75 ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400"
                  }`}>{muscle.value}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${muscle.value}%` }}
                    className={`h-full bg-gradient-to-r ${muscle.color}`}
                  />
                </div>
                
                <span className="text-[9px] text-gray-450 dark:text-gray-500 block">
                  {muscle.value < 40 ? "⚠️ Sobrecargado. Priorizar descanso hoy" : muscle.value < 75 ? "🔋 Recuperación intermedia" : "✅ Listo para entrenar pesado"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating mini-timer pill when timer is active */}
      <AnimatePresence>
        {isTimerRunning && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 dark:bg-[#12131d]/95 backdrop-blur-md border border-emerald-500/30 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer"
            onClick={() => setIsTimerModalOpen(true)}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                {timerType === "rest" ? "Descanso" : hiitCycle === "work" ? "¡Trabajo!" : "Descanso HIIT"}
              </span>
              <span className="text-xs font-black font-mono text-emerald-400">
                {timeRemaining}s restantes
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePauseTimer();
              }}
              className="p-1.5 hover:text-amber-400 transition cursor-pointer text-gray-300"
              title="Pausar"
            >
              <Pause className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsTimerModalOpen(true);
              }}
              className="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-lg font-bold hover:bg-emerald-600 transition"
            >
              Abrir
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise AI Advisor / Alternatives Modal */}
      <ExerciseAiAdvisorModal
        isOpen={!!exerciseForAlternatives}
        onClose={() => setExerciseForAlternatives(null)}
        exercise={exerciseForAlternatives}
        routineName={activeSession?.name || "Sesión de hoy"}
        userProfile={userProfile}
        apiKey={apiKey}
        onApplyReplacement={handleApplyExerciseReplacementInActiveSession}
      />

      {/* Contextual Timer Modal */}
      <AnimatePresence>
        {isTimerModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-white dark:bg-[#0e101a] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-center"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Timer className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                      Cronómetro de Entrenamiento
                    </span>
                    <h3 className="text-xs font-black text-gray-900 dark:text-white">
                      Temporizador
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTimerModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer border-none"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 flex flex-col items-center">
                {/* Timer Mode Toggle */}
                <div className="flex bg-gray-100 dark:bg-[#161824] p-1 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-xs shadow-sm">
                  <button
                    onClick={() => { setTimerType("rest"); handleResetTimer(); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      timerType === "rest" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    Descanso
                  </button>
                  <button
                    onClick={() => { setTimerType("hiit"); handleResetTimer(); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      timerType === "hiit" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    HIIT
                  </button>
                </div>

                {/* Large countdown visual ring */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full">
                    <circle
                      cx="96"
                      cy="96"
                      r="84"
                      className="stroke-gray-200 dark:stroke-gray-800"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="84"
                      className={timerType === "hiit" && hiitCycle === "rest" ? "stroke-blue-400" : "stroke-emerald-400"}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 84}
                      strokeDashoffset={
                        2 * Math.PI * 84 * (1 - timeRemaining / (timerType === "rest" ? 60 : hiitCycle === "work" ? 30 : 15))
                      }
                    />
                  </svg>

                  <div className="z-10 text-center">
                    {timerType === "hiit" && (
                      <span className={`block text-[10px] font-bold uppercase tracking-wider ${
                        hiitCycle === "work" ? "text-emerald-500 dark:text-emerald-400" : "text-blue-500 dark:text-blue-400"
                      }`}>
                        {hiitCycle === "work" ? `💪 ¡TRABAJA! (Ronda ${hiitRound})` : "🔋 Descanso activo"}
                      </span>
                    )}
                    {timerType === "rest" && (
                      <span className="block text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase">Descansando</span>
                    )}

                    <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mt-1 block">
                      {timeRemaining}
                      <span className="text-base font-bold ml-0.5">s</span>
                    </span>
                  </div>
                </div>

                {/* Quick presets for resting */}
                {timerType === "rest" && (
                  <div className="flex gap-2">
                    {[30, 60, 90].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleStartTimer(preset)}
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-[#161824] dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-900 dark:text-white transition active:scale-95 cursor-pointer"
                      >
                        {preset}s
                      </button>
                    ))}
                  </div>
                )}

                {/* Core controls */}
                <div className="flex gap-3 w-full">
                  {isTimerRunning ? (
                    <button
                      onClick={handlePauseTimer}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1 shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer"
                    >
                      <Pause className="h-4 w-4" />
                      <span>Pausar</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsTimerRunning(true)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 active:scale-95 cursor-pointer"
                    >
                      <Play className="h-4 w-4" />
                      <span>Iniciar</span>
                    </button>
                  )}

                  <button
                    onClick={handleResetTimer}
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-2.5 px-3.5 rounded-xl border border-gray-200 dark:border-transparent transition active:scale-95 cursor-pointer"
                    title="Reiniciar temporizador"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setIsTimerModalOpen(false)}
                  className="w-full py-2 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Continuar Entrenamiento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exercise Library Modal (Opened contextually when adding exercises) */}
      <AnimatePresence>
        {isLibraryModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-white dark:bg-[#0e101a] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-left"
            >
              {/* Header */}
              <div className="p-4.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold text-purple-400 uppercase tracking-wider block">
                      Catálogo & Base de Datos
                    </span>
                    <h3 className="text-xs font-black text-gray-900 dark:text-white">
                      Biblioteca de Ejercicios ({customExercises.length + DEFAULT_EXERCISES.length})
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLibraryModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer border-none"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search & Filter Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800/60 space-y-2.5 shrink-0 bg-gray-50/30 dark:bg-transparent">
                {/* Search Input */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o músculo (ej: pectoral, sentadilla, bíceps)..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                </div>

                {/* Muscle Filter Pills */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                  {[
                    { id: "all", label: "Todos" },
                    { id: "pecho", label: "Pecho" },
                    { id: "espalda", label: "Espalda" },
                    { id: "pierna", label: "Piernas" },
                    { id: "hombro", label: "Hombros" },
                    { id: "biceps", label: "Bíceps" },
                    { id: "triceps", label: "Tríceps" },
                    { id: "core", label: "Core" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setLibraryMuscleFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer ${
                        libraryMuscleFilter === f.id
                          ? "bg-purple-500 text-white shadow-sm"
                          : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercises List */}
              <div className="p-4 space-y-2 overflow-y-auto no-scrollbar flex-1">
                {(() => {
                  const allCatalog: { item: CustomExercise | Omit<CustomExercise, "id" | "createdAt">; isCustom: boolean }[] = [
                    ...customExercises.map(e => ({ item: e, isCustom: true })),
                    ...DEFAULT_EXERCISES.filter(d => !customExercises.some(c => normalizeExerciseName(c.name) === normalizeExerciseName(d.name))).map(d => ({ item: d, isCustom: false })),
                  ];

                  const query = librarySearchQuery.trim().toLowerCase();
                  const filtered = allCatalog.filter(({ item }) => {
                    const normName = normalizeExerciseName(item.name);
                    const normMuscles = [
                      ...(item.primaryMuscles || []),
                      ...(item.secondaryMuscles || []),
                    ].map(m => normalizeExerciseName(m)).join(" ");

                    const matchesQuery = !query || normName.includes(query) || normMuscles.includes(query) || item.name.toLowerCase().includes(query);

                    if (!matchesQuery) return false;

                    if (libraryMuscleFilter === "all") return true;
                    return normMuscles.includes(libraryMuscleFilter) || normName.includes(libraryMuscleFilter);
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center space-y-2">
                        <BookOpen className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto" />
                        <p className="text-xs text-gray-400 font-bold">No se encontraron ejercicios con ese filtro.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setLibrarySearchQuery("");
                            setLibraryMuscleFilter("all");
                          }}
                          className="text-xs text-purple-400 font-bold hover:underline"
                        >
                          Limpiar filtros
                        </button>
                      </div>
                    );
                  }

                  return filtered.map(({ item, isCustom }, idx) => {
                    const isTimeTracking = item.trackingType === "time";
                    return (
                      <div
                        key={idx}
                        className="bg-gray-50 dark:bg-[#12131d] border border-gray-200 dark:border-gray-800/70 p-3 rounded-2xl flex items-center justify-between gap-3 hover:border-purple-500/30 transition shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {item.name}
                            </h4>
                            <span
                              className={`text-[8px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                isCustom
                                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                  : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {isCustom ? "★ Tu BBDD" : "Base"}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400">
                              {isTimeTracking ? "⏱️ Tiempo" : "🔄 Reps"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {item.primaryMuscles?.map((m, mIdx) => (
                              <span
                                key={mIdx}
                                className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded"
                              >
                                🎯 {m}
                              </span>
                            ))}
                            {item.equipmentNeeded && (
                              <span className="text-[9px] text-gray-400 truncate max-w-[120px]">
                                · 🏋️ {item.equipmentNeeded}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenTechniqueGuide(item.name)}
                            className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border border-blue-500/20"
                            title="Ver técnica"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Técnica</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleAddExerciseToSession(item.name, item.trackingType, item.defaultSets, item.defaultReps, item.defaultWeight);
                              setIsLibraryModalOpen(false);
                            }}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm shadow-emerald-500/10"
                            title="Añadir a la sesión"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Añadir</span>
                          </button>

                          {isCustom && "id" in item && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomExercise(item.id)}
                              className="p-1 text-gray-400 hover:text-rose-400 transition cursor-pointer"
                              title="Eliminar de mi base de datos"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Footer */}
              <div className="p-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.01] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLibraryModalOpen(false);
                    setIsAddExerciseOpen(true);
                  }}
                  className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-emerald-500/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Escribir nuevo ejercicio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLibraryModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Sport Modal */}
      {isSportModalOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-[#0c0d14] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden text-gray-900 dark:text-white"
          >
            <div className="p-5 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                <div>
                  <h3 className="text-sm font-black tracking-tight uppercase">Registrar Actividad</h3>
                  {selectedDay !== todayStr && (
                    <span className="text-[10px] text-orange-500 font-bold block">
                      📅 Para el: {formatFriendlyDate(selectedDay)} ({selectedDay})
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setIsSportModalOpen(false)}
                className="p-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white transition cursor-pointer border-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Select Sport */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deporte / Actividad</label>
                <select
                  value={selectedSportKey}
                  onChange={(e) => setSelectedSportKey(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-orange-500/50 transition cursor-pointer"
                >
                  {Object.entries(SPORTS_METS).map(([key, info]) => (
                    <option key={key} value={key} className="bg-white dark:bg-[#0c0d14]">
                      {info.emoji} {info.label} (MET: {info.met})
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Name (Only if "other" is selected) */}
              {selectedSportKey === "other" && (
                <div className="space-y-1.5 text-left animate-fadeIn">
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre del Deporte</label>
                  <input
                    type="text"
                    value={customSportNameInput}
                    onChange={(e) => setCustomSportNameInput(e.target.value)}
                    placeholder="Ej: Fútbol de salón, Pilates aéreo..."
                    className="w-full p-2.5 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-orange-500/50 transition placeholder-gray-400"
                  />
                </div>
              )}

              {/* Intensity Selector */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Intensidad</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "low" as const, label: "Suave", factor: "0.8x" },
                    { key: "moderate" as const, label: "Moderado", factor: "1.0x" },
                    { key: "high" as const, label: "Intenso", factor: "1.25x" },
                  ].map((lvl) => {
                    const isSelected = sportIntensity === lvl.key;
                    return (
                      <button
                        key={lvl.key}
                        type="button"
                        onClick={() => setSportIntensity(lvl.key)}
                        className={`p-2 rounded-xl text-center border transition cursor-pointer ${
                          isSelected
                            ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                            : "bg-gray-50 dark:bg-black/30 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700"
                        }`}
                      >
                        <span className="block text-xs font-bold leading-tight">{lvl.label}</span>
                        <span className={`block text-[9px] font-mono ${isSelected ? "text-white/80" : "text-gray-400"}`}>{lvl.factor}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration Input & Presets */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duración (minutos)</label>
                  <span className="text-[10px] text-gray-400 font-mono">{sportDuration ? `${sportDuration} min` : ""}</span>
                </div>
                <input
                  type="number"
                  value={sportDuration}
                  onChange={(e) => setSportDuration(e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))}
                  className="w-full p-2.5 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:border-orange-500/50 transition"
                />
                {/* Quick duration presets */}
                <div className="flex gap-1.5 pt-1">
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSportDuration(mins)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        sportDuration === mins
                          ? "bg-orange-500/20 text-orange-500 border-orange-500/40"
                          : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Context */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contexto o Notas (Opcional)
                </label>
                <textarea
                  value={sportNotes}
                  onChange={(e) => setSportNotes(e.target.value)}
                  placeholder="Ej: Partido de pádel a 3 sets muy reñido, o rodaje suave en bicicleta..."
                  rows={2}
                  className="w-full p-2.5 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-orange-500/50 transition placeholder-gray-400 resize-none"
                />
              </div>

              {/* Estimation Preview */}
              {Number(sportDuration) > 0 && (() => {
                const met = SPORTS_METS[selectedSportKey]?.met || 5;
                const multiplier = sportIntensity === "high" ? 1.25 : sportIntensity === "low" ? 0.8 : 1.0;
                const calEst = Math.round(met * multiplier * 0.0175 * userProfile.weight * Number(sportDuration));
                return (
                  <div className="bg-orange-500/5 border border-orange-500/15 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-[10px] text-gray-600 dark:text-gray-300 font-bold uppercase">Gasto calórico estimado:</span>
                    </div>
                    <span className="text-xs font-black text-orange-500 font-mono">
                      ~{calEst} kcal
                    </span>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50 dark:bg-black/20 flex gap-3">
              <button
                type="button"
                onClick={() => setIsSportModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogSport}
                disabled={!sportDuration}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-200 dark:disabled:bg-white/5 disabled:text-gray-400 dark:disabled:text-white/30 text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-orange-500/20"
              >
                Guardar actividad
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 1. Biomechanical Technique & Muscle Guide Modal (DB + Gemini AI, 0 MuscleWiki) */}
      <AnimatePresence>
        {isGuideModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-white dark:bg-[#0e101a] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="p-4.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                      Guía Biomecánica & Músculos
                    </span>
                    <h3 className="text-xs font-black text-gray-900 dark:text-white truncate max-w-[220px]">
                      {selectedGuideExercise ? selectedGuideExercise.name : "Cargando ejercicio..."}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer border-none"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 no-scrollbar flex-1 text-left">
                {isLoadingGuide ? (
                  <div className="py-12 text-center space-y-3">
                    <RefreshCw className="h-7 w-7 text-emerald-400 animate-spin mx-auto" />
                    <p className="text-xs text-gray-400 font-bold">Analizando biomecánica y anatomía muscular...</p>
                  </div>
                ) : selectedGuideExercise ? (
                  <>
                    {/* Source & Tracking Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          selectedGuideExercise.source === "db_cache"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        }`}
                      >
                        {selectedGuideExercise.source === "db_cache"
                          ? "⚡ Desde tu Biblioteca Guardada"
                          : "✨ Analizado con IA (Guardado en tu cuenta)"}
                      </span>

                      <span className="text-[10px] font-bold text-gray-400">
                        {selectedGuideExercise.trackingType === "time" ? "⏱️ Por Tiempo" : "🔄 Por Repeticiones"}
                      </span>
                    </div>

                    {/* Muscle Targeting */}
                    <div className="space-y-1.5 bg-gray-50 dark:bg-[#12131d] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800/60">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
                        Músculos Objetivos
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedGuideExercise.primaryMuscles.map((m, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-black text-emerald-500 dark:text-emerald-400"
                          >
                            🎯 {m}
                          </span>
                        ))}
                        {selectedGuideExercise.secondaryMuscles?.map((m, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-medium text-gray-600 dark:text-gray-400"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Equipment & Calories Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-gray-800">
                        <span className="text-[9px] text-gray-400 block font-bold uppercase">Equipamiento</span>
                        <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block truncate">
                          🏋️ {selectedGuideExercise.equipmentNeeded || "Peso corporal"}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-gray-800">
                        <span className="text-[9px] text-gray-400 block font-bold uppercase">Gasto estimado</span>
                        <span className="text-xs font-black text-amber-500 mt-0.5 block">
                          🔥 ~{selectedGuideExercise.caloriesBurnedPerSet || 5} kcal/serie
                        </span>
                      </div>
                    </div>

                    {/* Technique & Execution Tips */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
                        Indicaciones Biomecánicas
                      </span>
                      <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 leading-relaxed space-y-1">
                        <p className="font-medium text-[11px]">
                          {selectedGuideExercise.techniqueTips || "Ejecuta con control en todo el rango de movimiento manteniendo estabilidad en la columna."}
                        </p>
                      </div>
                    </div>

                    {/* Safety Alert */}
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>Cuidado Articular y Postura</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-amber-600 dark:text-amber-200/90 pl-5">
                        No bloquees articulaciones bruscamente al final del movimiento. Mantén el abdomen activo para proteger la zona lumbar.
                      </p>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setIsGuideModalOpen(false)}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Batch List Importer Modal (Text to Exercises via IA + Cache) */}
      <AnimatePresence>
        {isBatchModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-white dark:bg-[#0e101a] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-wider block">
                      Importar Lista con IA
                    </span>
                    <h3 className="text-xs font-black text-gray-900 dark:text-white">
                      Pegar Lista de Ejercicios
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsBatchModalOpen(false);
                    setBatchProcessingStatus(null);
                  }}
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer border-none"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3 overflow-y-auto no-scrollbar flex-1 text-left">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Pega o escribe tu lista de ejercicios (uno por línea). El sistema buscará primero en tu biblioteca personal y analizará solo los nuevos con IA, guardándolos en tu cuenta.
                </p>

                <textarea
                  rows={7}
                  value={batchInputText}
                  onChange={(e) => setBatchInputText(e.target.value)}
                  placeholder={`Ejemplo:\nPress de banca 4x10 con 60kg\nSentadilla búlgara 3x12 14kg\nPlancha abdominal 3x45s\nDominadas pronas 4x8\nElevaciones laterales 4x15 8kg`}
                  className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-2xl p-3 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono"
                  autoFocus
                />

                {batchProcessingStatus && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                    <span>{batchProcessingStatus}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.01] flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBatchModalOpen(false);
                    setBatchProcessingStatus(null);
                  }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!batchInputText.trim() || isProcessingBatch}
                  onClick={() => handleImportBatch(batchInputText)}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {isProcessingBatch ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Procesar y Agregar</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Workout Completed Celebration Modal */}
      <AnimatePresence>
        {completedWorkoutSummary && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-[#0c0d14] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden text-center p-6 text-gray-900 dark:text-white"
            >
              {/* Badge Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Award className="h-8 w-8 text-white animate-bounce" />
              </div>

              <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest block mb-1">
                ¡Objetivo Cumplido!
              </span>
              <h3 className="text-lg font-black tracking-tight mb-1 text-gray-900 dark:text-white">
                ¡Entrenamiento Finalizado!
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-5">
                {completedWorkoutSummary.name}
              </p>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800/80 rounded-2xl p-3">
                  <div className="flex items-center justify-center text-blue-500 mb-1">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span className="block text-sm font-black font-mono text-gray-900 dark:text-white">
                    {completedWorkoutSummary.durationMinutes}m
                  </span>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase">
                    Tiempo
                  </span>
                </div>

                <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800/80 rounded-2xl p-3">
                  <div className="flex items-center justify-center text-orange-500 mb-1">
                    <Flame className="h-4 w-4" />
                  </div>
                  <span className="block text-sm font-black font-mono text-orange-500">
                    ~{completedWorkoutSummary.totalCalories}
                  </span>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase">
                    Kcal
                  </span>
                </div>

                <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800/80 rounded-2xl p-3">
                  <div className="flex items-center justify-center text-emerald-500 mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="block text-sm font-black font-mono text-emerald-500">
                    {completedWorkoutSummary.completedSetsCount}
                  </span>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase">
                    Series
                  </span>
                </div>
              </div>

              {/* Motivational note */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 mb-5 text-left flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-600 dark:text-emerald-300 font-medium leading-relaxed">
                  ¡Gran trabajo manteniendo la constancia! Cada sesión suma para alcanzar tu mejor versión física.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCompletedWorkoutSummary(null)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black transition cursor-pointer shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5"
              >
                <span>¡Genial, a descansar!</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Workouts Onboarding & Preferences Dedicated Wizard */}
      <WorkoutsOnboarding
        apiKey={apiKey}
        userProfile={userProfile}
        isOpen={isWorkoutsOnboardingOpen}
        onClose={() => setIsWorkoutsOnboardingOpen(false)}
        onComplete={handleCompleteWorkoutsOnboarding}
      />
    </div>
  );
}
