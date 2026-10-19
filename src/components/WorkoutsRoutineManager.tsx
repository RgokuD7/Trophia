import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, Dumbbell, Sparkles, Plus, Trash2, ChevronDown, 
  ChevronUp, Play, Check, AlertCircle, ArrowRight, Layers, 
  SlidersHorizontal, Info, CheckCircle2, Clock, RefreshCw
} from "lucide-react";
import { 
  WeeklyRoutinePlan, RoutineTemplate, RoutineDayKey, WorkoutExercise 
} from "../types";

export interface WorkoutsRoutineManagerProps {
  plan?: WeeklyRoutinePlan;
  isGenerating?: boolean;
  generationError?: string | null;
  onUpdatePlan: (updatedPlan: WeeklyRoutinePlan) => void;
  onSelectRoutineForToday: (routine: RoutineTemplate) => void;
  onOpenPreferences: () => void;
  onGoToDailySession: () => void;
  onRetryGenerate?: () => void;
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

export default function WorkoutsRoutineManager({
  plan,
  isGenerating = false,
  generationError = null,
  onUpdatePlan,
  onSelectRoutineForToday,
  onOpenPreferences,
  onGoToDailySession,
  onRetryGenerate
}: WorkoutsRoutineManagerProps) {
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(
    plan?.routines?.[0]?.id || null
  );

  const [loadingStep, setLoadingStep] = useState(0);

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

  // If AI is formulating the routines, show beautiful animated loader
  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto space-y-6 min-h-[60vh] my-auto">
        {/* Animated Central Graphic */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Outer glowing pulsing orb */}
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl pointer-events-none"
          />

          {/* Outer rotating dashed ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-emerald-500/30 border-dashed"
          />

          {/* Middle fast spinning accent ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 rounded-full border-2 border-t-emerald-400 border-r-teal-300 border-b-transparent border-l-transparent"
          />

          {/* Core circular badge */}
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative z-10"
          >
            <Sparkles className="h-9 w-9 text-white animate-pulse" />
          </motion.div>

          {/* Orbiting sparkles badge */}
          <motion.div
            animate={{
              x: [0, 48, 0, -48, 0],
              y: [-48, 0, 48, 0, -48]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute z-20 w-7 h-7 rounded-full bg-[#0d0e15] border border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20"
          >
            <Dumbbell className="h-3.5 w-3.5" />
          </motion.div>
        </div>

        {/* Text Header */}
        <div className="space-y-2 max-w-sm">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3 animate-spin" />
            <span>Gemini 3.8 Flash • IA Activa</span>
          </div>

          <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
            Diseñando tus Rutinas Personalizadas...
          </h3>

          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Estamos creando una rutina inteligente para cada uno de tus días de entrenamiento, adaptada a tu equipamiento y articulaciones.
          </p>
        </div>

        {/* Animated Progress Steps */}
        <div className="w-full bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 p-4.5 rounded-3xl shadow-lg space-y-3 text-left">
          <div className="space-y-2.5">
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
                  className={`flex items-center gap-3 p-2 rounded-xl transition-all duration-300 ${
                    isCurrent
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                      : isDone
                      ? "text-gray-700 dark:text-gray-300 font-medium"
                      : "text-gray-400 dark:text-gray-600 font-normal"
                  }`}
                >
                  <div className="shrink-0">
                    {isDone ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400 flex items-center justify-center">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-[10px] text-gray-400 font-mono">
                        {sIdx + 1}
                      </div>
                    )}
                  </div>
                  <span className="text-xs truncate">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Shimmer progress bar */}
          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-3 relative">
            <motion.div
              animate={{
                x: ["-100%", "100%"]
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-1/2 h-full bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-400 rounded-full shadow-lg shadow-emerald-500/50"
            />
          </div>
        </div>

        <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">
          💡 En unos segundos aparecerán todas tus rutinas para que asignes qué día harás cada una.
        </span>
      </div>
    );
  }

  // If there was an error generating and no plan exists
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

  // If no plan exists yet and not generating
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
            Completa la configuración con nuestro asistente de IA para que Gemini cree tu plan semanal dividido por días según tu equipamiento.
          </p>
        </div>
        <button
          onClick={onOpenPreferences}
          className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          <span>Configurar y Formular Rutinas con IA</span>
        </button>
      </div>
    );
  }

  // Handle assigning a day to a routine
  const handleAssignDay = (routineId: string, dayKey: RoutineDayKey) => {
    const updatedRoutines = plan.routines.map((r) => {
      if (r.id === routineId) {
        // Toggle if clicked the same assigned day
        const nextDay = r.assignedDay === dayKey ? "unassigned" : dayKey;
        return { ...r, assignedDay: nextDay as RoutineDayKey };
      }
      // If another routine already had this day, unassign it to avoid clash
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
    const nextRoutines = plan.routines.filter(r => r.id !== routineId);
    onUpdatePlan({
      ...plan,
      routines: nextRoutines,
      weeklyDaysCount: nextRoutines.length,
      lastUpdated: new Date().toISOString()
    });
  };

  // Handle adding a new blank routine
  const handleAddBlankRoutine = () => {
    const newIdx = plan.routines.length + 1;
    const newRoutine: RoutineTemplate = {
      id: `custom-routine-${Date.now()}`,
      name: `Rutina ${newIdx}: Personalizada`,
      focus: "Personalizado",
      assignedDay: "unassigned",
      warmup: ["Movilidad articular general - 5 min"],
      cooldown: ["Estiramientos completos - 5 min"],
      exercises: []
    };

    onUpdatePlan({
      ...plan,
      routines: [...plan.routines, newRoutine],
      weeklyDaysCount: plan.routines.length + 1,
      lastUpdated: new Date().toISOString()
    });

    setExpandedRoutineId(newRoutine.id);
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-3xl mx-auto w-full space-y-5 text-left">
      {/* Top Banner / Plan Information Header */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Plan Semanal Activo
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                  {plan.routines.length} {plan.routines.length === 1 ? "Rutina" : "Rutinas"}
                </span>
              </div>
              <h2 className="text-base font-black text-gray-900 dark:text-white mt-0.5">
                {plan.planName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-500/15 cursor-pointer"
            >
              <span>Ver Sesión Diaria</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {plan.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pt-1 border-t border-gray-100 dark:border-gray-800/60">
            {plan.description}
          </p>
        )}

        {/* Guided Notice on Day Selection */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed font-medium">
            <strong>Asigna los días de la semana:</strong> Selecciona en cada rutina qué día realizarás cada entrenamiento. La rutina programada aparecerá automáticamente en tu <strong>Sesión Diaria</strong> en el día correspondiente.
          </div>
        </div>
      </div>

      {/* List of Routines */}
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
              {/* Routine Card Header */}
              <div className="p-4.5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
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

                  <div className="flex items-center gap-1.5 shrink-0">
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

                    {/* Exercises */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block">
                        🏋️ Ejercicios Principales ({routine.exercises.length})
                      </span>
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
                                {ex.trackingType === "time" && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-blue-500/15 text-blue-400 rounded font-bold">
                                    Tiempo
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400">
                                  {ex.sets || 3} series × {ex.reps || 10} {ex.trackingType === "time" ? "seg" : "reps"}
                                </span>
                                {ex.weight > 0 && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    · {ex.weight} kg sugeridos
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

      {/* Bottom Actions */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleAddBlankRoutine}
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
    </div>
  );
}
