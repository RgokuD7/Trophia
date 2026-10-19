import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, Dumbbell, Sparkles, Plus, Trash2, ChevronDown, 
  ChevronUp, Play, Check, AlertCircle, ArrowRight, Layers, 
  SlidersHorizontal, Info, CheckCircle2, Clock, RefreshCw,
  X, Search, Edit3, Flame, BookOpen, Weight
} from "lucide-react";
import { 
  WeeklyRoutinePlan, RoutineTemplate, RoutineDayKey, WorkoutExercise,
  CustomExercise, ExerciseTrackingType
} from "../types";
import { 
  DEFAULT_EXERCISES, createWorkoutExerciseFromData, normalizeExerciseName, 
  resolveOrAnalyzeExercise, findExerciseInCatalog
} from "../services/exerciseLibrary";

export interface WorkoutsRoutineManagerProps {
  plan?: WeeklyRoutinePlan;
  isGenerating?: boolean;
  generationError?: string | null;
  onUpdatePlan: (updatedPlan: WeeklyRoutinePlan) => void;
  onSelectRoutineForToday: (routine: RoutineTemplate) => void;
  onOpenPreferences: () => void;
  onGoToDailySession: () => void;
  onRetryGenerate?: () => void;
  apiKey?: string;
  userId?: string;
  userEquipment?: string[];
  customExercises?: CustomExercise[];
  onAddCustomExercise?: (exercise: CustomExercise) => void;
}

export const DAY_KEYS: { key: RoutineDayKey; label: string; short: string; index: number }[] = [
  { key: "monday", label: "Lunes", short: "Lun", index: 1 },
  { key: "tuesday", label: "Martes", short: "Mar", index: 2 },
  { key: "wednesday", label: "Miércoles", short: "Mié", index: 3 },
  { key: "thursday", label: "Jueves", short: "Jue", index: 4 },
  { key: "friday", label: "Viernes", short: "Vie", index: 5 },
  { key: "saturday", label: "Sábado", short: "Sáb", index: 6 },
  { key: "sunday", label: "Domingo", short: "Dom", index: 0 },
];

export const DAY_LABEL_MAP: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
  unassigned: "Sin asignar"
};

const MUSCLE_FILTER_OPTIONS = [
  { key: "all", label: "Todos" },
  { key: "pecho", label: "Pecho" },
  { key: "espalda", label: "Espalda" },
  { key: "pierna", label: "Piernas" },
  { key: "hombro", label: "Hombros" },
  { key: "brazo", label: "Brazos" },
  { key: "core", label: "Core" },
];

