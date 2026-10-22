import React, { useState } from "react";
import { motion } from "motion/react";
import { Zap, Activity, Info, Sparkles, Flame } from "lucide-react";

interface CreatineMuscleVisualizerProps {
  saturation: number; // 60 to 100
  streak: number;
  takenToday: boolean;
  statusLabel: string;
}

export default function CreatineMuscleVisualizer({
  saturation,
  streak,
  takenToday,
  statusLabel,
}: CreatineMuscleVisualizerProps) {
  const [activeView, setActiveView] = useState<"body" | "bicep">("body");

  // Normalized saturation ratio: 0 (at 60%) to 1 (at 100%)
  const ratio = Math.max(0, Math.min(1, (saturation - 60) / 40));

  // Determine dynamic glowing colors based on saturation
  // > 90%: Ultra electric cyan & emerald
  // 75-89%: Emerald green
  // 65-74%: Warm amber
  // < 65%: Muted cyan/slate
  const glowColor =
    saturation >= 90
      ? "#10b981"
      : saturation >= 75
      ? "#34d399"
      : saturation >= 65
      ? "#f59e0b"
      : "#64748b";

  const glowSecondary =
    saturation >= 90
      ? "#06b6d4"
      : saturation >= 75
      ? "#10b981"
      : saturation >= 65
      ? "#fbbf24"
      : "#475569";

  const fillOpacity = 0.35 + ratio * 0.55; // 0.35 to 0.90

  return (
    <div className="relative bg-gradient-to-b from-gray-900 via-[#10121d] to-[#0a0b12] rounded-3xl border border-gray-800/80 p-5 shadow-2xl overflow-hidden text-white">
      {/* Background ambient radial glow matching saturation */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        }}
      />

      {/* Top Header bar inside card */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-md transition-colors"
            style={{
              backgroundColor: `${glowColor}25`,
              color: glowColor,
              border: `1px solid ${glowColor}40`,
            }}
          >
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-gray-400 block">
              Saturación de Fosfocreatina
            </span>
            <span className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
              <span>{statusLabel}</span>
              {saturation >= 95 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-bold">
                  <Sparkles className="h-2.5 w-2.5" /> 100% Pico
                </span>
              )}
            </span>
          </div>
        </div>

        {/* View Switcher: Cuerpo vs Bíceps */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 gap-1 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setActiveView("body")}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeView === "body"
                ? "bg-white/15 text-white font-black shadow-sm"
                : "text-white/40 hover:text-white"
            }`}
          >
            Cuerpo
          </button>
          <button
            type="button"
            onClick={() => setActiveView("bicep")}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              activeView === "bicep"
                ? "bg-white/15 text-white font-black shadow-sm"
                : "text-white/40 hover:text-white"
            }`}
          >
            Bíceps / Fibra
          </button>
        </div>
      </div>

      {/* Main Visual Arena */}
      <div className="relative flex flex-col items-center justify-center py-4 min-h-[260px] z-10">
        
        {/* Floating Sparks / ATP Cellular particles */}
        {saturation >= 80 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  y: 40,
                  x: (i - 2.5) * 35,
                  scale: 0.5,
                }}
                animate={{
                  opacity: [0, 0.8, 0],
                  y: [-20, -110],
                  scale: [0.5, 1.2, 0.3],
                }}
                transition={{
                  duration: 2.2 + (i % 3) * 0.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeOut",
                }}
                className="absolute bottom-16 left-1/2 w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: glowColor,
                  boxShadow: `0 0 8px ${glowColor}`,
                }}
              />
            ))}
          </div>
        )}

        {/* VIEW 1: Anatomical Muscular Silhouette */}
        {activeView === "body" && (
          <motion.div
            key="body"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative flex items-center justify-center w-full max-w-[220px] h-[230px]"
          >
            <svg
              viewBox="0 0 200 240"
              className="w-full h-full drop-shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Bioluminescent Gradient */}
                <linearGradient id="muscleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={glowSecondary} stopOpacity={fillOpacity} />
                  <stop offset="60%" stopColor={glowColor} stopOpacity={fillOpacity * 0.9} />
                  <stop offset="100%" stopColor={glowColor} stopOpacity={fillOpacity * 0.7} />
                </linearGradient>

                {/* Filter for pulsing glow */}
                <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Head / Neck */}
              <circle cx="100" cy="24" r="14" stroke="#ffffff20" strokeWidth="1.5" fill="#ffffff08" />
              <path d="M94 38 L94 48 L106 48 L106 38" stroke="#ffffff30" strokeWidth="1.5" />

              {/* Traps & Shoulders (Deltoids) */}
              <path
                d="M75 52 C65 54 52 64 48 76 C46 84 50 94 56 94 C64 94 68 84 72 74 C74 70 76 60 75 52 Z"
                fill="url(#muscleGlow)"
                stroke={glowColor}
                strokeWidth="1.5"
                filter={saturation >= 85 ? "url(#glowFilter)" : undefined}
              />
              <path
                d="M125 52 C135 54 148 64 152 76 C154 84 150 94 144 94 C136 94 132 84 128 74 C126 70 124 60 125 52 Z"
                fill="url(#muscleGlow)"
                stroke={glowColor}
                strokeWidth="1.5"
                filter={saturation >= 85 ? "url(#glowFilter)" : undefined}
              />

              {/* Biceps & Forearms (Arms) */}
              <path
                d="M50 82 C44 90 40 106 42 120 C43 126 48 130 52 124 C56 116 60 100 58 88 Z"
                fill="url(#muscleGlow)"
                stroke={glowColor}
                strokeWidth="1.2"
              />
              <path
                d="M150 82 C156 90 160 106 158 120 C157 126 152 130 148 124 C144 116 140 100 142 88 Z"
                fill="url(#muscleGlow)"
                stroke={glowColor}
                strokeWidth="1.2"
              />

              {/* Pectorals (Chest) */}
              <path
                d="M74 54 C82 54 96 58 98 74 C98 84 84 88 74 86 C66 84 64 74 66 66 C68 58 71 54 74 54 Z"
                fill="url(#muscleGlow)"
                stroke={glowColor}
                strokeWidth="1.5"
                filter={saturation >= 85 ? "url(#glowFilter)" : undefined}
              />
              <path
                d="M126 54 C118 54 104 58 102 74 C102 84 116 88 126 86 C134 84 136 74 134 66 C132 58 129 54 126 54 Z"
                fill="url(#muscleGlow)"
                stroke={glowColor}
                strokeWidth="1.5"
                filter={saturation >= 85 ? "url(#glowFilter)" : undefined}
              />

              {/* Core / Abdominals (6-pack energy grid) */}
              <g stroke={glowColor} strokeWidth="1.2" fill="url(#muscleGlow)">
                {/* Upper Abs */}
                <rect x="88" y="90" width="10" height="9" rx="2" />
                <rect x="102" y="90" width="10" height="9" rx="2" />
                {/* Mid Abs */}
                <rect x="88" y="102" width="10" height="10" rx="2" />
                <rect x="102" y="102" width="10" height="10" rx="2" />
                {/* Lower Abs */}
                <rect x="89" y="115" width="9" height="10" rx="2" />
                <rect x="102" y="115" width="9" height="10" rx="2" />
              </g>

              {/* Obliques & Lats */}
              <path
                d="M68 86 C72 100 76 118 82 126 C78 126 72 116 68 102 Z"
                fill="url(#muscleGlow)"
                opacity="0.8"
              />
              <path
                d="M132 86 C128 100 124 118 118 126 C122 126 128 116 132 102 Z"
                fill="url(#muscleGlow)"
                opacity="0.8"
              />

              {/* Quadriceps (Thighs) */}
              <path
                d="M80 134 C72 144 68 168 70 190 C72 198 84 200 88 188 C92 174 94 152 92 134 Z"
                fill="url(#muscleGlow)"
                stroke={glowColor}
                strokeWidth="1.4"
                filter={saturation >= 85 ? "url(#glowFilter)" : undefined}
              />
              <path
                d="M120 134 C128 144 132 168 130 190 C128 198 116 200 112 188 C108 174 106 152 108 134 Z"
                fill="url(#muscleGlow)"
                stroke={glowColor}
                strokeWidth="1.4"
                filter={saturation >= 85 ? "url(#glowFilter)" : undefined}
              />

              {/* Calves */}
              <path
                d="M72 196 C70 206 72 224 76 232 C78 232 84 228 84 218 C84 208 82 198 80 196 Z"
                fill="url(#muscleGlow)"
                stroke={glowColor}
                strokeWidth="1"
              />
              <path
                d="M128 196 C130 206 128 224 124 232 C122 232 116 228 116 218 C116 208 118 198 120 196 Z"
                fill="url(#muscleGlow)"
                stroke={glowColor}
                strokeWidth="1"
              />

              {/* Subtle Body Outline Wireframe */}
              <path
                d="M100 38 L100 132 M85 130 L100 138 L115 130"
                stroke="#ffffff25"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
            </svg>
          </motion.div>
        )}

        {/* VIEW 2: Flexed Arm / Muscle Fiber Bundle with cellular phosphocreatine loading */}
        {activeView === "bicep" && (
          <motion.div
            key="bicep"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative flex items-center justify-center w-full max-w-[240px] h-[230px]"
          >
            <svg
              viewBox="0 0 240 220"
              className="w-full h-full drop-shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bicepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={glowSecondary} stopOpacity={fillOpacity} />
                  <stop offset="50%" stopColor={glowColor} stopOpacity={fillOpacity * 0.95} />
                  <stop offset="100%" stopColor={glowColor} stopOpacity={fillOpacity * 0.6} />
                </linearGradient>
              </defs>

              {/* Shoulder base */}
              <path
                d="M30 110 C35 70 65 50 90 55 C100 58 105 75 95 85 C80 98 60 115 45 125 Z"
                fill="url(#bicepGrad)"
                stroke={glowColor}
                strokeWidth="1.5"
              />

              {/* Flexed Bicep Peak (Anatomical bulge) */}
              <path
                d="M85 60 C110 30 150 40 170 85 C175 98 165 115 150 118 C125 122 95 105 85 85 Z"
                fill="url(#bicepGrad)"
                stroke={glowColor}
                strokeWidth="2"
                filter={saturation >= 85 ? "url(#glowFilter)" : undefined}
              />

              {/* Internal Muscle Fibers Strands (Striations) */}
              <g stroke={glowColor} strokeWidth="1.2" opacity={0.7 + ratio * 0.3}>
                <path d="M100 62 C120 48 140 55 158 82" strokeDasharray="3 2" />
                <path d="M105 72 C122 60 142 66 156 94" strokeDasharray="4 2" />
                <path d="M110 82 C124 74 140 78 152 105" strokeDasharray="3 2" />
                <path d="M115 92 C126 86 138 90 146 112" strokeDasharray="2 2" />
              </g>

              {/* Triceps (under-arm muscle) */}
              <path
                d="M80 95 C95 110 120 125 145 122 C148 135 135 150 115 152 C90 155 70 135 65 120 Z"
                fill="url(#bicepGrad)"
                stroke={glowColor}
                strokeWidth="1.5"
              />

              {/* Forearm flex */}
              <path
                d="M165 85 C185 70 205 75 215 95 C220 115 200 135 180 145 C165 150 150 135 150 120 Z"
                fill="url(#bicepGrad)"
                stroke={glowColor}
                strokeWidth="1.5"
              />

              {/* ATP Energy Core Symbol inside the muscle */}
              <g transform="translate(122, 75)">
                <circle cx="8" cy="8" r="14" fill="#00000080" stroke={glowColor} strokeWidth="1.5" />
                <path
                  d="M9 2 L5 9 L9 9 L7 14 L12 7 L8 7 Z"
                  fill={glowColor}
                  filter="drop-shadow(0 0 4px currentColor)"
                />
              </g>

              {/* Label text */}
              <text x="120" y="185" textAnchor="middle" fill="#ffffff80" fontSize="10" fontFamily="monospace">
                RESERVAS DE FOSFOCREATINA (PCr)
              </text>
              <text x="120" y="200" textAnchor="middle" fill={glowColor} fontSize="11" fontWeight="bold">
                {saturation >= 90 ? "⚡ SATURACIÓN COMPLETA" : "🔋 EN PROCESO DE CARGA"}
              </text>
            </svg>
          </motion.div>
        )}

        {/* Live Circular Saturation Badge floating in bottom corner */}
        <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 shadow-lg">
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* SVG mini circular meter */}
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="#ffffff15"
                strokeWidth="3"
                fill="transparent"
              />
              <motion.circle
                cx="20"
                cy="20"
                r="16"
                stroke={glowColor}
                strokeWidth="3.5"
                strokeDasharray={2 * Math.PI * 16}
                initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                animate={{
                  strokeDashoffset:
                    2 * Math.PI * 16 * (1 - saturation / 100),
                }}
                transition={{ duration: 1, ease: "easeOut" }}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-[11px] font-black font-mono text-white">
              {saturation}%
            </span>
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-bold">
              Nivel Muscular
            </span>
            <span
              className="block text-[11px] font-black font-mono"
              style={{ color: glowColor }}
            >
              {saturation >= 95 ? "ÓPTIMO" : saturation >= 80 ? "ALTO" : "BASE"}
            </span>
          </div>
        </div>

        {/* Streak Flame Pill */}
        {streak > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 px-2.5 py-1 rounded-xl shadow-md">
            <Flame className="h-3.5 w-3.5 text-orange-400 fill-orange-400 animate-pulse" />
            <span className="text-[10px] font-mono font-black text-orange-300">
              {streak} {streak === 1 ? "día" : "días"} seguidos
            </span>
          </div>
        )}
      </div>

      {/* Dynamic Physiological Explanation Footer */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-300">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          <span>
            {saturation >= 90
              ? "Resíntesis máxima de ATP: +15-20% energía explosiva."
              : saturation >= 75
              ? "Cargando depósitos celulares. Sigue tomándola a diario."
              : "Nivel de reserva estándar. Sube +1.5% con cada dosis diaria."}
          </span>
        </div>
      </div>
    </div>
  );
}
