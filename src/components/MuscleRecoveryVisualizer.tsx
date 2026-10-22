import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Zap, Shield, Flame, Sparkles, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MuscleRecovery } from "../types";

export type MuscleGroupId = "chest" | "back" | "legs" | "shoulders" | "arms" | "core";

interface MuscleRecoveryVisualizerProps {
  recovery: MuscleRecovery;
  selectedMuscle?: MuscleGroupId | null;
  onSelectMuscle?: (muscleId: MuscleGroupId) => void;
}

interface MuscleMeta {
  id: MuscleGroupId;
  label: string;
  scientificName: string;
  front: boolean;
  back: boolean;
  description: string;
}

const MUSCLE_METAS: Record<MuscleGroupId, MuscleMeta> = {
  chest: {
    id: "chest",
    label: "Pecho / Empuje",
    scientificName: "Pectoralis Major & Minor",
    front: true,
    back: false,
    description: "Músculo motor de empuje horizontal. Responde con microrroturas intensas en press plano e inclinados.",
  },
  back: {
    id: "back",
    label: "Espalda / Tracción",
    scientificName: "Latissimus Dorsi & Trapezius",
    front: false,
    back: true,
    description: "Gran cadena posterior. Requiere 48-72h de regeneración tras peso muerto, dominadas y remos pesados.",
  },
  legs: {
    id: "legs",
    label: "Piernas (Glúteos / Cuádriceps)",
    scientificName: "Quadriceps, Hamstrings & Gluteus",
    front: true,
    back: true,
    description: "Mayor masa muscular del cuerpo. Mayor demanda de glucógeno y síntesis proteica para recuperarse.",
  },
  shoulders: {
    id: "shoulders",
    label: "Hombros",
    scientificName: "Deltoideus (Anterior, Lateral, Posterior)",
    front: true,
    back: true,
    description: "Articulación móvil de alta exigencia. Clave no sobrecargar deltoides anterior si se entrenó pecho recientemente.",
  },
  arms: {
    id: "arms",
    label: "Brazos (Bíceps / Tríceps)",
    scientificName: "Biceps Brachii & Triceps Brachii",
    front: true,
    back: true,
    description: "Grupos musculares más pequeños con recuperación más ágil (~36-48h), sinérgicos en tirones y empujes.",
  },
  core: {
    id: "core",
    label: "Core / Abdomen",
    scientificName: "Rectus Abdominis & Obliques",
    front: true,
    back: true,
    description: "Estabilizadores lumbo-pélvicos. Alta densidad de fibras lentas, toleran frecuencia pero requieren tono óptimo.",
  },
};

