import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingDown, TrendingUp, Minus, Plus, Trash2, Calendar, Scale, 
  Sparkles, Activity, Check, ChevronRight, Info, Award, Flame, RefreshCw,
  Percent, ArrowRight
} from "lucide-react";
import { UserProfile, BodyMetricLog } from "../types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { calculateRequirements, calculateBMI } from "../utils/fitnessUtils";

interface BodyEvolutionTrackerProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onOpenRecalibration: () => void;
}

export default function BodyEvolutionTracker({
  profile,
  onUpdateProfile,
  onOpenRecalibration
}: BodyEvolutionTrackerProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [inputWeight, setInputWeight] = useState<string>(profile.weight ? profile.weight.toString() : "");
  const [inputBodyFat, setInputBodyFat] = useState<string>(profile.bodyFat ? profile.bodyFat.toString() : "");
  const [logDate, setLogDate] = useState<string>(todayStr);
  const [activeChartMetric, setActiveChartMetric] = useState<"weight" | "fat">("weight");
  const [showHistory, setShowHistory] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Ensure there is at least an initial entry from profile data
  const logs: BodyMetricLog[] = (profile.bodyMetricLogs && profile.bodyMetricLogs.length > 0)
    ? [...profile.bodyMetricLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [
        {
          id: "initial",
          date: todayStr,
          weight: profile.weight,
          bodyFat: profile.bodyFat,
          method: "manual",
          notes: "Registro inicial"
        }
      ];

  const firstLog = logs[0];
  const lastLog = logs[logs.length - 1];

  const weightChange = (lastLog.weight - firstLog.weight).toFixed(1);
  const numWeightChange = parseFloat(weightChange);

  const fatLogs = logs.filter(l => l.bodyFat !== undefined && l.bodyFat > 0);
  const firstFatLog = fatLogs[0];
  const lastFatLog = fatLogs[fatLogs.length - 1];
  const fatChange = (firstFatLog && lastFatLog && firstFatLog.bodyFat !== undefined && lastFatLog.bodyFat !== undefined)
    ? (lastFatLog.bodyFat - firstFatLog.bodyFat).toFixed(1)
    : null;

  const handleAddLog = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const w = parseFloat(inputWeight);
    if (isNaN(w) || w <= 20 || w >= 350) return;

    const fat = inputBodyFat ? parseFloat(inputBodyFat) : undefined;
    const newLog: BodyMetricLog = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      date: logDate || todayStr,
      weight: w,
      bodyFat: fat && !isNaN(fat) ? fat : undefined,
      method: "manual"
    };

    // Filter out if there is already an entry for this exact date to replace it, or append
    const existing = (profile.bodyMetricLogs || []).filter(l => l.date !== newLog.date);
    const updatedLogs = [...existing, newLog].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Recalculate daily targets
    const reqs = calculateRequirements({
      weight: w,
      height: profile.height,
      age: profile.age,
      sex: profile.sex,
      goal: profile.goal,
      level: profile.level,
      bodyFat: fat || profile.bodyFat,
      activityLevel: profile.activityLevel,
      stepsRange: profile.stepsRange,
      deficitPace: profile.deficitPace,
      dietType: profile.dietType
    });

    onUpdateProfile({
      ...profile,
      weight: w,
      bodyFat: fat || profile.bodyFat,
      bmi: calculateBMI(w, profile.height),
      dailyCalorieTarget: reqs.calories,
      proteinTarget: reqs.protein,
      carbsTarget: reqs.carbs,
      fatTarget: reqs.fat,
      bodyMetricLogs: updatedLogs
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2200);
  };

  const handleDeleteLog = (id: string) => {
    if ((profile.bodyMetricLogs || []).length <= 1) return;
    const updatedLogs = (profile.bodyMetricLogs || []).filter(l => l.id !== id);
    onUpdateProfile({
      ...profile,
      bodyMetricLogs: updatedLogs
    });
  };

  // Chart calculation for active metric
  const chartData = (activeChartMetric === "weight" ? logs : fatLogs).map(l => ({
    date: l.date,
    value: activeChartMetric === "weight" ? l.weight : (l.bodyFat || 0),
    label: l.date.split("-").slice(1).join("/")
  })).filter(d => d.value > 0);

  const minVal = chartData.length > 0 ? Math.min(...chartData.map(d => d.value)) : 0;
  const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 100;
  const valRange = maxVal - minVal > 0 ? maxVal - minVal : 2;
  const paddedMin = Math.max(0, Math.floor(minVal - valRange * 0.2));
  const paddedMax = Math.ceil(maxVal + valRange * 0.2);
  const paddedRange = paddedMax - paddedMin || 1;

  const chartWidth = 320;
  const chartHeight = 130;
  const padX = 25;
  const padY = 18;

  const points = chartData.map((d, i) => {
    const x = chartData.length === 1
      ? chartWidth / 2
      : padX + (i / (chartData.length - 1)) * (chartWidth - padX * 2);
    const y = chartHeight - padY - ((d.value - paddedMin) / paddedRange) * (chartHeight - padY * 2);
    return { x, y, ...d };
  });

  const pathString = points.length > 1
    ? points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, "")
    : "";

  const areaString = points.length > 1
    ? `${pathString} L ${points[points.length - 1].x} ${chartHeight - padY} L ${points[0].x} ${chartHeight - padY} Z`
    : "";

  const isEmerald = activeChartMetric === "weight";
  const strokeColor = isEmerald ? "#10b981" : "#06b6d4";
  const gradId = isEmerald ? "weightGradient" : "fatGradient";

  return (
    <div className="bg-white dark:bg-[#161824] p-4.5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
      
      {/* Title */}
      <div>
        <span className="block text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <Scale className="h-4 w-4 text-emerald-400" />
          <span>Evolución y Control Corporal</span>
        </span>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
          Registra tus progresos para ver tu gráfico y calibrar tu nutrición.
        </p>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveChartMetric("weight")}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            activeChartMetric === "weight"
              ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
              : "bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Peso Actual</span>
            <span className={`w-2 h-2 rounded-full ${activeChartMetric === "weight" ? "bg-emerald-500" : "bg-transparent"}`} />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-black text-gray-900 dark:text-white">{lastLog.weight} <span className="text-[11px] font-bold">kg</span></span>
            {logs.length > 1 && (
              <span className={`text-[10px] font-black flex items-center gap-0.5 ${
                numWeightChange < 0 ? "text-emerald-500" : numWeightChange > 0 ? "text-amber-500" : "text-gray-400"
              }`}>
                {numWeightChange < 0 ? <TrendingDown className="h-3 w-3" /> : numWeightChange > 0 ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {numWeightChange > 0 ? `+${weightChange}` : weightChange}
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveChartMetric("fat")}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            activeChartMetric === "fat"
              ? "bg-cyan-500/10 border-cyan-500/40 shadow-xs"
              : "bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">% Grasa</span>
            <span className={`w-2 h-2 rounded-full ${activeChartMetric === "fat" ? "bg-cyan-500" : "bg-transparent"}`} />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-black text-gray-900 dark:text-white">
              {lastLog.bodyFat !== undefined && lastLog.bodyFat > 0 ? `${lastLog.bodyFat}%` : "--"}
            </span>
            {fatChange && (
              <span className={`text-[10px] font-black flex items-center gap-0.5 ${
                parseFloat(fatChange) < 0 ? "text-emerald-500" : "text-amber-500"
              }`}>
                {parseFloat(fatChange) < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {parseFloat(fatChange) > 0 ? `+${fatChange}%` : `${fatChange}%`}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Progress Chart */}
      <div className="bg-gray-50 dark:bg-[#0f101a] p-3 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {activeChartMetric === "weight" ? "Tendencia de Peso (kg)" : "Tendencia de Grasa (%)"}
          </span>

          <div className="flex bg-gray-200 dark:bg-gray-800 p-0.5 rounded-lg text-[9px] font-bold">
            <button
              type="button"
              onClick={() => setActiveChartMetric("weight")}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                activeChartMetric === "weight" ? "bg-white dark:bg-[#161824] text-emerald-500 dark:text-emerald-400 shadow-xs" : "text-gray-400"
              }`}
            >
              Peso
            </button>
            <button
              type="button"
              onClick={() => setActiveChartMetric("fat")}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                activeChartMetric === "fat" ? "bg-white dark:bg-[#161824] text-cyan-500 dark:text-cyan-400 shadow-xs" : "text-gray-400"
              }`}
            >
              % Grasa
            </button>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="py-7 text-center space-y-1">
            <Percent className="h-5 w-5 text-cyan-400 mx-auto opacity-50" />
            <p className="text-xs font-bold text-gray-900 dark:text-white">Sin registros de porcentaje de grasa</p>
            <p className="text-[10px] text-gray-400">
              Registra tu % de grasa al registrar peso o usa el analizador con IA.
            </p>
          </div>
        ) : chartData.length === 1 ? (
          <div className="py-6 text-center space-y-1">
            <div className={`inline-flex items-center justify-center p-2 rounded-full mb-1 ${
              isEmerald ? "bg-emerald-500/15 text-emerald-500" : "bg-cyan-500/15 text-cyan-500"
            }`}>
              <Scale className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-gray-900 dark:text-white">
              Primer registro: {chartData[0].value} {activeChartMetric === "weight" ? "kg" : "%"} ({chartData[0].date})
            </p>
            <p className="text-[10px] text-gray-400">
              Continúa registrando para visualizar tu curva de progreso.
            </p>
          </div>
        ) : (
          <div className="relative w-full overflow-hidden">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32 overflow-visible">
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="fatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1={padX} y1={padY} x2={chartWidth - padX} y2={padY} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
              <line x1={padX} y1={chartHeight / 2} x2={chartWidth - padX} y2={chartHeight / 2} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
              <line x1={padX} y1={chartHeight - padY} x2={chartWidth - padX} y2={chartHeight - padY} stroke="currentColor" strokeOpacity="0.15" />

              {/* Area */}
              {areaString && <path d={areaString} fill={`url(#${gradId})`} />}

              {/* Line */}
              {pathString && (
                <path
                  d={pathString}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill={strokeColor}
                    stroke="white"
                    strokeWidth="2"
                    className="shadow-sm"
                  />
                  <text
                    x={p.x}
                    y={p.y - 7}
                    textAnchor="middle"
                    className="text-[9px] font-black fill-gray-900 dark:fill-white font-mono"
                  >
                    {p.value}
                  </text>
                  <text
                    x={p.x}
                    y={chartHeight - 3}
                    textAnchor="middle"
                    className="text-[8px] font-semibold fill-gray-400"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* Quick Log Form (Responsive and never overflowing) */}
      <form onSubmit={handleAddLog} className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Registrar Entrada
          </span>
          
          {/* Compact interactive Calendar button */}
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-700 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition cursor-pointer shadow-xs">
            <Calendar className="h-3 w-3 text-emerald-400 shrink-0" />
            <span>{logDate === todayStr ? "Hoy" : logDate.split("-").slice(1).reverse().join("/")}</span>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>

        {/* 2-Column Inputs Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
              Peso (kg) *
            </label>
            <Input
              type="number"
              step="0.1"
              value={inputWeight}
              onChange={(e) => setInputWeight(e.target.value)}
              placeholder="Ej: 78.5"
              className="bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 font-bold"
              size="md"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
              % Grasa (opcional)
            </label>
            <Input
              type="number"
              step="0.1"
              value={inputBodyFat}
              onChange={(e) => setInputBodyFat(e.target.value)}
              placeholder="Ej: 15.0"
              className="bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 font-bold"
              size="md"
            />
          </div>
        </div>

        {/* Primary Save Weight Button (Robust and Styled) */}
        <button
          type="submit"
          className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-2xl shadow-md shadow-emerald-500/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3px]" />
          <span>Guardar Registro y Actualizar Metas</span>
        </button>

        {saveSuccess && (
          <div className="text-[11px] text-emerald-500 font-bold flex items-center justify-center gap-1.5 py-1">
            <Check className="h-3.5 w-3.5" />
            <span>Registro guardado e indicadores actualizados con éxito</span>
          </div>
        )}

        {/* Re-calibrate with AI CTA (Placed below Save Button as requested) */}
        <button
          type="button"
          onClick={onOpenRecalibration}
          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/15 hover:from-emerald-500/20 hover:to-teal-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-2xl active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <Sparkles className="h-4 w-4" />
          <span>Re-evaluación Completa y Recalibración con IA</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Expandable History Table */}
      {logs.length > 0 && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition cursor-pointer py-1"
          >
            <span>Historial de registros guardados ({logs.length})</span>
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showHistory ? "rotate-90" : ""}`} />
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 mt-2 max-h-48 overflow-y-auto no-scrollbar"
              >
                {logs.slice().reverse().map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-[#0f101a] rounded-xl border border-gray-200 dark:border-gray-800 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900 dark:text-white">{log.weight} kg</span>
                        {log.bodyFat && (
                          <span className="text-[10px] text-cyan-500 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            {log.bodyFat}% grasa
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400 block">{log.date}</span>
                    </div>

                    {logs.length > 1 && log.id !== "initial" && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1 text-gray-400 hover:text-red-400 transition rounded cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
