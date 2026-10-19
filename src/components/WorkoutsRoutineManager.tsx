import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, Dumbbell, Sparkles, Plus, Trash2, ChevronDown, 
  ChevronUp, Play, Check, AlertCircle, ArrowRight, Layers, 
  SlidersHorizontal, Info, CheckCircle2, Clock
} from "lucide-react";
import { 
  WeeklyRoutinePlan, RoutineTemplate, RoutineDayKey, WorkoutExercise 
} from "../types";

export interface WorkoutsRoutineManagerProps {
  plan?: WeeklyRoutinePlan;
  onUpdatePlan: (updatedPlan: WeeklyRoutinePlan) => void;
  onSelectRoutineForToday: (routine: RoutineTemplate) => void;
  onOpenPreferences: () => void;
  onGoToDailySession: () => void;
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
  onUpdatePlan,
  onSelectRoutineForToday,
  onOpenPreferences,
  onGoToDailySession
}: WorkoutsRoutineManagerProps) {
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(
    plan?.routines?.[0]?.id || null
  );

  // If no plan exists yet
  if (!plan || !plan.routines || plan.routines.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
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