export default function MuscleRecoveryVisualizer({
  recovery,
  selectedMuscle: externalSelected,
  onSelectMuscle,
}: MuscleRecoveryVisualizerProps) {
  const [internalSelected, setInternalSelected] = useState<MuscleGroupId>("chest");
  const [view, setView] = useState<"front" | "back">("front");

  const selectedMuscleId = externalSelected !== undefined && externalSelected !== null ? externalSelected : internalSelected;
  const handleSelect = (id: MuscleGroupId) => {
    setInternalSelected(id);
    if (onSelectMuscle) onSelectMuscle(id);
  };

  // Helper to determine colors and status by recovery value
  const getMuscleStatus = (value: number) => {
    if (value >= 75) {
      return {
        level: "optimal" as const,
        glowColor: "#10b981",
        secondaryColor: "#06b6d4",
        badgeBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        label: "100% Recuperado",
        shortLabel: "Óptimo",
        advice: "Fibras completamente regeneradas. Listo para sobrecarga progresiva y alta intensidad.",
        restHours: "0h de descanso restante",
      };
    }
    if (value >= 40) {
      return {
        level: "recovering" as const,
        glowColor: "#f59e0b",
        secondaryColor: "#fbbf24",
        badgeBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        label: "En Recuperación",
        shortLabel: "Recuperando",
        advice: "Síntesis proteica activa. Se recomienda descanso o entrenamiento de muy bajo impacto hoy.",
        restHours: "~12 a 24h restantes",
      };
    }
    return {
      level: "fatigued" as const,
      glowColor: "#ef4444",
      secondaryColor: "#f43f5e",
      badgeBg: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      label: "Fatiga Aguda / Sobrecarga",
      shortLabel: "Fatigado",
      advice: "Microrroturas y congestión elevadas. Evita entrenar este grupo hoy para prevenir lesión o sobreentrenamiento.",
      restHours: "~24 a 48h de descanso",
    };
  };

  // Calculate Overall System Readiness Score
  const allValues = [
    recovery.chest,
    recovery.back,
    recovery.legs,
    recovery.shoulders,
    recovery.arms,
    recovery.core,
  ];
  const overallScore = Math.round(allValues.reduce((s, v) => s + v, 0) / allValues.length);
  const overallStatus = getMuscleStatus(overallScore);

  const activeMeta = MUSCLE_METAS[selectedMuscleId] || MUSCLE_METAS.chest;
  const activeValue = recovery[selectedMuscleId] ?? 100;
  const activeStatus = getMuscleStatus(activeValue);

  return (
    <div className="bg-gradient-to-b from-[#10131f] via-[#0d0f18] to-[#08090f] rounded-3xl border border-gray-800/80 p-5 shadow-2xl overflow-hidden text-white relative">
      {/* Background ambient radial glow matched to active selected muscle */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${activeStatus.glowColor} 0%, transparent 70%)`,
        }}
      />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shadow-md transition-colors"
            style={{
              backgroundColor: `${activeStatus.glowColor}20`,
              color: activeStatus.glowColor,
              border: `1px solid ${activeStatus.glowColor}40`,
            }}
          >
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-gray-400 block">
              Mapa Biomecánico de Fatiga
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-white">
                Rendimiento: {overallScore}%
              </span>
              <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-bold border ${overallStatus.badgeBg}`}>
                {overallStatus.shortLabel}
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher: Frente vs Espalda */}
        <div className="flex bg-black/50 p-1 rounded-2xl border border-white/10 gap-1 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setView("front")}
            className={`px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              view === "front"
                ? "bg-white/15 text-white font-black shadow-md border border-white/10"
                : "text-white/40 hover:text-white"
            }`}
          >
            <span>Frente</span>
          </button>
          <button
            type="button"
            onClick={() => setView("back")}
            className={`px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              view === "back"
                ? "bg-white/15 text-white font-black shadow-md border border-white/10"
                : "text-white/40 hover:text-white"
            }`}
          >
            <span>Espalda</span>
          </button>
        </div>
      </div>

      {/* Main Interactive SVG Body Container */}
      <div className="relative flex flex-col items-center justify-center py-2 min-h-[270px] z-10 select-none">
        
        {/* SVG Anatomical Human Body Heatmap */}
        <AnimatePresence mode="wait">
          {view === "front" ? (
            <motion.div
              key="front-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="relative flex items-center justify-center w-full max-w-[240px] h-[260px]"
            >
              <svg
                viewBox="0 0 200 240"
                className="w-full h-full drop-shadow-[0_0_25px_rgba(0,0,0,0.8)] cursor-pointer"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Dynamic Shaders for Front Muscles */}
                  {(["chest", "shoulders", "arms", "core", "legs"] as MuscleGroupId[]).map((mId) => {
                    const st = getMuscleStatus(recovery[mId] ?? 100);
                    return (
                      <linearGradient key={mId} id={`grad-front-${mId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={st.secondaryColor} stopOpacity={selectedMuscleId === mId ? 0.95 : 0.75} />
                        <stop offset="100%" stopColor={st.glowColor} stopOpacity={selectedMuscleId === mId ? 0.95 : 0.65} />
                      </linearGradient>
                    );
                  })}

                  <filter id="fatiguePulse" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Head, Neck, Clavicles (Anatomical frame) */}
                <circle cx="100" cy="22" r="13" stroke="#ffffff25" strokeWidth="1.5" fill="#ffffff08" />
                <path d="M95 35 L95 44 L105 44 L105 35" stroke="#ffffff30" strokeWidth="1.5" />
                <path d="M78 45 L100 48 L122 45" stroke="#ffffff25" strokeWidth="1.2" strokeLinecap="round" />

                {/* SHOULDERS / DELTOIDS (Front) */}
                <g onClick={() => handleSelect("shoulders")} className="cursor-pointer">
                  {/* Left Shoulder */}
                  <path
                    d="M75 48 C65 50 52 60 48 72 C46 80 50 88 56 88 C64 88 68 80 72 70 C74 66 76 56 75 48 Z"
                    fill="url(#grad-front-shoulders)"
                    stroke={selectedMuscleId === "shoulders" ? "#ffffff" : getMuscleStatus(recovery.shoulders).glowColor}
                    strokeWidth={selectedMuscleId === "shoulders" ? "2.2" : "1.4"}
                    filter={recovery.shoulders < 40 ? "url(#fatiguePulse)" : undefined}
                    className="transition-all hover:opacity-100"
                  />
                  {/* Right Shoulder */}
                  <path
                    d="M125 48 C135 50 148 60 152 72 C154 80 150 88 144 88 C136 88 132 80 128 70 C126 66 124 56 125 48 Z"
                    fill="url(#grad-front-shoulders)"
                    stroke={selectedMuscleId === "shoulders" ? "#ffffff" : getMuscleStatus(recovery.shoulders).glowColor}
                    strokeWidth={selectedMuscleId === "shoulders" ? "2.2" : "1.4"}
                    filter={recovery.shoulders < 40 ? "url(#fatiguePulse)" : undefined}
                    className="transition-all hover:opacity-100"
                  />
                </g>

                {/* CHEST / PECTORALS */}
                <g onClick={() => handleSelect("chest")} className="cursor-pointer">
                  {/* Left Pec */}
                  <path
                    d="M74 50 C82 50 96 54 98 70 C98 80 84 84 74 82 C66 80 64 70 66 62 C68 54 71 50 74 50 Z"
                    fill="url(#grad-front-chest)"
                    stroke={selectedMuscleId === "chest" ? "#ffffff" : getMuscleStatus(recovery.chest).glowColor}
                    strokeWidth={selectedMuscleId === "chest" ? "2.4" : "1.5"}
                    filter={recovery.chest < 40 ? "url(#fatiguePulse)" : undefined}
                    className="transition-all hover:opacity-100"
                  />
                  {/* Right Pec */}
                  <path
                    d="M126 50 C118 50 104 54 102 70 C102 80 116 84 126 82 C134 80 136 70 134 62 C132 54 129 50 126 50 Z"
                    fill="url(#grad-front-chest)"
                    stroke={selectedMuscleId === "chest" ? "#ffffff" : getMuscleStatus(recovery.chest).glowColor}
                    strokeWidth={selectedMuscleId === "chest" ? "2.4" : "1.5"}
                    filter={recovery.chest < 40 ? "url(#fatiguePulse)" : undefined}
                    className="transition-all hover:opacity-100"
                  />
                </g>

                {/* ARMS / BICEPS & FOREARMS (Front) */}
                <g onClick={() => handleSelect("arms")} className="cursor-pointer">
                  {/* Left Arm */}
                  <path
                    d="M50 78 C44 86 40 102 42 116 C43 122 48 126 52 120 C56 112 60 96 58 84 Z"
                    fill="url(#grad-front-arms)"
                    stroke={selectedMuscleId === "arms" ? "#ffffff" : getMuscleStatus(recovery.arms).glowColor}
                    strokeWidth={selectedMuscleId === "arms" ? "2.2" : "1.3"}
                    filter={recovery.arms < 40 ? "url(#fatiguePulse)" : undefined}
                    className="transition-all hover:opacity-100"
                  />
                  {/* Right Arm */}
                  <path
                    d="M150 78 C156 86 160 102 158 116 C157 122 152 126 148 120 C144 112 140 96 142 84 Z"
                    fill="url(#grad-front-arms)"
                    stroke={selectedMuscleId === "arms" ? "#ffffff" : getMuscleStatus(recovery.arms).glowColor}
                    strokeWidth={selectedMuscleId === "arms" ? "2.2" : "1.3"}
                    filter={recovery.arms < 40 ? "url(#fatiguePulse)" : undefined}
                    className="transition-all hover:opacity-100"
                  />
                </g>

                {/* CORE / ABDOMINALS (Front) */}
                <g onClick={() => handleSelect("core")} className="cursor-pointer">
                  <g
                    stroke={selectedMuscleId === "core" ? "#ffffff" : getMuscleStatus(recovery.core).glowColor}
                    strokeWidth={selectedMuscleId === "core" ? "1.8" : "1.2"}
                    fill="url(#grad-front-core)"
                    filter={recovery.core < 40 ? "url(#fatiguePulse)" : undefined}
                  >
                    {/* Upper Abs */}
                    <rect x="88" y="85" width="10" height="9" rx="2" />
                    <rect x="102" y="85" width="10" height="9" rx="2" />
                    {/* Mid Abs */}
                    <rect x="88" y="97" width="10" height="9" rx="2" />
                    <rect x="102" y="97" width="10" height="9" rx="2" />
                    {/* Lower Abs */}
                    <rect x="89" y="109" width="9" height="9" rx="2" />
                    <rect x="102" y="109" width="9" height="9" rx="2" />
                  </g>
                  {/* Obliques */}
                  <path
                    d="M72 84 C76 98 78 112 84 118 C80 118 75 110 72 98 Z"
                    fill="url(#grad-front-core)"
                    stroke={selectedMuscleId === "core" ? "#ffffff" : getMuscleStatus(recovery.core).glowColor}
                    strokeWidth={selectedMuscleId === "core" ? "1.6" : "1"}
                  />
                  <path
                    d="M128 84 C124 98 122 112 116 118 C120 118 125 110 128 98 Z"
                    fill="url(#grad-front-core)"
                    stroke={selectedMuscleId === "core" ? "#ffffff" : getMuscleStatus(recovery.core).glowColor}
                    strokeWidth={selectedMuscleId === "core" ? "1.6" : "1"}
                  />
                </g>

                {/* LEGS / QUADRICEPS (Front) */}
                <g onClick={() => handleSelect("legs")} className="cursor-pointer">
                  {/* Left Thigh / Quad */}
                  <path
                    d="M78 124 C68 136 64 162 66 182 C70 190 82 192 88 184 C92 172 94 150 92 126 Z"
                    fill="url(#grad-front-legs)"
                    stroke={selectedMuscleId === "legs" ? "#ffffff" : getMuscleStatus(recovery.legs).glowColor}
                    strokeWidth={selectedMuscleId === "legs" ? "2.4" : "1.5"}
                    filter={recovery.legs < 40 ? "url(#fatiguePulse)" : undefined}
                    className="transition-all hover:opacity-100"
                  />
                  {/* Right Thigh / Quad */}
                  <path
                    d="M122 124 C132 136 136 162 134 182 C130 190 118 192 112 184 C108 172 106 150 108 126 Z"
                    fill="url(#grad-front-legs)"
                    stroke={selectedMuscleId === "legs" ? "#ffffff" : getMuscleStatus(recovery.legs).glowColor}
                    strokeWidth={selectedMuscleId === "legs" ? "2.4" : "1.5"}
                    filter={recovery.legs < 40 ? "url(#fatiguePulse)" : undefined}
                    className="transition-all hover:opacity-100"
                  />
                  {/* Calves (Front Tibial & Gastrocnemius edges) */}
                  <path
                    d="M72 194 C68 206 70 224 74 234 C78 236 82 232 84 220 C85 208 84 196 82 192 Z"
                    fill="url(#grad-front-legs)"
                    opacity="0.8"
                    stroke={selectedMuscleId === "legs" ? "#ffffff" : getMuscleStatus(recovery.legs).glowColor}
                    strokeWidth="1.2"
                  />
                  <path
                    d="M128 194 C132 206 130 224 126 234 C122 236 118 232 116 220 C115 208 116 196 118 192 Z"
                    fill="url(#grad-front-legs)"
                    opacity="0.8"
                    stroke={selectedMuscleId === "legs" ? "#ffffff" : getMuscleStatus(recovery.legs).glowColor}
                    strokeWidth="1.2"
                  />
                </g>
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="back-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="relative flex items-center justify-center w-full max-w-[240px] h-[260px]"
            >
              <svg
                viewBox="0 0 200 240"
                className="w-full h-full drop-shadow-[0_0_25px_rgba(0,0,0,0.8)] cursor-pointer"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Dynamic Shaders for Back Muscles */}
                  {(["back", "shoulders", "arms", "legs", "core"] as MuscleGroupId[]).map((mId) => {
                    const st = getMuscleStatus(recovery[mId] ?? 100);
                    return (
                      <linearGradient key={mId} id={`grad-back-${mId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={st.secondaryColor} stopOpacity={selectedMuscleId === mId ? 0.95 : 0.75} />
                        <stop offset="100%" stopColor={st.glowColor} stopOpacity={selectedMuscleId === mId ? 0.95 : 0.65} />
                      </linearGradient>
                    );
                  })}
                </defs>

                {/* Back of Head & Cervical */}
                <circle cx="100" cy="22" r="13" stroke="#ffffff25" strokeWidth="1.5" fill="#ffffff08" />
                <path d="M96 35 L96 46 L104 46 L104 35" stroke="#ffffff30" strokeWidth="1.5" />
                {/* Spine centerline */}
                <line x1="100" y1="48" x2="100" y2="124" stroke="#ffffff20" strokeWidth="1" strokeDasharray="2 3" />

                {/* SHOULDERS / REAR DELTS */}
                <g onClick={() => handleSelect("shoulders")} className="cursor-pointer">
                  <path
                    d="M74 48 C64 52 50 62 48 74 C47 82 52 88 56 86 C62 82 68 72 72 62 Z"
                    fill="url(#grad-back-shoulders)"
                    stroke={selectedMuscleId === "shoulders" ? "#ffffff" : getMuscleStatus(recovery.shoulders).glowColor}
                    strokeWidth={selectedMuscleId === "shoulders" ? "2.2" : "1.4"}
                    filter={recovery.shoulders < 40 ? "url(#fatiguePulse)" : undefined}
                  />
                  <path
                    d="M126 48 C136 52 150 62 152 74 C153 82 148 88 144 86 C138 82 132 72 128 62 Z"
                    fill="url(#grad-back-shoulders)"
                    stroke={selectedMuscleId === "shoulders" ? "#ffffff" : getMuscleStatus(recovery.shoulders).glowColor}
                    strokeWidth={selectedMuscleId === "shoulders" ? "2.2" : "1.4"}
                    filter={recovery.shoulders < 40 ? "url(#fatiguePulse)" : undefined}
                  />
                </g>

                {/* BACK / TRAPS, LATS & RHOMBOIDS */}
                <g onClick={() => handleSelect("back")} className="cursor-pointer">
                  {/* Upper Trapezius Diamond */}
                  <path
                    d="M100 46 L118 56 L100 82 L82 56 Z"
                    fill="url(#grad-back-back)"
                    stroke={selectedMuscleId === "back" ? "#ffffff" : getMuscleStatus(recovery.back).glowColor}
                    strokeWidth={selectedMuscleId === "back" ? "2.2" : "1.3"}
                    filter={recovery.back < 40 ? "url(#fatiguePulse)" : undefined}
                  />
                  {/* Left Lat (Dorsal Ancho) */}
                  <path
                    d="M80 62 C74 76 68 98 78 116 C84 116 88 106 92 88 C94 80 92 70 80 62 Z"
                    fill="url(#grad-back-back)"
                    stroke={selectedMuscleId === "back" ? "#ffffff" : getMuscleStatus(recovery.back).glowColor}
                    strokeWidth={selectedMuscleId === "back" ? "2.4" : "1.5"}
                    filter={recovery.back < 40 ? "url(#fatiguePulse)" : undefined}
                  />
                  {/* Right Lat (Dorsal Ancho) */}
                  <path
                    d="M120 62 C126 76 132 98 122 116 C116 116 112 106 108 88 C106 80 108 70 120 62 Z"
                    fill="url(#grad-back-back)"
                    stroke={selectedMuscleId === "back" ? "#ffffff" : getMuscleStatus(recovery.back).glowColor}
                    strokeWidth={selectedMuscleId === "back" ? "2.4" : "1.5"}
                    filter={recovery.back < 40 ? "url(#fatiguePulse)" : undefined}
                  />
                </g>

                {/* TRICEPS / POSTERIOR ARMS */}
                <g onClick={() => handleSelect("arms")} className="cursor-pointer">
                  {/* Left Tricep */}
                  <path
                    d="M48 80 C44 90 42 106 44 118 C46 122 50 124 53 118 C56 110 58 96 56 86 Z"
                    fill="url(#grad-back-arms)"
                    stroke={selectedMuscleId === "arms" ? "#ffffff" : getMuscleStatus(recovery.arms).glowColor}
                    strokeWidth={selectedMuscleId === "arms" ? "2.2" : "1.3"}
                    filter={recovery.arms < 40 ? "url(#fatiguePulse)" : undefined}
                  />
                  {/* Right Tricep */}
                  <path
                    d="M152 80 C156 90 158 106 156 118 C154 122 150 124 147 118 C144 110 142 96 144 86 Z"
                    fill="url(#grad-back-arms)"
                    stroke={selectedMuscleId === "arms" ? "#ffffff" : getMuscleStatus(recovery.arms).glowColor}
                    strokeWidth={selectedMuscleId === "arms" ? "2.2" : "1.3"}
                    filter={recovery.arms < 40 ? "url(#fatiguePulse)" : undefined}
                  />
                </g>

                {/* LOWER BACK / CORE POSTERIOR (Erectores Espinales) */}
                <g onClick={() => handleSelect("core")} className="cursor-pointer">
                  <path
                    d="M86 114 C90 114 96 116 97 124 C97 128 89 130 85 128 C83 124 84 118 86 114 Z"
                    fill="url(#grad-back-core)"
                    stroke={selectedMuscleId === "core" ? "#ffffff" : getMuscleStatus(recovery.core).glowColor}
                    strokeWidth={selectedMuscleId === "core" ? "2" : "1.2"}
                  />
                  <path
                    d="M114 114 C110 114 104 116 103 124 C103 128 111 130 115 128 C117 124 116 118 114 114 Z"
                    fill="url(#grad-back-core)"
                    stroke={selectedMuscleId === "core" ? "#ffffff" : getMuscleStatus(recovery.core).glowColor}
                    strokeWidth={selectedMuscleId === "core" ? "2" : "1.2"}
                  />
                </g>

                {/* GLUTES, HAMSTRINGS & CALVES / LEGS POSTERIOR */}
                <g onClick={() => handleSelect("legs")} className="cursor-pointer">
                  {/* Gluteus Left */}
                  <path
                    d="M78 126 C86 126 96 130 96 146 C96 156 86 160 76 156 C68 150 68 136 78 126 Z"
                    fill="url(#grad-back-legs)"
                    stroke={selectedMuscleId === "legs" ? "#ffffff" : getMuscleStatus(recovery.legs).glowColor}
                    strokeWidth={selectedMuscleId === "legs" ? "2.4" : "1.5"}
                    filter={recovery.legs < 40 ? "url(#fatiguePulse)" : undefined}
                  />
                  {/* Gluteus Right */}
                  <path
                    d="M122 126 C114 126 104 130 104 146 C104 156 114 160 124 156 C132 150 132 136 122 126 Z"
                    fill="url(#grad-back-legs)"
                    stroke={selectedMuscleId === "legs" ? "#ffffff" : getMuscleStatus(recovery.legs).glowColor}
                    strokeWidth={selectedMuscleId === "legs" ? "2.4" : "1.5"}
                    filter={recovery.legs < 40 ? "url(#fatiguePulse)" : undefined}
                  />
                  {/* Hamstrings Left */}
                  <path
                    d="M74 158 C84 160 88 178 86 192 C80 196 74 192 70 182 C68 172 70 162 74 158 Z"
                    fill="url(#grad-back-legs)"
                    stroke={selectedMuscleId === "legs" ? "#ffffff" : getMuscleStatus(recovery.legs).glowColor}
                    strokeWidth="1.3"
                  />
                  {/* Hamstrings Right */}
                  <path
                    d="M126 158 C116 160 112 178 114 192 C120 196 126 192 130 182 C132 172 130 162 126 158 Z"
                    fill="url(#grad-back-legs)"
                    stroke={selectedMuscleId === "legs" ? "#ffffff" : getMuscleStatus(recovery.legs).glowColor}
                    strokeWidth="1.3"
                  />
                  {/* Calves Left & Right */}
                  <path
                    d="M72 196 C66 206 68 224 74 234 C78 236 82 232 84 220 C86 208 82 198 72 196 Z"
                    fill="url(#grad-back-legs)"
                    opacity="0.85"
                    stroke={selectedMuscleId === "legs" ? "#ffffff" : getMuscleStatus(recovery.legs).glowColor}
                    strokeWidth="1.2"
                  />
                  <path
                    d="M128 196 C134 206 132 224 126 234 C122 236 118 232 116 220 C114 208 118 198 128 196 Z"
                    fill="url(#grad-back-legs)"
                    opacity="0.85"
                    stroke={selectedMuscleId === "legs" ? "#ffffff" : getMuscleStatus(recovery.legs).glowColor}
                    strokeWidth="1.2"
                  />
                </g>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Tap Prompt / Hint */}
        <span className="text-[9.5px] text-gray-500 font-mono tracking-wider uppercase mt-1">
          Toca cualquier grupo muscular en el cuerpo para ver su estado
        </span>
      </div>

      {/* Selected Muscle Deep-Dive Detail Card */}
      <motion.div
        key={selectedMuscleId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 relative z-10"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
              {activeMeta.scientificName}
            </span>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>{activeMeta.label}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${activeStatus.badgeBg}`}>
                {activeStatus.label}
              </span>
            </h4>
          </div>

          <div className="text-right">
            <span
              className="text-2xl font-black font-mono leading-none block"
              style={{ color: activeStatus.glowColor }}
            >
              {activeValue}%
            </span>
            <span className="text-[9px] text-gray-400 font-mono">
              {activeStatus.restHours}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${activeValue}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(to right, ${activeStatus.secondaryColor}, ${activeStatus.glowColor})`,
              boxShadow: `0 0 10px ${activeStatus.glowColor}60`,
            }}
          />
        </div>

        <p className="text-[11px] text-gray-300 leading-relaxed">
          {activeStatus.advice}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9.5px] text-gray-400">
          <span>{activeMeta.description}</span>
        </div>
      </motion.div>

      {/* Quick Legend at bottom */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-around text-[9px] text-gray-400 font-medium">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          <span>75-100% Óptimo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          <span>40-74% Regenerando</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
          <span>&lt;40% Sobrecargado</span>
        </div>
      </div>
    </div>
  );
}
