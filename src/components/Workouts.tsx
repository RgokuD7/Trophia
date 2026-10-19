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
  TrainingEnvironment, ExperienceLevel, CustomExercise, ExerciseTrackingType 
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
import { SPORTS_METS, getLocalDateString } from "../utils/fitnessUtils";

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
  const [activeTab, setActiveTab] = useState<"routine" | "recovery" | "timer" | "library">("routine");
  const [selectedDay, setSelectedDay] = useState<string>(getLocalDateString());
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);

  const todayStr = getLocalDateString();

  // Sports logging states
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [selectedSportKey, setSelectedSportKey] = useState("soccer");
  const [sportDuration, setSportDuration] = useState<number | "">(45);
  const [customSportNameInput, setCustomSportNameInput] = useState("");

  const handleLogSport = () => {
    const duration = Number(sportDuration);
    if (!duration || duration <= 0) return;

    const sportInfo = SPORTS_METS[selectedSportKey];
    const name = selectedSportKey === "other" && customSportNameInput.trim() !== ""
      ? customSportNameInput.trim()
      : sportInfo.label;

    // METs * 0.0175 * weight * duration
    const caloriesBurned = Math.round(sportInfo.met * 0.0175 * userProfile.weight * duration);

    const newSportLog = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      durationMinutes: duration,
      caloriesBurned,
      date: todayStr
    };

    const currentSports = userProfile.loggedSportsToday || [];
    onUpdateProfile({
      ...userProfile,
      loggedSportsToday: [...currentSports, newSportLog]
    });

    // Reset and close
    setIsSportModalOpen(false);
    setSportDuration(45);
    setCustomSportNameInput("");
    setSelectedSportKey("soccer");
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Phase 3 States
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [exerciseForAlternatives, setExerciseForAlternatives] = useState<WorkoutExercise | null>(null);
  const [alternativesList, setAlternativesList] = useState<any[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

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

  // Library tab filter states
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState("all");

  // Biomechanical Technique Guide State (Gemini + Local DB, zero MuscleWiki dependency)
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedGuideExercise, setSelectedGuideExercise] = useState<ExerciseGuideViewData | null>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);

  // Initial / Reconfiguration Workout Questionnaire State
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupEnvironment, setSetupEnvironment] = useState<TrainingEnvironment>(userProfile.environment || "gym");
  const [setupEquipment, setSetupEquipment] = useState<string[]>(
    userProfile.equipment && userProfile.equipment.length > 0 ? userProfile.equipment : ["Peso corporal"]
  );
  const [setupLevel, setSetupLevel] = useState<ExperienceLevel>(userProfile.level || "intermediate");
  const [setupJointPain, setSetupJointPain] = useState<("knee" | "back" | "shoulder")[]>(userProfile.jointPainAreas || []);
  const [setupDays, setSetupDays] = useState<number>(userProfile.weeklyTrainingDays || 4);

  // Auto-prompt initial setup questionnaire if no equipment has ever been selected
  useEffect(() => {
    if (!userProfile.equipment || userProfile.equipment.length === 0) {
      setIsSetupModalOpen(true);
    }
  }, []);

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

  const handleSavePreferencesAndGenerate = async () => {
    const updatedProfile: UserProfile = {
      ...userProfile,
      environment: setupEnvironment,
      equipment: setupEquipment.length > 0 ? setupEquipment : ["Peso corporal"],
      level: setupLevel,
      jointPainAreas: setupJointPain,
      weeklyTrainingDays: setupDays
    };

    onUpdateProfile(updatedProfile);
    setIsSetupModalOpen(false);

    // Auto-generate routine with these updated preferences
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const data = await generateRoutineByIA(apiKey || "", {
        goal: updatedProfile.goal,
        level: updatedProfile.level,
        environment: updatedProfile.environment,
        equipment: updatedProfile.equipment,
        jointPainAreas: updatedProfile.jointPainAreas,
        requiresMedicalClearance: updatedProfile.requiresMedicalClearance
      });

      if (data) {
        const newSession: WorkoutSession = {
          id: Math.random().toString(36).substr(2, 9),
          date: selectedDay,
          name: data.name || "Sesión de Entrenamiento",
          warmup: data.warmup || ["Movilidad articular general - 5 min"],
          cooldown: data.cooldown || ["Estiramiento general completo - 5 min"],
          exercises: (data.exercises || []).map((ex: any, idx: number) => ({
            id: `ex-${idx}`,
            name: ex.name,
            sets: ex.sets || 3,
            reps: ex.reps || 12,
            weight: ex.weight || 0,
            caloriesBurnedPerSet: ex.caloriesBurnedPerSet || 5,
            completedSets: Array.from({ length: ex.sets || 3 }).map((_, sIdx) => ({
              setIndex: sIdx,
              completed: false,
              reps: ex.reps || 12,
              weight: ex.weight || 0
            }))
          })),
          completed: false,
          durationMinutes: 45
        };

        onAddWorkout(newSession);
        setActiveSession(newSession);
      }
    } catch (err: any) {
      console.error("Error generating routine:", err);
      setGenerationError(err?.message || "No se pudo conectar con el creador de rutinas.");
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

  // Generate Routine with Gemini
  const handleGenerateRoutine = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const data = await generateRoutineByIA(apiKey || "", {
        goal: userProfile.goal,
        level: userProfile.level,
        environment: userProfile.environment,
        equipment: userProfile.equipment,
        jointPainAreas: userProfile.jointPainAreas,
        requiresMedicalClearance: userProfile.requiresMedicalClearance
      });
      if (data) {
        // Construct the local routine session
        const newSession: WorkoutSession = {
          id: Math.random().toString(36).substr(2, 9),
          date: selectedDay,
          name: data.name || "Sesión de Entrenamiento",
          warmup: data.warmup || ["Movilidad articular general - 5 min"],
          cooldown: data.cooldown || ["Estiramiento general completo - 5 min"],
          exercises: (data.exercises || []).map((ex: any, idx: number) => ({
            id: `ex-${idx}`,
            name: ex.name,
            sets: ex.sets || 3,
            reps: ex.reps || 12,
            weight: ex.weight || 0,
            caloriesBurnedPerSet: ex.caloriesBurnedPerSet || 5,
            completedSets: Array.from({ length: ex.sets || 3 }).map((_, sIdx) => ({
              setIndex: sIdx,
              completed: false,
              reps: ex.reps || 12,
              weight: ex.weight || 0
            }))
          })),
          completed: false,
          durationMinutes: 45
        };

        onAddWorkout(newSession);
        setActiveSession(newSession);
      } else {
        setGenerationError(data.error || "No se pudo conectar con el creador de rutinas.");
      }
    } catch (err: any) {
      // Fallback local generated template if offline or server fails
      const fallbackSession: WorkoutSession = {
        id: Math.random().toString(36).substr(2, 9),
        date: selectedDay,
        name: `Rutina Fullbody (${userProfile.environment === "gym" ? "Gym" : "Casa"})`,
        warmup: ["Estiramientos de movilidad general - 5 min", "Salto de cuerda o sombra suave - 3 min"],
        exercises: [
          {
            id: "ex-0",
            name: userProfile.environment === "gym" ? "Prensa de Piernas o Sentadillas" : "Sentadillas con peso corporal",
            sets: 4,
            reps: 15,
            weight: userProfile.environment === "gym" ? 40 : 0,
            caloriesBurnedPerSet: 6,
            completedSets: [
              { setIndex: 0, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 1, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 2, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 3, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 }
            ]
          },
          {
            id: "ex-1",
            name: userProfile.environment === "gym" ? "Press de Banca con Mancuernas" : "Flexiones de pecho (Push-ups)",
            sets: 3,
            reps: 12,
            weight: userProfile.environment === "gym" ? 14 : 0,
            caloriesBurnedPerSet: 5,
            completedSets: [
              { setIndex: 0, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 },
              { setIndex: 1, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 },
              { setIndex: 2, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 }
            ]
          }
        ],
        cooldown: ["Estiramientos de cuádriceps y pecho - 5 min"],
        completed: false,
        durationMinutes: 40
      };

      onAddWorkout(fallbackSession);
      setActiveSession(fallbackSession);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDefaultOffline = () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const fallbackSession: WorkoutSession = {
        id: Math.random().toString(36).substr(2, 9),
        date: selectedDay,
        name: `Rutina Fullbody (${userProfile.environment === "gym" ? "Gimnasio" : "Casa"})`,
        warmup: ["Estiramientos de movilidad general - 5 min", "Salto de cuerda o sombra suave - 3 min"],
        exercises: [
          {
            id: "ex-0",
            name: userProfile.environment === "gym" ? "Prensa de Piernas o Sentadillas" : "Sentadillas con peso corporal",
            sets: 4,
            reps: 15,
            weight: userProfile.environment === "gym" ? 40 : 0,
            caloriesBurnedPerSet: 6,
            completedSets: [
              { setIndex: 0, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 1, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 2, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 3, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 }
            ]
          },
          {
            id: "ex-1",
            name: userProfile.environment === "gym" ? "Press de Banca con Mancuernas" : "Flexiones de pecho (Push-ups)",
            sets: 3,
            reps: 12,
            weight: userProfile.environment === "gym" ? 14 : 0,
            caloriesBurnedPerSet: 5,
            completedSets: [
              { setIndex: 0, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 },
              { setIndex: 1, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 },
              { setIndex: 2, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 }
            ]
          }
        ],
        cooldown: ["Estiramientos de cuádriceps y pecho - 5 min"],
        completed: false,
        durationMinutes: 40
      };

      onAddWorkout(fallbackSession);
      setActiveSession(fallbackSession);
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

    const updatedSession = { ...activeSession, completed: true };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
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

  const handleOpenAlternatives = async (exercise: WorkoutExercise) => {
    setExerciseForAlternatives(exercise);
    setLoadingAlternatives(true);
    setAlternativesList([]);
    try {
      const data = await suggestAlternativeExercisesByIA(
        apiKey || "",
        exercise.name,
        userProfile.equipment,
        userProfile.level
      );
      if (data && data.alternatives) {
        setAlternativesList(data.alternatives);
      } else {
        setAlternativesList([]);
      }
    } catch (err) {
      console.error("Error fetching alternatives", err);
      setAlternativesList([]);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleReplaceExercise = (alternative: any) => {
    if (!activeSession || !exerciseForAlternatives) return;

    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id === exerciseForAlternatives.id) {
        return {
          ...ex,
          name: alternative.name,
          completedSets: Array.from({ length: ex.sets }).map((_, sIdx) => ({
            setIndex: sIdx,
            completed: false,
            reps: ex.reps,
            weight: ex.weight
          }))
        };
      }
      return ex;
    });

    const updatedSession = { ...activeSession, exercises: updatedExercises };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
    setExerciseForAlternatives(null);
    setAlternativesList([]);
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
              onClick={() => setIsSetupModalOpen(true)}
              className="py-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-[10px] font-extrabold transition flex items-center gap-1 cursor-pointer border border-gray-200 dark:border-white/10"
              title="Configurar lugar, equipamiento y lesiones"
            >
              <SlidersHorizontal className="h-3 w-3 text-emerald-400" />
              <span>Preferencias</span>
            </button>
            <button
              onClick={() => setIsSportModalOpen(true)}
              className="py-1.5 px-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-extrabold transition flex items-center gap-1 cursor-pointer shadow-lg shadow-orange-500/10 border-none"
            >
              <Activity className="h-3 w-3" />
              <span>Deporte</span>
            </button>
          </div>
        </div>

        <div className="flex gap-4 mt-3 border-b border-gray-200 dark:border-gray-800/20">
          <button
            onClick={() => setActiveTab("routine")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "routine" ? "border-emerald-500 text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            Sesión Diaria
          </button>
          <button
            onClick={() => setActiveTab("recovery")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "recovery" ? "border-emerald-500 text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            Recuperación Muscular
          </button>
          <button
            onClick={() => setActiveTab("timer")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1 ${
              activeTab === "timer" ? "border-emerald-500 text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            <Timer className="h-3.5 w-3.5" />
            Temporizadores
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1 ${
              activeTab === "library" ? "border-emerald-500 text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Biblioteca ({customExercises.length + DEFAULT_EXERCISES.length})
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
                      <div className="flex gap-1 mt-1.5">
                        {hasSession && (
                          <div className={`w-1.5 h-1.5 rounded-full ${completedSession ? "bg-emerald-300" : "bg-amber-400"}`} />
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
                        {day.isCurrentMonth && hasSession && (
                          <div className="absolute bottom-1 flex gap-0.5 justify-center">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              completedSession 
                                ? isSelected ? "bg-white" : "bg-emerald-500" 
                                : isSelected ? "bg-white" : "bg-amber-500"
                            }`} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-4 justify-center text-[9px] font-bold text-gray-450 dark:text-gray-550 pt-1.5 border-t border-gray-100 dark:border-gray-800/20 font-mono">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Sesión Completada</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Sesión Pendiente / Creada</span>
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
            
            {!activeSession ? (
              <div className="space-y-4">
                {/* Active Rest Suggestions Card */}
                <div className="bg-white dark:bg-[#12131d]/60 border border-gray-200 dark:border-gray-800/80 p-4.5 rounded-2xl space-y-3 shadow-md text-left">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">Recomendación de Descanso Activo</span>
                  <p className="text-xs text-gray-755 dark:text-gray-300 leading-relaxed font-medium">
                    {userProfile.goal === "lose_weight" 
                      ? "🚶 Caminata ligera de 30-45 minutos. Ideal para mantener un gasto calórico bajo control sin fatigar tu sistema muscular y articular."
                      : userProfile.goal === "gain_muscle"
                        ? "🧘 15 minutos de elongaciones estáticas completas. Enfocado en descomprimir articulaciones y acelerar el flujo de recuperación de fibras musculares."
                        : "🏃 Paseo recreativo o movilidad suave de 20 minutos. Ayuda a lubricar las articulaciones y reducir la rigidez acumulada."}
                  </p>
                  <span className="block text-[9px] text-gray-400 dark:text-gray-500 italic leading-none">
                    💡 Aprovechar hoy para descansar permitirá que tus fibras musculares se reparen más fuerte.
                  </span>
                </div>

                <div className="bg-white dark:bg-[#12131d] border border-gray-250 dark:border-gray-800 border-dashed rounded-2xl p-6 text-center space-y-4 shadow-sm dark:shadow-none">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">¿Entrenamos hoy?</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    Rutina inteligente adaptada a tu equipamiento y restricciones articulares.
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full text-[10px] text-gray-600 dark:text-gray-300">
                    <Dumbbell className="h-3 w-3 text-emerald-400" />
                    <span className="font-bold truncate max-w-[180px]">{userProfile.equipment && userProfile.equipment.length > 0 ? userProfile.equipment.join(", ") : "Peso corporal"}</span>
                    <button
                      onClick={() => setIsSetupModalOpen(true)}
                      className="ml-1 text-emerald-400 font-black hover:underline cursor-pointer bg-transparent border-none"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={handleGenerateRoutine}
                    disabled={isGenerating}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 active:scale-98 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Formulando rutina óptima...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Generar Rutina Personalizada por IA</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={handleStartManualSession}
                      className="py-2.5 px-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-gray-200 dark:border-white/10"
                    >
                      <Plus className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Crear Sesión Propia</span>
                    </button>
                    <button
                      onClick={() => {
                        handleStartManualSession();
                        setIsBatchModalOpen(true);
                      }}
                      className="py-2.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-blue-500/20"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      <span>Pegar Lista con IA</span>
                    </button>
                  </div>
                  
                  {generationError && (() => {
                    const errorStr = String(generationError);
                    const isHighDemand = 
                      errorStr.includes("503") || 
                      errorStr.toLowerCase().includes("high demand") || 
                      errorStr.toLowerCase().includes("unavailable") || 
                      errorStr.toLowerCase().includes("spikes in demand") || 
                      errorStr.toLowerCase().includes("try again later");

                    return (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl space-y-3 mt-1 text-left w-full">
                        <div className="flex gap-2.5 items-start">
                          <Info className="h-4.5 w-4.5 text-rose-400 flex-shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="block text-xs font-bold text-rose-200">
                              {isHighDemand ? "Saturación del Servidor de Rutinas (503)" : "Error al Generar Rutina"}
                            </span>
                            <span className="block text-[10px] text-gray-500 dark:text-white/50 leading-relaxed">
                              {isHighDemand 
                                ? "El motor de IA está experimentando alta demanda en este momento. ¡Puedes intentar de nuevo en un momento o usar una excelente plantilla sin conexión!" 
                                : generationError}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-white/5">
                          <button
                            type="button"
                            onClick={handleGenerateRoutine}
                            className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border border-gray-200 dark:border-transparent transition cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Reintentar con IA
                          </button>
                          <button
                            type="button"
                            onClick={handleGenerateDefaultOffline}
                            className="flex-1 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Dumbbell className="h-3 w-3" />
                            Rutina sin Conexión
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
              /* Session active display */
              <div className="space-y-4">
                
                {/* Session title bar */}
                <div className="bg-white dark:bg-[#161824] p-4 rounded-xl border border-gray-250 dark:border-gray-800 flex justify-between items-center shadow-md">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Plan del día</span>
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">{activeSession.name}</h3>
                  </div>
                  {activeSession.completed ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 py-1 px-2.5 rounded-full border border-emerald-500/20">
                      <Check className="h-3.5 w-3.5" />
                      <span>Completado</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleMarkSessionComplete}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition cursor-pointer"
                    >
                      Terminar
                    </button>
                  )}
                </div>

                {/* Warm up block */}
                <div className="bg-white dark:bg-[#12131d] p-3 rounded-xl border border-gray-200 dark:border-gray-800/60 space-y-2">
                  <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">1. Calentamiento (Movilidad)</span>
                  <ul className="space-y-1 text-xs text-gray-750 dark:text-gray-300">
                    {activeSession.warmup.map((w, idx) => (
                      <li key={idx} className="flex gap-1.5 items-start">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Exercises Tracker Block */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-gray-550 dark:text-gray-400 uppercase tracking-wide">2. Rutina Central (Ejercicios)</span>
                  
                  {activeSession.exercises.map((ex) => {
                    const allCompleted = ex.completedSets.every(s => s.completed);
                    const isTimeTracking = ex.trackingType === "time";

                    return (
                      <div 
                        key={ex.id}
                        className={`bg-white dark:bg-[#161824] rounded-2xl border p-4 space-y-3 shadow-md transition ${
                          allCompleted ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-[#161824]/40" : "border-gray-200 dark:border-gray-800"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleFavorite(ex.name)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                (userProfile.favoriteExercises || []).includes(ex.name)
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                                  : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400 hover:text-amber-500"
                              }`}
                              title="Marcar como favorito"
                            >
                              <Star className={`h-4 w-4 ${(userProfile.favoriteExercises || []).includes(ex.name) ? "fill-current" : ""}`} />
                            </button>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-black text-gray-900 dark:text-white">
                                  {ex.name}
                                </h4>
                                {(userProfile.favoriteExercises || []).includes(ex.name) && (
                                  <span className="text-[9px] bg-amber-500/10 text-amber-500 font-black px-1.5 py-0.5 rounded-md border border-amber-500/20 font-mono">FAV</span>
                                )}
                                {ex.primaryMuscles && ex.primaryMuscles.length > 0 && (
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/20 font-mono">
                                    🎯 {ex.primaryMuscles[0]}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">
                                  {ex.sets} series × {ex.reps} {isTimeTracking ? "seg" : "reps"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleTrackingType(ex.id)}
                                  className="text-[9px] font-bold text-gray-500 hover:text-emerald-400 bg-gray-100 dark:bg-white/5 hover:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 transition cursor-pointer"
                                  title="Alternar entre Repeticiones y Segundos de duración"
                                >
                                  {isTimeTracking ? "⏱️ Tiempo" : "🔄 Reps"}
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Low calorie expenditure estimate & Alternatives button */}
                          <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                            <div>
                              <span className="text-xs font-bold text-amber-500 flex items-center justify-end gap-1">
                                <Flame className="h-3.5 w-3.5" />
                                <span>~{ex.sets * ex.caloriesBurnedPerSet} kcal</span>
                              </span>
                              <span className="text-[9px] text-gray-450 dark:text-gray-500 block">(Gasto conservador)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenTechniqueGuide(ex)}
                                className="text-[9px] font-black text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/20 flex items-center gap-1 transition cursor-pointer"
                                title="Ver biomecánica y técnica del ejercicio"
                              >
                                <Sparkles className="h-2.5 w-2.5" />
                                <span>Técnica</span>
                              </button>
                              <button
                                onClick={() => handleOpenAlternatives(ex)}
                                className="text-[9px] font-black text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1 transition cursor-pointer"
                              >
                                <RefreshCw className="h-2.5 w-2.5" />
                                <span>Alternativas</span>
                              </button>
                            </div>
                          </div>
                        </div>
                          
                        {/* Series table for Progressive Overload adjustments */}
                        <div className="space-y-2 border-t border-gray-250 dark:border-gray-800/40 pt-2.5">
                          {ex.completedSets.map((set) => (
                            <div 
                              key={set.setIndex}
                              className="flex items-center justify-between text-xs py-1"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-gray-450 dark:text-gray-500 font-bold">SET {set.setIndex + 1}</span>
                                
                                {/* Edit Reps / Seconds */}
                                <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-0.5">
                                  <input
                                    type="number"
                                    value={set.reps}
                                    onChange={(e) => handleUpdateSetWeightOrReps(ex.id, set.setIndex, set.weight, Math.max(1, Number(e.target.value) || set.reps))}
                                    className="w-10 text-center text-xs bg-transparent text-gray-900 dark:text-white focus:outline-none"
                                  />
                                  <span className="text-[9px] text-gray-400 dark:text-gray-500">{isTimeTracking ? "seg" : "rep"}</span>
                                </div>

                                {/* Edit Weight */}
                                <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-0.5">
                                  <input
                                    type="number"
                                    value={set.weight}
                                    onChange={(e) => handleUpdateSetWeightOrReps(ex.id, set.setIndex, Math.max(0, Number(e.target.value) || 0), set.reps)}
                                    className="w-10 text-center text-xs bg-transparent text-gray-900 dark:text-white focus:outline-none"
                                  />
                                  <span className="text-[9px] text-gray-400 dark:text-gray-500">kg</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleToggleSet(ex.id, set.setIndex)}
                                className={`w-6 h-6 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                                  set.completed
                                    ? "bg-emerald-500 border-emerald-400 text-white"
                                    : "bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-450 dark:text-gray-600 hover:text-gray-800 dark:hover:text-white"
                                }`}
                              >
                                {set.completed ? <Check className="h-3.5 w-3.5" /> : <Play className="h-2.5 w-2.5 fill-current" />}
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
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="h-3 w-3 text-emerald-400" />
                              <span>Serie</span>
                            </button>
                            {ex.completedSets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSet(ex.id)}
                                className="px-2 py-1 bg-gray-100 hover:bg-rose-500/10 dark:bg-white/5 dark:hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 font-bold rounded-lg transition cursor-pointer"
                                title="Eliminar última serie"
                              >
                                - Serie
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(ex.id)}
                            className="p-1 text-gray-400 hover:text-rose-400 transition cursor-pointer"
                            title="Eliminar este ejercicio de la sesión"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Exercise & Batch Importer Bar */}
                  <div className="pt-1 space-y-3">
                    {!isAddExerciseOpen ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddExerciseOpen(true)}
                          className="py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          <span>+ Agregar Ejercicio</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBatchModalOpen(true)}
                          className="py-2.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ClipboardList className="h-4 w-4" />
                          <span>📋 Pegar Lista con IA</span>
                        </button>
                      </div>
                    ) : (
                      /* Inline Add Exercise Card with Autocomplete & Defaults */
                      <div className="bg-white dark:bg-[#161824] p-4 rounded-2xl border border-emerald-500/30 space-y-3 shadow-lg text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            Nuevo Ejercicio (Biblioteca o IA)
                          </span>
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
        </div>     )}
        {activeTab === "timer" && (
        <div className="px-6 py-5 space-y-6 text-center flex flex-col justify-center items-center">
          
          {/* Timer Mode Toggle */}
          <div className="flex bg-white dark:bg-[#161824] p-1 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-xs shadow-sm dark:shadow-none">
            <button
              onClick={() => { setTimerType("rest"); handleResetTimer(); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                timerType === "rest" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Descanso entre Series
            </button>
            <button
              onClick={() => { setTimerType("hiit"); handleResetTimer(); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                timerType === "hiit" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Intervalos HIIT
            </button>
          </div>

          {/* Large countdown visual ring */}
          <div className="relative w-56 h-56 flex items-center justify-center">
            
            {/* SVG circle stroke */}
            <svg className="absolute inset-0 w-full h-full">
              <circle
                cx="112"
                cy="112"
                r="100"
                className="stroke-gray-200 dark:stroke-gray-800"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="112"
                cy="112"
                r="100"
                className={timerType === "hiit" && hiitCycle === "rest" ? "stroke-blue-400" : "stroke-emerald-400"}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 100}
                strokeDashoffset={
                  2 * Math.PI * 100 * (1 - timeRemaining / (timerType === "rest" ? 60 : hiitCycle === "work" ? 30 : 15))
                }
              />
            </svg>

            {/* Counter display */}
            <div className="z-10 text-center">
              {timerType === "hiit" && (
                <span className={`block text-[11px] font-bold uppercase tracking-wider ${
                  hiitCycle === "work" ? "text-emerald-500 dark:text-emerald-400" : "text-blue-500 dark:text-blue-400"
                }`}>
                  {hiitCycle === "work" ? `💪 ¡TRABAJA! (Ronda ${hiitRound})` : "🔋 Descanso activo"}
                </span>
              )}
              {timerType === "rest" && (
                <span className="block text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">Descansando</span>
              )}

              <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter mt-1 block">
                {timeRemaining}
                <span className="text-lg font-bold ml-0.5">s</span>
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
                  className="bg-white dark:bg-[#161824] hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-250 dark:border-gray-800 px-4 py-1.5 rounded-lg text-xs text-gray-900 dark:text-white transition active:scale-95 cursor-pointer shadow-sm dark:shadow-none"
                >
                  {preset}s
                </button>
              ))}
            </div>
          )}

          {/* Core controls */}
          <div className="flex gap-4 w-full max-w-xs">
            {isTimerRunning ? (
              <button
                onClick={handlePauseTimer}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-1 shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer"
              >
                <Pause className="h-4 w-4" />
                <span>Pausar</span>
              </button>
            ) : (
              <button
                onClick={() => setIsTimerRunning(true)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 active:scale-95 cursor-pointer"
              >
                <Play className="h-4 w-4" />
                <span>Iniciar</span>
              </button>
            )}

            <button
              onClick={handleResetTimer}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-3 px-4 rounded-xl border border-gray-250 dark:border-transparent transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Alternatives Modal */}
          <AnimatePresence>
            {exerciseForAlternatives && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white dark:bg-[#12131d] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Alternativas Inteligentes</span>
                      <h3 className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">
                        Reemplazar "{exerciseForAlternatives.name}"
                      </h3>
                    </div>
                    <button
                      onClick={() => { setExerciseForAlternatives(null); setAlternativesList([]); }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition cursor-pointer text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {loadingAlternatives ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">Consultando a Gemini por sustitutos...</span>
                    </div>
                  ) : alternativesList.length > 0 ? (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                        Sugerencias personalizadas para tu nivel (<b>{userProfile.level}</b>) y equipamiento (<b>{userProfile.equipment.join(", ") || "Peso Corporal"}</b>):
                      </p>
                      
                      {alternativesList.map((alt, idx) => (
                        <div 
                          key={idx}
                          className="bg-gray-50 dark:bg-[#161824] border border-gray-200 dark:border-gray-800 p-3.5 rounded-2xl space-y-2.5 hover:border-emerald-500/30 transition-all shadow-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-black text-gray-900 dark:text-white">{alt.name}</h4>
                              <span className="text-[9px] text-gray-450 dark:text-gray-500 font-bold block mt-0.5 font-mono">
                                Equipamiento: {alt.equipmentNeeded}
                              </span>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border font-mono ${
                              alt.difficulty === "Fácil" 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                : alt.difficulty === "Medio" 
                                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                                  : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                            }`}>
                              {alt.difficulty}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="block text-[10px] text-gray-650 dark:text-gray-300 font-medium">
                              {alt.justification}
                            </span>
                            <span className="block text-[9px] text-emerald-500 dark:text-emerald-400 font-bold font-mono">
                              {alt.repsText}
                            </span>
                          </div>

                          <button
                            onClick={() => handleReplaceExercise(alt)}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black py-2 rounded-xl transition flex items-center justify-center gap-1 active:scale-98 shadow-sm cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            <span>Seleccionar y Reemplazar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-xs text-rose-450 dark:text-rose-400 font-bold">No se pudieron obtener alternativas</p>
                      <button
                        onClick={() => handleOpenAlternatives(exerciseForAlternatives)}
                        className="mx-auto text-[10px] font-bold text-gray-600 dark:text-gray-400 underline cursor-pointer"
                      >
                        Reintentar búsqueda
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* 4. Tab Biblioteca de Ejercicios */}
      {activeTab === "library" && (
        <div className="px-6 py-5 space-y-4 text-left flex-1 flex flex-col">
          {/* Header & Stats */}
          <div className="bg-white dark:bg-[#161824] p-4.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  Base de Datos & Catálogo Anatómico
                </span>
                <h3 className="text-sm font-black text-gray-900 dark:text-white mt-0.5">
                  Biblioteca de Ejercicios Inteligente
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {customExercises.length} ejercicios personalizados en tu cuenta y {DEFAULT_EXERCISES.length} ejercicios base. Cada ejercicio analizado con IA se guarda aquí automáticamente para no consumir más tokens.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("routine");
                  setIsAddExerciseOpen(true);
                }}
                className="self-start sm:self-center px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Nuevo Ejercicio</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                placeholder="Buscar por nombre o músculo (ej: pectoral, sentadilla, bíceps)..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Muscle Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {[
                { id: "all", label: "Todos" },
                { id: "pecho", label: "Pecho" },
                { id: "espalda", label: "Espalda" },
                { id: "pierna", label: "Piernas" },
                { id: "hombro", label: "Hombros" },
                { id: "biceps", label: "Bíceps" },
                { id: "triceps", label: "Tríceps" },
                { id: "core", label: "Core / Abdomen" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLibraryMuscleFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer ${
                    libraryMuscleFilter === f.id
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exercises List */}
          <div className="space-y-2.5">
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
                  <div className="py-12 text-center space-y-2 bg-white dark:bg-[#161824] rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    <p className="text-xs text-gray-400 font-bold">No se encontraron ejercicios con ese filtro.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setLibrarySearchQuery("");
                        setLibraryMuscleFilter("all");
                      }}
                      className="text-xs text-emerald-400 font-bold hover:underline"
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
                    className="bg-white dark:bg-[#161824] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2 hover:border-emerald-500/30 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-gray-900 dark:text-white">
                            {item.name}
                          </h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                              isCustom
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {isCustom ? "★ Tu BBDD" : "Catálogo Base"}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400">
                            {isTimeTracking ? "⏱️ Tiempo" : "🔄 Reps"}
                          </span>
                        </div>

                        {/* Muscle Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {item.primaryMuscles?.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded"
                            >
                              🎯 {m}
                            </span>
                          ))}
                          {item.equipmentNeeded && (
                            <span className="text-[9px] text-gray-400 font-medium">
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
                            setActiveTab("routine");
                          }}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm shadow-emerald-500/10"
                          title="Añadir a la sesión de hoy"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Añadir a hoy</span>
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

                    {item.techniqueTips && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800/40 pt-1.5">
                        💡 {item.techniqueTips}
                      </p>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

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
                <h3 className="text-sm font-black tracking-tight uppercase">Registrar Actividad</h3>
              </div>
              <button 
                onClick={() => setIsSportModalOpen(false)}
                className="p-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-gray-400 hover:text-gray-655 dark:hover:text-white transition cursor-pointer border-none"
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

              {/* Duration Input */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duración (minutos)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={sportDuration}
                    onChange={(e) => setSportDuration(e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))}
                    className="w-full p-2.5 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:border-orange-500/50 transition"
                  />
                </div>
              </div>

              {/* Estimation Preview */}
              {Number(sportDuration) > 0 && (
                <div className="bg-orange-500/5 border border-orange-500/10 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] text-gray-555 dark:text-gray-400 font-bold uppercase">Calorías estimadas quemadas:</span>
                  <span className="text-xs font-black text-orange-500 font-mono">
                    -{Math.round(SPORTS_METS[selectedSportKey].met * 0.0175 * userProfile.weight * Number(sportDuration))} kcal
                  </span>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50 dark:bg-black/20 flex gap-3">
              <button
                type="button"
                onClick={() => setIsSportModalOpen(false)}
                className="flex-1 py-2 border border-gray-200 dark:border-gray-800 text-gray-550 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogSport}
                disabled={!sportDuration}
                className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-200 dark:disabled:bg-white/5 disabled:text-gray-400 dark:disabled:text-white/30 text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-orange-500/10"
              >
                Guardar registro
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
                          ? "⚡ Desde tu Biblioteca Guardada (0 latencia)"
                          : "✨ Analizado con IA Gemini (Guardado en BD)"}
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
                  Pega o escribe tu lista de ejercicios (uno por línea). El sistema buscará primero en tu biblioteca personal (0 tokens y 0 latencia), y analizará con Gemini solo los nuevos, guardándolos en tu cuenta.
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

      {/* 2. Setup / Reconfiguration Questionnaire Modal */}
      <AnimatePresence>
        {isSetupModalOpen && (
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
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">Personalización</span>
                    <h3 className="text-xs font-black text-gray-900 dark:text-white">
                      Equipamiento y Preferencias de Rutina
                    </h3>
                  </div>
                </div>
                {userProfile.equipment && userProfile.equipment.length > 0 && (
                  <button
                    onClick={() => setIsSetupModalOpen(false)}
                    className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer border-none"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Questions Body */}
              <div className="p-5 overflow-y-auto space-y-5 no-scrollbar flex-1 text-left">
                {/* 1. Entorno */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-900 dark:text-white block">
                    1. ¿Dónde entrenas principalmente?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "gym" as TrainingEnvironment, label: "Gimnasio", emoji: "🏢" },
                      { id: "home" as TrainingEnvironment, label: "Casa", emoji: "🏠" },
                      { id: "outdoor" as TrainingEnvironment, label: "Aire libre", emoji: "🌳" }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSetupEnvironment(item.id)}
                        className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                          setupEnvironment === item.id
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-500 dark:text-emerald-400 font-black shadow-sm"
                            : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-semibold"
                        }`}
                      >
                        <span className="text-xl block mb-1">{item.emoji}</span>
                        <span className="text-[11px] block">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Equipamiento disponible */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs font-black text-gray-900 dark:text-white block">
                      2. ¿Qué equipamiento tienes a mano?
                    </label>
                    <span className="text-[9px] text-gray-400 font-bold">Selecciona varios</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "Mancuernas", label: "Mancuernas", emoji: "🏋️" },
                      { id: "Barra con discos", label: "Barra con discos", emoji: "⚡" },
                      { id: "Banco de pesas", label: "Banco de pesas", emoji: "🛋️" },
                      { id: "Máquinas / Poleas", label: "Máquinas / Poleas", emoji: "🏗️" },
                      { id: "Bandas elásticas", label: "Bandas elásticas", emoji: "🎗️" },
                      { id: "Barra de dominadas", label: "Barra dominadas", emoji: "🪜" },
                      { id: "Peso corporal", label: "Solo peso corporal", emoji: "🧘" }
                    ].map((eq) => {
                      const isSelected = setupEquipment.includes(eq.id);
                      return (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => {
                            if (eq.id === "Peso corporal") {
                              setSetupEquipment(["Peso corporal"]);
                            } else {
                              const withoutBodyweight = setupEquipment.filter(x => x !== "Peso corporal");
                              if (isSelected) {
                                const next = withoutBodyweight.filter(x => x !== eq.id);
                                setSetupEquipment(next.length > 0 ? next : ["Peso corporal"]);
                              } else {
                                setSetupEquipment([...withoutBodyweight, eq.id]);
                              }
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500/15 border-emerald-500 text-emerald-500 dark:text-emerald-400 font-black shadow-sm"
                              : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                          }`}
                        >
                          <span className="text-xs flex items-center gap-1.5">
                            <span>{eq.emoji}</span>
                            <span className="truncate text-[11px]">{eq.label}</span>
                          </span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Nivel de Experiencia */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-900 dark:text-white block">
                    3. Nivel de entrenamiento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "beginner" as ExperienceLevel, label: "Principiante", desc: "0-1 año" },
                      { id: "intermediate" as ExperienceLevel, label: "Intermedio", desc: "1-3 años" },
                      { id: "advanced" as ExperienceLevel, label: "Avanzado", desc: "+3 años" }
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setSetupLevel(lvl.id)}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          setupLevel === lvl.id
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-500 dark:text-emerald-400 font-black"
                            : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                        }`}
                      >
                        <span className="text-[11px] font-bold block">{lvl.label}</span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">{lvl.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Molestias / Dolor Articular */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs font-black text-gray-900 dark:text-white block">
                      4. ¿Molestias o dolor articular?
                    </label>
                    <span className="text-[9px] text-gray-400 font-bold">Para cuidar tu postura</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "knee" as const, label: "Rodillas", desc: "Evita sentadillas profundas" },
                      { id: "back" as const, label: "Espalda baja (Lumbar)", desc: "Evita peso muerto libre" },
                      { id: "shoulder" as const, label: "Hombros", desc: "Evita press tras nuca" },
                    ].map((joint) => {
                      const isSelected = setupJointPain.includes(joint.id);
                      return (
                        <button
                          key={joint.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSetupJointPain(setupJointPain.filter(x => x !== joint.id));
                            } else {
                              setSetupJointPain([...setupJointPain, joint.id]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? "bg-rose-500/15 border-rose-500 text-rose-500 dark:text-rose-400 font-bold"
                              : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{joint.label}</span>
                            {isSelected && <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                          </div>
                          <span className="text-[9px] text-gray-400 block mt-0.5">{joint.desc}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSetupJointPain([])}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        setupJointPain.length === 0
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-500 dark:text-emerald-400 font-bold"
                          : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Sin molestias</span>
                        {setupJointPain.length === 0 && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <span className="text-[9px] text-gray-400 block mt-0.5">Articulaciones 100% sanas</span>
                    </button>
                  </div>
                </div>

                {/* 5. Días de entrenamiento */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-900 dark:text-white block">
                    5. Días disponibles por semana
                  </label>
                  <div className="flex gap-2 justify-between">
                    {[2, 3, 4, 5, 6].map((dayNum) => (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => setSetupDays(dayNum)}
                        className={`flex-1 py-2 rounded-xl border text-center transition cursor-pointer text-xs ${
                          setupDays === dayNum
                            ? "bg-emerald-500 border-emerald-400 text-white font-black shadow-sm"
                            : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-bold"
                        }`}
                      >
                        {dayNum} d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.01]">
                <button
                  type="button"
                  onClick={handleSavePreferencesAndGenerate}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Guardar y Formular Rutina con IA (Gemini 3.8 Flash)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