export default function WorkoutsRoutineManager({
  plan,
  isGenerating = false,
  generationError = null,
  onUpdatePlan,
  onSelectRoutineForToday,
  onOpenPreferences,
  onGoToDailySession,
  onRetryGenerate,
  apiKey,
  userId,
  userEquipment,
  customExercises = [],
  onAddCustomExercise
}: WorkoutsRoutineManagerProps) {
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(
    plan?.routines?.[0]?.id || null
  );

  const [loadingStep, setLoadingStep] = useState(0);

  // Modal State for Creating/Editing Routine
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineFormName, setRoutineFormName] = useState("");
  const [routineFormFocus, setRoutineFormFocus] = useState("");
  const [routineFormDay, setRoutineFormDay] = useState<RoutineDayKey>("unassigned");
  const [routineFormExercises, setRoutineFormExercises] = useState<WorkoutExercise[]>([]);
  const [routineFormWarmup, setRoutineFormWarmup] = useState<string[]>([
    "Movilidad articular general - 5 min"
  ]);
  const [routineFormCooldown, setRoutineFormCooldown] = useState<string[]>([
    "Estiramientos completos - 5 min"
  ]);

  // Sub-modal / Sheet State for Adding Exercise
  const [isAddExerciseSheetOpen, setIsAddExerciseSheetOpen] = useState(false);
  const [addExerciseTab, setAddExerciseTab] = useState<"catalog" | "ai">("catalog");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogMuscleFilter, setCatalogMuscleFilter] = useState("all");
  const [aiPromptText, setAiPromptText] = useState("");
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);

  // Progressive step animation when generating with IA
  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 1600);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Open modal to create a new routine
  const handleOpenCreateRoutine = () => {
    const nextIdx = (plan?.routines?.length || 0) + 1;
    setEditingRoutineId(null);
    setRoutineFormName(`Rutina ${nextIdx}: Personalizada`);
    setRoutineFormFocus("Fuerza General");
    setRoutineFormDay("unassigned");
    setRoutineFormExercises([]);
    setRoutineFormWarmup(["Movilidad articular general - 5 min"]);
    setRoutineFormCooldown(["Estiramientos completos - 5 min"]);
    setIsRoutineModalOpen(true);
  };

  // Open modal to edit an existing routine
  const handleOpenEditRoutine = (routine: RoutineTemplate) => {
    setEditingRoutineId(routine.id);
    setRoutineFormName(routine.name);
    setRoutineFormFocus(routine.focus || "");
    setRoutineFormDay(routine.assignedDay || "unassigned");
    setRoutineFormExercises([...routine.exercises]);
    setRoutineFormWarmup(routine.warmup && routine.warmup.length > 0 ? [...routine.warmup] : ["Movilidad articular general - 5 min"]);
    setRoutineFormCooldown(routine.cooldown && routine.cooldown.length > 0 ? [...routine.cooldown] : ["Estiramientos completos - 5 min"]);
    setIsRoutineModalOpen(true);
  };

  // Save routine from modal
  const handleSaveRoutine = () => {
    if (!routineFormName.trim()) {
      alert("Por favor escribe un nombre para la rutina.");
      return;
    }
    if (routineFormExercises.length === 0) {
      alert("Por favor añade al menos un ejercicio a la rutina.");
      return;
    }

    const currentRoutines = plan?.routines || [];
    let updatedRoutines: RoutineTemplate[] = [];

    const routinePayload: RoutineTemplate = {
      id: editingRoutineId || `routine-${Date.now()}`,
      name: routineFormName.trim(),
      focus: routineFormFocus.trim() || "Fuerza General",
      assignedDay: routineFormDay,
      warmup: routineFormWarmup,
      exercises: routineFormExercises,
      cooldown: routineFormCooldown
    };

    if (editingRoutineId) {
      // Editing existing
      updatedRoutines = currentRoutines.map(r => {
        if (r.id === editingRoutineId) {
          return routinePayload;
        }
        // If another routine had the same assigned day and day is not unassigned, unassign it
        if (routineFormDay !== "unassigned" && r.assignedDay === routineFormDay) {
          return { ...r, assignedDay: "unassigned" };
        }
        return r;
      });
    } else {
      // Creating new
      // If another routine already had this day, unassign it
      const cleanedExisting = currentRoutines.map(r => {
        if (routineFormDay !== "unassigned" && r.assignedDay === routineFormDay) {
          return { ...r, assignedDay: "unassigned" as RoutineDayKey };
        }
        return r;
      });
      updatedRoutines = [...cleanedExisting, routinePayload];
    }

    const nextPlan: WeeklyRoutinePlan = {
      planName: plan?.planName || "Mi Plan de Entrenamiento",
      description: plan?.description || "Plan personalizado estructurado por días",
      weeklyDaysCount: updatedRoutines.length,
      routines: updatedRoutines,
      createdAt: plan?.createdAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    onUpdatePlan(nextPlan);
    setIsRoutineModalOpen(false);
    setExpandedRoutineId(routinePayload.id);
  };

  // Handle assigning a day directly from routine list
  const handleAssignDay = (routineId: string, dayKey: RoutineDayKey) => {
    if (!plan) return;
    const updatedRoutines = plan.routines.map((r) => {
      if (r.id === routineId) {
        const nextDay = r.assignedDay === dayKey ? "unassigned" : dayKey;
        return { ...r, assignedDay: nextDay as RoutineDayKey };
      }
      if (r.assignedDay === dayKey) {
        return { ...r, assignedDay: "unassigned" as RoutineDayKey };
      }
      return r;
    });

    onUpdatePlan({
      ...plan,
      routines: updatedRoutines,
      lastUpdated: new Date().toISOString()
    });
  };

  // Handle deleting a routine
  const handleDeleteRoutine = (routineId: string) => {
    if (!plan) return;
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta rutina?")) return;
    const nextRoutines = plan.routines.filter(r => r.id !== routineId);
    onUpdatePlan({
      ...plan,
      routines: nextRoutines,
      weeklyDaysCount: nextRoutines.length,
      lastUpdated: new Date().toISOString()
    });
  };

  // Exercise manipulation inside modal
  const handleAddExerciseFromCatalog = (catalogItem: any) => {
    const newEx = createWorkoutExerciseFromData(catalogItem);
    setRoutineFormExercises(prev => [...prev, newEx]);
    setIsAddExerciseSheetOpen(false);
  };

  const handleAnalyzeAndAddWithAi = async () => {
    const raw = aiPromptText.trim();
    if (!raw) return;

    setIsAnalyzingAi(true);
    setAiAnalysisError(null);

    try {
      const res = await resolveOrAnalyzeExercise(
        raw,
        customExercises,
        userId || "",
        apiKey || "",
        userEquipment
      );

      if (res.savedCustomExercise && onAddCustomExercise) {
        onAddCustomExercise(res.savedCustomExercise);
      }

      setRoutineFormExercises(prev => [...prev, res.exercise]);
      setAiPromptText("");
      setIsAddExerciseSheetOpen(false);
    } catch (err: any) {
      console.error("Error analyzing exercise with AI:", err);
      setAiAnalysisError(err?.message || "No se pudo interpretar el ejercicio. Prueba con otra descripción.");
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleUpdateExerciseInModal = (
    index: number,
    field: "sets" | "reps" | "weight" | "trackingType",
    val: any
  ) => {
    setRoutineFormExercises(prev => {
      const copy = [...prev];
      const target = { ...copy[index] };
      if (field === "sets") {
        const num = Math.max(1, Number(val) || 1);
        target.sets = num;
        target.completedSets = Array.from({ length: num }).map((_, i) => ({
          setIndex: i,
          completed: false,
          reps: target.reps,
          weight: target.weight
        }));
      } else if (field === "reps") {
        const num = Math.max(1, Number(val) || 1);
        target.reps = num;
        target.completedSets = target.completedSets.map(s => ({ ...s, reps: num }));
      } else if (field === "weight") {
        const num = Math.max(0, Number(val) || 0);
        target.weight = num;
        target.completedSets = target.completedSets.map(s => ({ ...s, weight: num }));
      } else if (field === "trackingType") {
        target.trackingType = val;
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleRemoveExerciseFromModal = (index: number) => {
    setRoutineFormExercises(prev => prev.filter((_, i) => i !== index));
  };

  // Filter exercises for catalog tab
  const filteredCatalogExercises = (() => {
    const q = catalogSearch.trim().toLowerCase();
    const muscle = catalogMuscleFilter.toLowerCase();

    // Combine user's custom exercises + default exercises
    const combined: any[] = [...customExercises];
    DEFAULT_EXERCISES.forEach(def => {
      if (!combined.some(c => normalizeExerciseName(c.name) === normalizeExerciseName(def.name))) {
        combined.push(def);
      }
    });

    return combined.filter(ex => {
      const nameMatch = !q || ex.name.toLowerCase().includes(q) || (ex.normalizedName && ex.normalizedName.includes(q));
      let muscleMatch = true;
      if (muscle !== "all") {
        const allMuscles = [
          ...(ex.primaryMuscles || []),
          ...(ex.secondaryMuscles || [])
        ].join(" ").toLowerCase();
        muscleMatch = allMuscles.includes(muscle);
      }
      return nameMatch && muscleMatch;
    });
  })();

  // If AI is formulating the routines, show compact, elegant animated loader
  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-6 px-4 text-center max-w-sm mx-auto space-y-4">
        {/* Animated Central Graphic */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-md pointer-events-none"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-1 rounded-2xl border border-emerald-500/30 border-dashed"
          />
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 relative z-10">
            <Sparkles className="h-7 w-7 text-white animate-pulse" />
          </div>
        </div>

        {/* Text Header */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3 animate-spin" />
            <span>Creando tus Rutinas</span>
          </div>

          <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
            Diseñando tus Rutinas Personalizadas...
          </h3>

          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Adaptando la división muscular, ejercicios y series a tus días y equipamiento disponible.
          </p>
        </div>

        {/* Animated Progress Steps */}
        <div className="w-full bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 p-3.5 rounded-2xl shadow-md space-y-2 text-left">
          <div className="space-y-2">
            {[
              { label: "Analizando entorno y equipamiento disponible", minStep: 0 },
              { label: "Optimizando división muscular según tus días", minStep: 1 },
              { label: "Seleccionando ejercicios, series y biomecánica", minStep: 2 },
              { label: "Formulando rutinas completas y calentamiento", minStep: 3 },
            ].map((step, sIdx) => {
              const isDone = loadingStep > step.minStep;
              const isCurrent = loadingStep === step.minStep;

              return (
                <div
                  key={sIdx}
                  className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-all duration-300 ${
                    isCurrent
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                      : isDone
                      ? "text-gray-700 dark:text-gray-300 font-medium"
                      : "text-gray-400 dark:text-gray-600 font-normal"
                  }`}
                >
                  <div className="shrink-0">
                    {isDone ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400 flex items-center justify-center">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-[9px] text-gray-400 font-mono">
                        {sIdx + 1}
                      </div>
                    )}
                  </div>
                  <span className="text-xs truncate">{step.label}</span>
                </div>
              );
            })}
          </div>

          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2 relative">
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-1/2 h-full bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-400 rounded-full shadow-lg shadow-emerald-500/50"
            />
          </div>
        </div>

        <span className="text-[10px] text-gray-400 dark:text-gray-500 italic block">
          💡 En unos segundos aparecerán tus rutinas para que asignes qué día harás cada una.
        </span>
      </div>
    );
  }

  // Error state
  if (generationError && (!plan || !plan.routines || plan.routines.length === 0)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4 my-auto">
        <div className="w-14 h-14 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-base font-black text-gray-900 dark:text-white">
            No se pudo completar la generación
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {generationError}
          </p>
        </div>
        <div className="flex gap-2 w-full pt-1">
          {onRetryGenerate && (
            <button
              onClick={onRetryGenerate}
              className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/15"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reintentar</span>
            </button>
          )}
          <button
            onClick={onOpenPreferences}
            className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-gray-200 dark:border-white/10"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Preferencias</span>
          </button>
        </div>
      </div>
    );
  }

  // Empty plan state
  if (!plan || !plan.routines || plan.routines.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4 my-auto">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
          <Layers className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-base font-black text-gray-900 dark:text-white">
            Aún no tienes rutinas configuradas
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Puedes configurar tu plan semanal con el asistente inteligente o crear tus propias rutinas manualmente desde cero.
          </p>
        </div>
        <div className="w-full space-y-2 pt-2">
          <button
            onClick={onOpenPreferences}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Configurar y Formular Rutinas con IA</span>
          </button>
          <button
            onClick={handleOpenCreateRoutine}
            className="w-full py-3.5 px-4 bg-white dark:bg-[#161824] hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4 text-emerald-400" />
            <span>Crear Rutina Manualmente</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-3xl mx-auto w-full space-y-5 text-left">
      
      {/* 1. Header Superior Descomprimido */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Plan Semanal
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 font-bold">
                  {plan.routines.length} {plan.routines.length === 1 ? "Rutina" : "Rutinas"}
                </span>
              </div>
              <h2 className="text-base font-black text-gray-900 dark:text-white mt-0.5">
                {plan.planName}
              </h2>
            </div>
          </div>

          {/* Action buttons: Create routine, preferences, go to daily */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenCreateRoutine}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>Añadir Rutina</span>
            </button>
            <button
              onClick={onOpenPreferences}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-gray-200 dark:border-white/10"
              title="Reconfigurar entorno, equipamiento y generar nuevo plan"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-400" />
              <span>Preferencias</span>
            </button>
            <button
              onClick={onGoToDailySession}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-gray-200 dark:border-white/10"
            >
              <span>Sesión Diaria</span>
              <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
            </button>
          </div>
        </div>

        {plan.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pt-2 border-t border-gray-100 dark:border-gray-800/60">
            {plan.description}
          </p>
        )}

        {/* Guided Notice on Day Selection */}
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed font-medium">
            <strong>Asigna los días de la semana:</strong> Toca en qué día realizarás cada rutina. Se cargará automáticamente en tu <strong>Sesión Diaria</strong> el día programado.
          </div>
        </div>
      </div>

      {/* 2. List of Routines with Clean Layout */}
      <div className="space-y-4">
        {plan.routines.map((routine, idx) => {
          const isExpanded = expandedRoutineId === routine.id;
          const assignedLabel = routine.assignedDay && routine.assignedDay !== "unassigned"
            ? DAY_LABEL_MAP[routine.assignedDay]
            : null;

          return (
            <div
              key={routine.id}
              className={`rounded-3xl border transition-all overflow-hidden ${
                assignedLabel
                  ? "bg-white dark:bg-[#161824] border-gray-200 dark:border-gray-800 shadow-sm"
                  : "bg-white/80 dark:bg-[#161824]/60 border-amber-500/30 shadow-sm"
              }`}
            >
              {/* Routine Card Header: Clean 2-row layout */}
              <div className="p-4.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                        Rutina {idx + 1}
                      </span>
                      {routine.focus && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 font-bold truncate max-w-[200px]">
                          🎯 {routine.focus}
                        </span>
                      )}
                      {assignedLabel ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black flex items-center gap-1">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                          <span>{assignedLabel}</span>
                        </span>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-black">
                          ⚠️ Sin día asignado
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white truncate">
                      {routine.name}
                    </h3>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
                      {routine.exercises.length} ejercicios · {routine.exercises.reduce((s, ex) => s + (ex.sets || 3), 0)} series totales
                    </span>
                  </div>

                  {/* Actions for this routine */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                    <button
                      onClick={() => handleOpenEditRoutine(routine)}
                      className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border border-gray-200 dark:border-white/10"
                      title="Editar ejercicios de esta rutina"
                    >
                      <Edit3 className="h-3 w-3 text-emerald-400" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => onSelectRoutineForToday(routine)}
                      className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 dark:text-emerald-400 rounded-xl text-[10px] font-black transition flex items-center gap-1 cursor-pointer border border-emerald-500/30"
                      title="Entrenar esta rutina hoy"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Hacer hoy</span>
                    </button>
                    <button
                      onClick={() => setExpandedRoutineId(isExpanded ? null : routine.id)}
                      className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center transition cursor-pointer border border-gray-200 dark:border-white/10"
                      title={isExpanded ? "Ocultar ejercicios" : "Ver ejercicios"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Day of Week Selector Pills */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60">
                  <span className="text-[10px] font-black text-gray-600 dark:text-gray-300 block mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-emerald-400" />
                    <span>¿Qué día entrenarás esta rutina?</span>
                  </span>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_KEYS.map((day) => {
                      const isSelected = routine.assignedDay === day.key;
                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => handleAssignDay(routine.id, day.key)}
                          className={`py-2 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/20 scale-[1.02]"
                              : "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 font-bold border border-gray-200 dark:border-white/5"
                          }`}
                        >
                          <span className="text-[11px] font-black">{day.short}</span>
                          <span className="text-[8px] uppercase tracking-tighter opacity-80">{day.label.slice(0, 3)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Collapsible Exercise Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 p-4.5 space-y-4"
                  >
                    {/* Warmup */}
                    {routine.warmup && routine.warmup.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-amber-500 uppercase flex items-center gap-1">
                          🔥 Calentamiento y Movilidad
                        </span>
                        <div className="space-y-1 pl-2 border-l-2 border-amber-500/30">
                          {routine.warmup.map((w, wIdx) => (
                            <p key={wIdx} className="text-xs text-gray-600 dark:text-gray-400">
                              • {w}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exercises list */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block">
                          🏋️ Ejercicios ({routine.exercises.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditRoutine(routine)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none transition"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Añadir o editar</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {routine.exercises.map((ex, exIdx) => (
                          <div
                            key={ex.id || exIdx}
                            className="p-3 rounded-2xl bg-white dark:bg-[#12131d] border border-gray-200 dark:border-gray-800 shadow-sm flex items-start justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-900 dark:text-white">
                                  {exIdx + 1}. {ex.name}
                                </span>
                                {ex.trackingType === "time" ? (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-blue-500/15 text-blue-400 rounded font-bold">
                                    Tiempo
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/15 text-emerald-400 rounded font-bold">
                                    Reps
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400">
                                  {ex.sets || 3} series × {ex.reps || 10} {ex.trackingType === "time" ? "seg" : "reps"}
                                </span>
                                {ex.weight > 0 ? (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    · {ex.weight} kg sugeridos
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    · Peso corporal
                                  </span>
                                )}
                                {ex.equipmentNeeded && (
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    · {ex.equipmentNeeded}
                                  </span>
                                )}
                              </div>
                              {ex.techniqueTips && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 italic mt-1 bg-gray-50 dark:bg-white/[0.02] p-1.5 rounded-lg border border-gray-100 dark:border-white/5">
                                  💡 {ex.techniqueTips}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cooldown */}
                    {routine.cooldown && routine.cooldown.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-blue-400 uppercase flex items-center gap-1">
                          🧘 Enfriamiento y Estiramientos
                        </span>
                        <div className="space-y-1 pl-2 border-l-2 border-blue-400/30">
                          {routine.cooldown.map((c, cIdx) => (
                            <p key={cIdx} className="text-xs text-gray-600 dark:text-gray-400">
                              • {c}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer Actions inside Drawer */}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleDeleteRoutine(routine.id)}
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Eliminar esta rutina</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectRoutineForToday(routine)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Iniciar en la sesión de hoy</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* 3. Bottom Actions */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleOpenCreateRoutine}
          className="w-full sm:w-auto px-4 py-3 bg-white dark:bg-[#161824] hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="h-4 w-4 text-emerald-400" />
          <span>Añadir Otra Rutina Personalizada</span>
        </button>

        <button
          type="button"
          onClick={onGoToDailySession}
          className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-98 cursor-pointer ml-auto"
        >
          <span>Confirmar y Ver Sesión Diaria</span>
          <ArrowRight className="h-4 w-4 stroke-[3]" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL A PANTALLA COMPLETA PARA CREAR O EDITAR RUTINAS                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isRoutineModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4 md:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white dark:bg-[#0f1019] w-full max-w-2xl max-h-[92vh] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden text-left"
            >
              {/* Header del Modal */}
              <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-[#151722] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white">
                      {editingRoutineId ? "Editar Rutina" : "Crear Nueva Rutina"}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Configura el nombre, día asignado y ejercicios de tu entrenamiento.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveRoutine}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>Guardar Rutina</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRoutineModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Contenido scrolleable */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {/* 1. Datos Principales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                      Nombre de la Rutina
                    </label>
                    <input
                      type="text"
                      value={routineFormName}
                      onChange={(e) => setRoutineFormName(e.target.value)}
                      placeholder="Ej: Día 1: Pecho, Hombro y Tríceps"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#161824] border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                      Enfoque Muscular
                    </label>
                    <input
                      type="text"
                      value={routineFormFocus}
                      onChange={(e) => setRoutineFormFocus(e.target.value)}
                      placeholder="Ej: Empuje / Pectoral y Deltoides"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#161824] border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* 2. Selector de Día Asignado */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                      <span>¿Qué día de la semana realizarás esta rutina?</span>
                    </label>
                    {routineFormDay !== "unassigned" && (
                      <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400">
                        Asignado a: {DAY_LABEL_MAP[routineFormDay]}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {DAY_KEYS.map((day) => {
                      const isSel = routineFormDay === day.key;
                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => setRoutineFormDay(isSel ? "unassigned" : day.key)}
                          className={`py-2 px-1 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center ${
                            isSel
                              ? "bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/20 scale-[1.02]"
                              : "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 font-bold border border-gray-200 dark:border-white/5"
                          }`}
                        >
                          <span className="text-[11px] font-black">{day.short}</span>
                          <span className="text-[8px] uppercase tracking-tighter opacity-80">{day.label.slice(0, 3)}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setRoutineFormDay("unassigned")}
                      className={`py-2 px-1 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        routineFormDay === "unassigned"
                          ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 font-black"
                          : "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 font-medium border border-gray-200 dark:border-white/5"
                      }`}
                    >
                      <span className="text-[10px] font-black">Libre</span>
                      <span className="text-[8px] uppercase tracking-tighter opacity-80">Sin día</span>
                    </button>
                  </div>
                </div>

                {/* 3. Lista de Ejercicios de la Rutina */}
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span>Ejercicios de la Rutina</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 font-mono font-bold">
                          {routineFormExercises.length}
                        </span>
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Ajusta series, repeticiones o segundos, y peso objetivo para cada uno.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAddExerciseTab("catalog");
                        setIsAddExerciseSheetOpen(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-500/15 cursor-pointer active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Añadir Ejercicio</span>
                    </button>
                  </div>

                  {/* Empty state if 0 exercises */}
                  {routineFormExercises.length === 0 ? (
                    <div className="p-8 rounded-3xl bg-gray-50 dark:bg-[#161824] border border-dashed border-gray-300 dark:border-gray-800 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                        <Dumbbell className="h-6 w-6" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-gray-900 dark:text-white">
                          Esta rutina aún no tiene ejercicios
                        </h5>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-0.5">
                          Puedes elegirlos de nuestro catálogo de ejercicios o describirlos con tus propias palabras con Inteligencia Artificial.
                        </p>
                      </div>
                      <div className="flex justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAddExerciseTab("catalog");
                            setIsAddExerciseSheetOpen(true);
                          }}
                          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Elegir del Catálogo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddExerciseTab("ai");
                            setIsAddExerciseSheetOpen(true);
                          }}
                          className="px-3.5 py-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                          <span>Describir con IA</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Non-empty exercise list with inline adjustments */
                    <div className="space-y-2.5">
                      {routineFormExercises.map((ex, exIdx) => {
                        const isTime = ex.trackingType === "time";
                        return (
                          <div
                            key={ex.id || exIdx}
                            className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#161824] border border-gray-200 dark:border-gray-800 space-y-2.5 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px] font-black shrink-0">
                                  {exIdx + 1}
                                </span>
                                <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                                  {ex.name}
                                </span>
                                {ex.primaryMuscles && ex.primaryMuscles.length > 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold shrink-0">
                                    🎯 {ex.primaryMuscles[0]}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveExerciseFromModal(exIdx)}
                                className="p-1 text-gray-400 hover:text-rose-500 transition cursor-pointer"
                                title="Eliminar este ejercicio"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Inputs for Sets, Reps/Time, Weight, Tracking Type Toggle */}
                            <div className="flex flex-wrap items-center gap-2.5 text-[11px] pt-1 border-t border-gray-200/50 dark:border-gray-800/60">
                              {/* Series */}
                              <div className="flex items-center gap-1 bg-white dark:bg-[#0f1019] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                <span className="text-gray-400 font-bold text-[9px] uppercase">Series</span>
                                <input
                                  type="number"
                                  value={ex.sets}
                                  onChange={(e) => handleUpdateExerciseInModal(exIdx, "sets", e.target.value)}
                                  className="w-8 text-center font-bold bg-transparent text-gray-900 dark:text-white focus:outline-none"
                                />
                              </div>

                              {/* Reps o Segundos */}
                              <div className="flex items-center gap-1 bg-white dark:bg-[#0f1019] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                <span className="text-gray-400 font-bold text-[9px] uppercase">
                                  {isTime ? "Segundos" : "Reps"}
                                </span>
                                <input
                                  type="number"
                                  value={ex.reps}
                                  onChange={(e) => handleUpdateExerciseInModal(exIdx, "reps", e.target.value)}
                                  className="w-10 text-center font-bold bg-transparent text-gray-900 dark:text-white focus:outline-none"
                                />
                              </div>

                              {/* Peso */}
                              <div className="flex items-center gap-1 bg-white dark:bg-[#0f1019] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                <span className="text-gray-400 font-bold text-[9px] uppercase">Peso (kg)</span>
                                <input
                                  type="number"
                                  value={ex.weight}
                                  onChange={(e) => handleUpdateExerciseInModal(exIdx, "weight", e.target.value)}
                                  className="w-10 text-center font-bold bg-transparent text-gray-900 dark:text-white focus:outline-none"
                                />
                              </div>

                              {/* Toggle Tracking Type */}
                              <button
                                type="button"
                                onClick={() => handleUpdateExerciseInModal(exIdx, "trackingType", isTime ? "reps" : "time")}
                                className="text-[9px] font-bold text-gray-600 dark:text-gray-300 hover:text-emerald-400 bg-white dark:bg-[#0f1019] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 transition cursor-pointer ml-auto"
                                title="Alternar entre Repeticiones y Segundos"
                              >
                                {isTime ? "⏱️ Por Tiempo" : "🔄 Por Reps"}
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add more button */}
                      <button
                        type="button"
                        onClick={() => {
                          setAddExerciseTab("catalog");
                          setIsAddExerciseSheetOpen(true);
                        }}
                        className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-800 hover:border-emerald-500 text-gray-600 dark:text-gray-400 hover:text-emerald-400 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer bg-white/40 dark:bg-white/[0.02]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Añadir Otro Ejercicio</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer con botón de guardado */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-[#151722] flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRoutineModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveRoutine}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Guardar Rutina en el Plan</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. SUB-MODAL / DRAWER: "+ AÑADIR EJERCICIO" (CATÁLOGO O DESCRIBIR CON IA)  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddExerciseSheetOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#12131d] w-full max-w-xl max-h-[85vh] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden text-left"
            >
              {/* Header con Tabs */}
              <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-[#161824] shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Plus className="h-4 w-4 text-emerald-400" />
                    <span>Añadir Ejercicio a la Rutina</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddExerciseSheetOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Tabs Selector: Catálogo vs Describir con IA */}
                <div className="flex bg-gray-100 dark:bg-black/30 p-1 rounded-2xl border border-gray-200 dark:border-gray-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setAddExerciseTab("catalog")}
                    className={`flex-1 py-2 rounded-xl font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      addExerciseTab === "catalog"
                        ? "bg-white dark:bg-[#1e202f] text-emerald-500 dark:text-emerald-400 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>📚 Catálogo de Ejercicios</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddExerciseTab("ai")}
                    className={`flex-1 py-2 rounded-xl font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      addExerciseTab === "ai"
                        ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    <span>✨ Describir con IA</span>
                  </button>
                </div>
              </div>

              {/* Contenido según Tab */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {addExerciseTab === "catalog" ? (
                  /* TAB 1: CATÁLOGO */
                  <div className="space-y-3.5">
                    {/* Buscador */}
                    <div className="relative">
                      <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        placeholder="Buscar por nombre (ej: press banca, sentadilla, curl...)"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#161824] border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>

                    {/* Filtro por grupo muscular */}
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      {MUSCLE_FILTER_OPTIONS.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setCatalogMuscleFilter(m.key)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer ${
                            catalogMuscleFilter === m.key
                              ? "bg-emerald-500 text-white font-black"
                              : "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Lista de resultados */}
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {filteredCatalogExercises.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-400">
                          No encontramos ejercicios con ese criterio. Prueba con la pestaña "Describir con IA".
                        </div>
                      ) : (
                        filteredCatalogExercises.map((ex, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-2xl bg-gray-50 dark:bg-[#161824] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 hover:border-emerald-500/40 transition"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-black text-gray-900 dark:text-white block truncate">
                                {ex.name}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                                {ex.primaryMuscles && ex.primaryMuscles[0] && (
                                  <span className="font-bold text-emerald-400">
                                    🎯 {ex.primaryMuscles[0]}
                                  </span>
                                )}
                                <span>· {ex.defaultSets || 3} series × {ex.defaultReps || 10} {ex.trackingType === "time" ? "seg" : "reps"}</span>
                                {ex.equipmentNeeded && (
                                  <span className="opacity-80">· {ex.equipmentNeeded}</span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddExerciseFromCatalog(ex)}
                              className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 dark:text-emerald-400 rounded-xl text-xs font-black transition flex items-center gap-1 shrink-0 cursor-pointer border border-emerald-500/30"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Añadir</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* TAB 2: DESCRIBIR CON IA */
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 leading-relaxed font-medium">
                      💡 <strong>Configuración inteligente automática:</strong> Escribe tu ejercicio con tus palabras (o copia el nombre). La IA detectará automáticamente si es por tiempo o repeticiones, si utiliza peso o peso corporal, los músculos primarios y secundarios, y la técnica recomendada.
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                        Describe tu ejercicio
                      </label>
                      <textarea
                        rows={3}
                        value={aiPromptText}
                        onChange={(e) => setAiPromptText(e.target.value)}
                        placeholder="Ej: Press militar con mancuernas de 14kg sentado 4 series de 10 reps, o Plancha isométrica abdominal por 45 segundos..."
                        className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-[#161824] border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 transition resize-none font-medium leading-relaxed"
                      />
                    </div>

                    {aiAnalysisError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{aiAnalysisError}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isAnalyzingAi || !aiPromptText.trim()}
                      onClick={handleAnalyzeAndAddWithAi}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 hover:opacity-95 text-white font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAnalyzingAi ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Analizando biomecánica y configurando con IA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>✨ Analizar y Añadir a la Rutina</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
