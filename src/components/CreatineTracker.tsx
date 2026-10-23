import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Check,
  RotateCcw,
  Sparkles,
  Flame,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Droplets,
  Brain,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { UserProfile } from "../types";
import {
  calculateCreatineSaturation,
  getLocalDateString,
} from "../utils/fitnessUtils";
import CreatineMuscleVisualizer from "./CreatineMuscleVisualizer";

interface CreatineTrackerProps {
  profile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
}

export default function CreatineTracker({
  profile,
  onUpdateProfile,
}: CreatineTrackerProps) {
  const [selectedDose, setSelectedDose] = useState<number>(
    profile?.creatineDailyDose || 5
  );
  const [showFaq, setShowFaq] = useState<boolean>(false);
  const [showSetup, setShowSetup] = useState<boolean>(false);

  const todayStr = getLocalDateString();
  const rawHistory = profile?.creatineHistory || [];
  const history = profile?.lastCreatineIntake && !rawHistory.includes(profile.lastCreatineIntake)
    ? [...rawHistory, profile.lastCreatineIntake].sort()
    : rawHistory;

  const startingMode = profile?.creatineStartingMode || "new";

  const saturationData = calculateCreatineSaturation(
    history,
    startingMode,
    todayStr,
    profile?.lastCreatineIntake
  );

  const handleToggleDate = (dateStr: string) => {
    if (!profile || !onUpdateProfile) return;

    let updatedHistory: string[];

    if (history.includes(dateStr)) {
      // Remove date
      updatedHistory = history.filter((d) => d !== dateStr);
    } else {
      // Add date
      updatedHistory = [...history, dateStr].sort();
    }

    const isTodayLogged = updatedHistory.includes(todayStr);

    onUpdateProfile({
      ...profile,
      takesCreatine: true,
      lastCreatineIntake: isTodayLogged ? todayStr : (profile.lastCreatineIntake === todayStr ? undefined : profile.lastCreatineIntake),
      creatineHistory: updatedHistory,
      creatineDailyDose: selectedDose,
      creatineStartingMode: startingMode,
    });
  };

  const handleLogToday = () => {
    handleToggleDate(todayStr);
  };

  const handleSetStartingMode = (mode: "new" | "already_saturated") => {
    if (!profile || !onUpdateProfile) return;
    onUpdateProfile({
      ...profile,
      takesCreatine: true,
      creatineStartingMode: mode,
    });
    setShowSetup(false);
  };

  const handleResetHistory = () => {
    if (!profile || !onUpdateProfile) return;
    onUpdateProfile({
      ...profile,
      takesCreatine: true,
      creatineHistory: [],
      lastCreatineIntake: undefined,
      creatineStartingMode: "new",
    });
    setShowSetup(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Action Hero Card: Take Today's Dose */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden shadow-xl ${
          saturationData.takenToday
            ? "bg-gradient-to-br from-emerald-500/15 via-[#121c18] to-[#0e1412] border-emerald-500/30"
            : "bg-gradient-to-br from-emerald-500/20 via-[#181a27] to-[#10121d] border-emerald-500/40 shadow-emerald-500/10"
        }`}
      >
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {saturationData.takenToday ? "⚡" : "💪"}
              </span>
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-400">
                {saturationData.takenToday
                  ? "Dosis de Hoy Completada"
                  : "¿Tomaste tu creatina hoy?"}
              </span>
            </div>
            <h3 className="text-base font-black text-white tracking-tight">
              {saturationData.takenToday
                ? "¡Músculos recargados con éxito!"
                : `Registra tu dosis diaria de ${selectedDose}g`}
            </h3>
            <p className="text-[11px] text-gray-300 dark:text-gray-400 leading-relaxed max-w-[280px]">
              {saturationData.takenToday
                ? `Has aportado ${selectedDose}g de monohidrato hoy. Tus reservas de fosfocreatina se mantienen al tope.`
                : "La constancia diaria satura tus depósitos celulares para máxima fuerza, resíntesis de ATP y volumen muscular."}
            </p>
          </div>

          {/* Big CTA Button */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {saturationData.takenToday ? (
              <button
                type="button"
                onClick={handleLogToday}
                className="group px-3 py-2 bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-400 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/40 text-[10px] font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Toca para desmarcar si fue un error"
              >
                <Check className="h-3.5 w-3.5 group-hover:hidden" />
                <RotateCcw className="h-3.5 w-3.5 hidden group-hover:inline" />
                <span className="group-hover:hidden">Tomada hoy</span>
                <span className="hidden group-hover:inline">Desmarcar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogToday}
                className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs rounded-2xl transition shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="h-4 w-4 fill-current" />
                <span>Tomar dosis ({selectedDose}g)</span>
              </button>
            )}

            {/* Quick Dose Selector chips */}
            {!saturationData.takenToday && (
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                {[3, 5, 10].map((dose) => (
                  <button
                    key={dose}
                    type="button"
                    onClick={() => setSelectedDose(dose)}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold transition cursor-pointer ${
                      selectedDose === dose
                        ? "bg-emerald-500 text-black font-black"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    {dose}g
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Missing yesterday alert if applicable */}
        {!saturationData.takenYesterday && !saturationData.takenToday && history.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
            <span className="flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Ayer no registraste dosis (-1.0% de reservas). ¡Toma la de hoy para reponerla!</span>
            </span>
          </div>
        )}
      </motion.div>

      {/* 2. Visual Muscular / Body Representation */}
      <CreatineMuscleVisualizer
        saturation={saturationData.saturationPercentage}
        streak={saturationData.streakDays}
        takenToday={saturationData.takenToday}
        statusLabel={saturationData.statusLabel}
      />

      {/* 3. Interactive 14-Day Calendar Strip */}
      <div className="bg-white dark:bg-[#161824] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              Historial de Consumo (Últimos 14 días)
            </span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">
            Toca un día para editar
          </span>
        </div>

        {/* 14 days in 2 clean rows */}
        <div className="space-y-1.5 pt-1">
          {/* Week -1 (days 13 to 7 ago) */}
          <div className="grid grid-cols-7 gap-1.5">
            {saturationData.daysLoggedPast14Days.slice(0, 7).map((dayItem) => (
              <button
                key={dayItem.date}
                type="button"
                onClick={() => handleToggleDate(dayItem.date)}
                className={`py-1.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                  dayItem.taken
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/10"
                    : "bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 text-gray-500 hover:border-gray-400"
                }`}
              >
                <span className="text-[8px] uppercase font-bold text-gray-500">
                  {dayItem.dayName}
                </span>
                <span className="text-[11px] font-black font-mono">
                  {dayItem.dayNumber}
                </span>
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8.5px] ${
                    dayItem.taken
                      ? "bg-emerald-500 text-black font-black"
                      : "bg-black/20 text-gray-600 border border-white/5"
                  }`}
                >
                  {dayItem.taken ? "✓" : "·"}
                </div>
              </button>
            ))}
          </div>

          {/* Current week (days 6 ago to today) */}
          <div className="grid grid-cols-7 gap-1.5">
            {saturationData.daysLoggedPast14Days.slice(7).map((dayItem) => (
              <button
                key={dayItem.date}
                type="button"
                onClick={() => handleToggleDate(dayItem.date)}
                className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                  dayItem.taken
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/10"
                    : dayItem.isToday
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                    : "bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/10 text-gray-400 hover:border-gray-400"
                } ${dayItem.isToday ? "ring-2 ring-emerald-400/50" : ""}`}
              >
                <span className="text-[8.5px] uppercase font-bold text-gray-400">
                  {dayItem.dayName}
                </span>
                <span className="text-xs font-black font-mono">
                  {dayItem.dayNumber}
                </span>
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                    dayItem.taken
                      ? "bg-emerald-500 text-black font-black"
                      : "bg-black/20 text-gray-500 border border-white/10"
                  }`}
                >
                  {dayItem.taken ? "✓" : "·"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Days count summary */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-[10px] text-gray-400">
          <span>
            Días con creatina:{" "}
            <strong className="text-emerald-400 font-mono font-bold">
              {saturationData.totalDaysLogged} días
            </strong>
          </span>
          {saturationData.daysToFullSaturation > 0 ? (
            <span>
              Faltan aprox.{" "}
              <strong className="text-sky-400 font-mono font-bold">
                {saturationData.daysToFullSaturation} días
              </strong>{" "}
              para 100%
            </span>
          ) : (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> ¡100% Saturado!
            </span>
          )}
        </div>
      </div>

      {/* 4. Physiological Benefits Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#161824] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Zap className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Resíntesis ATP
            </span>
          </div>
          <span className="text-lg font-black font-mono text-gray-900 dark:text-white">
            +{Math.round((saturationData.saturationPercentage / 100) * 18)}%
          </span>
          <p className="text-[9px] text-gray-400 leading-tight">
            Mayor reciclaje de energía en series de 6 a 12 repeticiones.
          </p>
        </div>

        <div className="bg-white dark:bg-[#161824] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-1">
          <div className="flex items-center gap-1.5 text-blue-400">
            <Droplets className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Voluminización
            </span>
          </div>
          <span className="text-lg font-black font-mono text-gray-900 dark:text-white">
            Intracelular
          </span>
          <p className="text-[9px] text-gray-400 leading-tight">
            Hidrata las fibras por dentro, promoviendo la síntesis proteica.
          </p>
        </div>

        <div className="bg-white dark:bg-[#161824] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-1">
          <div className="flex items-center gap-1.5 text-orange-400">
            <Dumbbell className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Fuerza 1RM
            </span>
          </div>
          <span className="text-lg font-black font-mono text-gray-900 dark:text-white">
            +5% a +15%
          </span>
          <p className="text-[9px] text-gray-400 leading-tight">
            Aumento demostrado en capacidad de trabajo y volumen tolerado.
          </p>
        </div>

        <div className="bg-white dark:bg-[#161824] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-1">
          <div className="flex items-center gap-1.5 text-purple-400">
            <Brain className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Cerebro / Foco
            </span>
          </div>
          <span className="text-lg font-black font-mono text-gray-900 dark:text-white">
            Antifatiga
          </span>
          <p className="text-[9px] text-gray-400 leading-tight">
            Mejora la memoria de trabajo y la energía en fatiga por sueño.
          </p>
        </div>
      </div>

      {/* 5. Setup helper: If user was already taking creatine before */}
      <div className="bg-white dark:bg-[#161824] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-2">
        <button
          type="button"
          onClick={() => setShowSetup(!showSetup)}
          className="w-full flex items-center justify-between text-left text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span>⚙️</span>
            <span>¿Ya tomabas creatina antes de usar esta app?</span>
          </span>
          {showSetup ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {showSetup && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2 space-y-2 text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800/80"
            >
              <p>
                Configura tu punto de partida o ajusta tu historial de tomas:
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSetStartingMode("already_saturated")}
                  className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/15 text-white font-bold text-[10px] rounded-xl transition cursor-pointer"
                >
                  ⚡ Llevo semanas (100% saturado)
                </button>
                <button
                  type="button"
                  onClick={handleResetHistory}
                  className="flex-1 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold text-[10px] rounded-xl transition cursor-pointer"
                >
                  Empezar de 0
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 6. Scientific FAQ / Information Accordion */}
      <div className="bg-white dark:bg-[#161824] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3">
        <button
          type="button"
          onClick={() => setShowFaq(!showFaq)}
          className="w-full flex items-center justify-between text-left text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-400" />
            <span>Ciencia de la Creatina & Saturación</span>
          </span>
          {showFaq ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {showFaq && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-2 text-[10.5px] text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800"
            >
              <div>
                <strong className="text-gray-900 dark:text-white block font-bold">
                  ¿Qué pasa si me salto un día?
                </strong>
                <span>
                  No te preocupes. Las reservas de fosfocreatina tardan entre 4
                  y 6 semanas en vaciarse por completo. Olvidar un día solo reduce
                  tus niveles aproximadamente un 1.0%. Si retomas al día siguiente,
                  recuperarás la plenitud en 24 horas.
                </span>
              </div>

              <div>
                <strong className="text-gray-900 dark:text-white block font-bold">
                  ¿Cuándo es el mejor momento para tomarla?
                </strong>
                <span>
                  La creatina funciona por acumulación crónica, no aguda. Lo más
                  importante es tomarla todos los días, incluso en días de descanso.
                  Tomarla con carbohidratos o tras entrenar puede optimizar
                  ligeramente su transporte celular.
                </span>
              </div>

              <div>
                <strong className="text-gray-900 dark:text-white block font-bold">
                  ¿Es obligatoria la fase de carga (20g/día)?
                </strong>
                <span>
                  No. Tomar 3 a 5 gramos continuos alcanza exactamente el mismo
                  100% de saturación en ~28 días, evitando malestares
                  estomacales.
                </span>
              </div>

              <div>
                <strong className="text-gray-900 dark:text-white block font-bold">
                  ¿Retiene líquidos?
                </strong>
                <span>
                  Sí, pero es agua <em>intracelular</em> dentro del miocito (célula
                  muscular), lo cual actúa como señal anabólica para el crecimiento
                  y no genera retención subcutánea ni aspecto blando.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
