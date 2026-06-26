import React, { useState } from "react";
import { motion } from "motion/react";
import { GlassWater, Droplets, Flame, RefreshCw, Plus, Check, Trash } from "lucide-react";
import { WaterLog } from "../types";

interface HydrationProps {
  waterLogs: WaterLog[];
  onAddWater: (amount: number) => void;
  onClearWater: () => void;
  dailyGoalMl?: number;
}

export default function Hydration({ waterLogs, onAddWater, onClearWater, dailyGoalMl = 2500 }: HydrationProps) {
  const [selectedQuickAdd, setSelectedQuickAdd] = useState<number>(250);

  const totalWater = waterLogs.reduce((acc, log) => acc + log.amount, 0);
  const percentage = Math.min(100, Math.round((totalWater / dailyGoalMl) * 100));

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0d0e15] text-gray-900 dark:text-gray-100 overflow-y-auto no-scrollbar pb-16">
      
      {/* Title */}
      <div className="p-6 pb-2 border-b border-gray-200 dark:border-gray-800/40">
        <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">Módulo Hidratación</span>
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-1.5 mt-0.5">
          <Droplets className="h-5 w-5 text-blue-400" />
          <span>Control de Hidratación</span>
        </h2>
      </div>

      <div className="px-6 py-6 space-y-6 flex-1 flex flex-col justify-start">
        
        {/* Progress Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#161824] p-4 rounded-2xl border border-gray-200 dark:border-gray-800/80 flex flex-col justify-between shadow-md dark:shadow-lg">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Total Consumido</span>
            <div>
              <span className="text-3xl font-black text-blue-500 dark:text-blue-400 tracking-tight">{totalWater}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-bold ml-1">/ {dailyGoalMl} ml</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161824] p-4 rounded-2xl border border-gray-200 dark:border-gray-800/80 flex flex-col justify-between shadow-md dark:shadow-lg">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Progreso diario</span>
            <div>
              <span className="text-3xl font-black text-emerald-500 dark:text-emerald-400 tracking-tight">{percentage}%</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-bold ml-1">completado</span>
            </div>
          </div>
        </div>

        {/* Dynamic Water Glass Visual Animation */}
        <div className="flex items-center justify-center py-6">
          <div className="relative w-40 h-56 border-4 border-gray-300 dark:border-gray-700 border-t-0 rounded-b-[40px] overflow-hidden bg-gray-100 dark:bg-gray-900/30 flex flex-col justify-end shadow-inner">
            
            {/* Fluid Volume Fill with Motion waves */}
            <motion.div
              animate={{
                height: `${percentage}%`,
              }}
              transition={{ type: "spring", stiffness: 40, damping: 12 }}
              className="w-full bg-gradient-to-t from-blue-600 to-blue-400 relative overflow-hidden"
              style={{ minHeight: "2%" }}
            >
              {/* Waves Simulation */}
              <div className="absolute inset-x-0 -top-3 h-4 bg-blue-300 opacity-50 wave-animation" />
            </motion.div>

            {/* Bubble Indicators inside the water glass */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-6 px-4">
              <div className="border-t border-gray-200 dark:border-gray-800/20 w-full text-[9px] text-gray-450 dark:text-gray-600 font-mono text-right">75%</div>
              <div className="border-t border-gray-200 dark:border-gray-800/20 w-full text-[9px] text-gray-450 dark:text-gray-600 font-mono text-right">50%</div>
              <div className="border-t border-gray-200 dark:border-gray-800/20 w-full text-[9px] text-gray-450 dark:text-gray-600 font-mono text-right">25%</div>
            </div>

            {/* Float glass content info */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-black text-white drop-shadow-md tracking-wider uppercase">
                {percentage}%
              </span>
              <span className="text-[10px] text-gray-300 drop-shadow-sm font-semibold">
                {totalWater} ml
              </span>
            </div>

          </div>
        </div>

        {/* Quick Add Buttons Row */}
        <div className="space-y-3">
          <span className="block text-xs font-semibold text-gray-550 dark:text-gray-400 uppercase tracking-wide text-center">
            Añadir volumen rápido
          </span>

          <div className="grid grid-cols-3 gap-2.5">
            {[250, 500, 750].map((amount) => (
              <button
                key={amount}
                onClick={() => onAddWater(amount)}
                className="bg-white dark:bg-[#161824] hover:bg-blue-600 border border-gray-200 dark:border-gray-800 hover:border-blue-500 rounded-2xl py-3 px-2 text-center transition flex flex-col items-center justify-center gap-1 shadow-md group active:scale-95 cursor-pointer"
              >
                <GlassWater className="h-5 w-5 text-blue-500 dark:text-blue-400 group-hover:text-white transition" />
                <span className="text-xs font-black text-gray-900 dark:text-white group-hover:text-white">+{amount} ml</span>
                <span className="text-[9px] text-gray-450 dark:text-gray-500 group-hover:text-blue-100 transition">
                  {amount === 250 ? "1 Vaso" : amount === 500 ? "1 Botella" : "Botella grande"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input Logger */}
        <div className="bg-white dark:bg-[#12131d] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-sm dark:shadow-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Medida Personalizada</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Suma ml específicos directos</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="50"
              value={selectedQuickAdd}
              onChange={(e) => setSelectedQuickAdd(Math.max(10, Number(e.target.value) || 250))}
              className="w-20 bg-gray-50 dark:bg-[#161824] border border-gray-250 dark:border-gray-800 rounded-lg text-center font-bold text-xs py-2 text-gray-900 dark:text-white outline-none"
            />
            <button
              onClick={() => onAddWater(selectedQuickAdd)}
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Reset / History */}
        {waterLogs.length > 0 && (
          <button
            onClick={onClearWater}
            className="w-full bg-white hover:bg-rose-50 dark:bg-gray-900 dark:hover:bg-rose-950/20 border border-gray-250 dark:border-gray-800 hover:border-rose-250 dark:hover:border-rose-900/30 text-xs text-gray-650 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 py-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm dark:shadow-none"
          >
            <Trash className="h-4 w-4" />
            <span>Limpiar registros del día</span>
          </button>
        )}

      </div>
    </div>
  );
}
