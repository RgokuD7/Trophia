import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, Moon, Smile, Sparkles, AlertTriangle, Camera, Trash2, Plus, Info, RefreshCw, Star, Zap, BookOpen, Search
} from "lucide-react";
import { UserProfile } from "../types";
import { analyzeInjuryByIA } from "../services/geminiService";
import scientificTips from "../data/scientificTips.json";

interface HealthWellnessProps {
  apiKey?: string;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

interface LocalProgressPhoto {
  id: string;
  date: string;
  base64Data: string;
}

export default function HealthWellness({ apiKey, userProfile, onUpdateProfile }: HealthWellnessProps) {
  const [activeSubTab, setActiveSubTab] = useState<"sleep_mood" | "injuries" | "photos" | "science">("sleep_mood");
  
  // Science tips search and filter state
  const [scienceSearch, setScienceSearch] = useState("");
  const [scienceCategory, setScienceCategory] = useState<string>("all");
  
  // Sleep & Mood state
  const [sleepHours, setSleepHours] = useState<number>(8);
  const [sleepQuality, setSleepQuality] = useState<number>(4);
  const [moodRating, setMoodRating] = useState<number>(7);
  const [energyRating, setEnergyRating] = useState<number>(7);
  const [notes, setNotes] = useState<string>("");
  const [isLoggedToday, setIsLoggedToday] = useState(false);

  // Injury triage state
  const [painDescription, setPainDescription] = useState<string>("");
  const [loadingTriage, setLoadingTriage] = useState(false);
  const [triageResult, setTriageResult] = useState<any | null>(null);

  // Progress photos state (stored locally in localStorage)
  const [photos, setPhotos] = useState<LocalProgressPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<LocalProgressPhoto | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  // Load progress photos and check today's logs on mount
  useEffect(() => {
    // Load photos
    const localPhotosStr = localStorage.getItem("trophia_progress_photos");
    if (localPhotosStr) {
      try {
        setPhotos(JSON.parse(localPhotosStr));
      } catch (e) {
        console.error("Error parsing progress photos", e);
      }
    }

    // Check if sleep/mood logged today
    const logsToday = (userProfile.sleepLogs || []).some(log => log.date === todayStr);
    setIsLoggedToday(logsToday);

    // If logged today, pre-fill inputs with logged data
    if (logsToday) {
      const todaySleep = (userProfile.sleepLogs || []).find(log => log.date === todayStr);
      const todayMood = (userProfile.moodLogs || []).find(log => log.date === todayStr);
      if (todaySleep) {
        setSleepHours(todaySleep.hours);
        setSleepQuality(todaySleep.quality);
      }
      if (todayMood) {
        setMoodRating(todayMood.mood);
        setEnergyRating(todayMood.energy);
        setNotes(todayMood.notes || "");
      }
    }
  }, [userProfile, todayStr]);

  // Log Sleep & Mood handler
  const handleSaveSleepMood = () => {
    const sleepLogs = [...(userProfile.sleepLogs || [])];
    const moodLogs = [...(userProfile.moodLogs || [])];

    // Filter out existing logs for today
    const filteredSleep = sleepLogs.filter(log => log.date !== todayStr);
    const filteredMood = moodLogs.filter(log => log.date !== todayStr);

    // Add new logs
    const updatedSleep = [
      { date: todayStr, hours: sleepHours, quality: sleepQuality },
      ...filteredSleep
    ];

    const updatedMood = [
      { date: todayStr, mood: moodRating, energy: energyRating, notes: notes.trim() },
      ...filteredMood
    ];

    onUpdateProfile({
      ...userProfile,
      sleepLogs: updatedSleep,
      moodLogs: updatedMood
    });

    setIsLoggedToday(true);
    setNotes("");
  };

  // IA Injury analysis handler
  const handleAnalyzeInjury = async () => {
    if (!painDescription.trim()) return;
    setLoadingTriage(true);
    setTriageResult(null);

    try {
      const data = await analyzeInjuryByIA(apiKey || "", painDescription, userProfile);
      setTriageResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTriage(false);
    }
  };

  // Add progress photo handler (loads base64)
  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const newPhoto: LocalProgressPhoto = {
        id: Math.random().toString(36).substr(2, 9),
        date: todayStr,
        base64Data
      };
      const updatedPhotos = [newPhoto, ...photos];
      setPhotos(updatedPhotos);
      localStorage.setItem("trophia_progress_photos", JSON.stringify(updatedPhotos));
    };
    reader.readAsDataURL(file);
  };

  // Delete progress photo
  const handleDeletePhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedPhotos = photos.filter(p => p.id !== id);
    setPhotos(updatedPhotos);
    localStorage.setItem("trophia_progress_photos", JSON.stringify(updatedPhotos));
  };

  // Averages calculations
  const avgSleepHours = userProfile.sleepLogs && userProfile.sleepLogs.length > 0
    ? (userProfile.sleepLogs.reduce((acc, log) => acc + log.hours, 0) / userProfile.sleepLogs.length).toFixed(1)
    : "0";

  const avgSleepQuality = userProfile.sleepLogs && userProfile.sleepLogs.length > 0
    ? (userProfile.sleepLogs.reduce((acc, log) => acc + log.quality, 0) / userProfile.sleepLogs.length).toFixed(1)
    : "0";

  const avgEnergy = userProfile.moodLogs && userProfile.moodLogs.length > 0
    ? (userProfile.moodLogs.reduce((acc, log) => acc + log.energy, 0) / userProfile.moodLogs.length).toFixed(1)
    : "0";

  const filteredTips = scientificTips.filter(tip => {
    const matchesSearch = tip.title.toLowerCase().includes(scienceSearch.toLowerCase()) || 
                          tip.text.toLowerCase().includes(scienceSearch.toLowerCase()) || 
                          tip.source.toLowerCase().includes(scienceSearch.toLowerCase());
    const matchesCategory = scienceCategory === "all" || tip.category === scienceCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0d0e15] text-gray-900 dark:text-gray-100 overflow-y-auto no-scrollbar pb-16">
      
      {/* Title */}
      <div className="px-6 pt-5 border-b border-gray-200 dark:border-gray-800/40">
        <span className="text-xs font-mono font-bold text-pink-400 uppercase tracking-wider">Módulo Bienestar</span>
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-1.5 mt-0.5">
          <Heart className="h-5 w-5 text-pink-400 fill-current" />
          <span>Salud y Bienestar</span>
        </h2>

        <div className="flex gap-4 mt-3 border-b border-gray-200 dark:border-gray-800/20">
          <button
            onClick={() => setActiveSubTab("sleep_mood")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition ${
              activeSubTab === "sleep_mood" ? "border-pink-500 text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            Sueño y Ánimo
          </button>
          <button
            onClick={() => setActiveSubTab("injuries")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition ${
              activeSubTab === "injuries" ? "border-pink-500 text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            Triaje de Lesiones
          </button>
          <button
            onClick={() => setActiveSubTab("photos")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition ${
              activeSubTab === "photos" ? "border-pink-500 text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            Fotos de Progreso
          </button>
          <button
            onClick={() => setActiveSubTab("science")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1 ${
              activeSubTab === "science" ? "border-pink-500 text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Biblioteca Científica
          </button>
        </div>
      </div>

      {/* Sleep & Mood Tab */}
      {activeSubTab === "sleep_mood" && (
        <div className="p-6 space-y-6 flex-1 flex flex-col justify-start">
          
          {/* Averages Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-[#161824] p-3 rounded-2xl border border-gray-200 dark:border-gray-800/80 text-center shadow-sm">
              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase block">Sueño Prom.</span>
              <span className="text-xl font-black text-pink-500 tracking-tight block mt-0.5">{avgSleepHours}h</span>
            </div>
            <div className="bg-white dark:bg-[#161824] p-3 rounded-2xl border border-gray-200 dark:border-gray-800/80 text-center shadow-sm">
              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase block">Calidad Prom.</span>
              <span className="text-xl font-black text-pink-500 tracking-tight block mt-0.5">{avgSleepQuality}/5</span>
            </div>
            <div className="bg-white dark:bg-[#161824] p-3 rounded-2xl border border-gray-200 dark:border-gray-800/80 text-center shadow-sm">
              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase block">Energía Prom.</span>
              <span className="text-xl font-black text-pink-500 tracking-tight block mt-0.5">{avgEnergy}/10</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 p-5 rounded-3xl space-y-5 shadow-md">
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Smile className="h-4 w-4 text-pink-400" />
              <span>Registro Diario de Vitalidad</span>
            </h3>

            {/* Hours of Sleep Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300">Horas de Sueño</label>
                <span className="text-xs font-mono font-bold text-pink-500">{sleepHours} horas</span>
              </div>
              <input 
                type="range" 
                min="3" 
                max="14" 
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none"
              />
            </div>

            {/* Quality of Sleep Input */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 block">Calidad del Descanso</label>
              <div className="flex gap-2.5 justify-center">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSleepQuality(val)}
                    className="p-1 cursor-pointer"
                  >
                    <Star className={`h-6 w-6 transition-all ${
                      val <= sleepQuality ? "text-amber-400 fill-current scale-110" : "text-gray-300 dark:text-gray-700"
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Mood Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300 uppercase">Humor / Ánimo</label>
                  <span className="text-xs font-bold text-pink-500">{moodRating}/10</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={moodRating}
                  onChange={(e) => setMoodRating(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer h-1 bg-gray-250 dark:bg-gray-800 rounded-lg appearance-none"
                />
              </div>

              {/* Energy Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300 uppercase">Vitalidad / Energía</label>
                  <span className="text-xs font-bold text-pink-500">{energyRating}/10</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={energyRating}
                  onChange={(e) => setEnergyRating(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer h-1 bg-gray-250 dark:bg-gray-800 rounded-lg appearance-none"
                />
              </div>
            </div>

            {/* Notes textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase">Notas Adicionales (Opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="¿Algún factor relevante hoy? (ej: mucho estrés, cena pesada, etc.)"
                className="w-full h-16 rounded-xl border border-gray-200 dark:border-gray-800/80 bg-gray-50 dark:bg-[#0d0e15] px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-650 focus:outline-none focus:border-pink-500/50 resize-none"
              />
            </div>

            <button
              onClick={handleSaveSleepMood}
              className={`w-full text-xs font-black py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg active:scale-98 cursor-pointer ${
                isLoggedToday 
                  ? "bg-pink-500/20 text-pink-500 border border-pink-500/30"
                  : "bg-pink-500 hover:bg-pink-600 text-white shadow-pink-500/10"
              }`}
            >
              {isLoggedToday ? "Actualizar Registro del Día" : "Guardar Registro del Día"}
            </button>
          </div>

          {/* History Lists */}
          {userProfile.sleepLogs && userProfile.sleepLogs.length > 0 && (
            <div className="space-y-2">
              <span className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">Historial Reciente</span>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                {userProfile.sleepLogs.slice(0, 7).map((log, idx) => {
                  const mood = userProfile.moodLogs?.find(m => m.date === log.date);
                  return (
                    <div 
                      key={log.date}
                      className="bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800/85 p-3 rounded-2xl flex justify-between items-center text-xs shadow-sm"
                    >
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-gray-700 dark:text-gray-300 block">{log.date}</span>
                        {mood?.notes && (
                          <span className="text-[10px] text-gray-450 dark:text-gray-500 line-clamp-1 italic">"{mood.notes}"</span>
                        )}
                      </div>
                      <div className="flex gap-4 font-mono text-[10px] font-bold">
                        <span className="flex items-center gap-0.5 text-blue-500">
                          <Moon className="h-3 w-3" />
                          {log.hours}h
                        </span>
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <Star className="h-3 w-3 fill-current" />
                          {log.quality}
                        </span>
                        {mood && (
                          <span className="flex items-center gap-0.5 text-emerald-500">
                            <Zap className="h-3 w-3 fill-current" />
                            {mood.energy}/10
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Injury Triage Tab */}
      {activeSubTab === "injuries" && (
        <div className="p-6 space-y-5 flex-1 flex flex-col justify-start">
          
          <div className="bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 p-5 rounded-3xl space-y-4 shadow-md text-left">
            <div>
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5 text-pink-400" />
                <span>Asistente de Triaje IA</span>
              </h3>
              <p className="text-[10px] text-gray-450 dark:text-gray-500 leading-relaxed mt-1">
                Describe tus molestias musculares o de articulaciones. La IA evaluará pautas seguras, ejercicios a evitar y calentamientos correctos.
              </p>
            </div>

            <textarea
              value={painDescription}
              onChange={(e) => setPainDescription(e.target.value)}
              placeholder="Ej: Siento un dolor punzante en el hombro anterior izquierdo al hacer press de banca pesado..."
              className="w-full h-24 rounded-xl border border-gray-200 dark:border-gray-800/80 bg-gray-50 dark:bg-[#0d0e15] px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-650 focus:outline-none focus:border-pink-500/50 resize-none"
            />

            <button
              onClick={handleAnalyzeInjury}
              disabled={loadingTriage || !painDescription.trim()}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white text-xs font-black py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-pink-500/10 cursor-pointer"
            >
              {loadingTriage ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Analizando molestia...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Analizar Molestia con IA</span>
                </>
              )}
            </button>
          </div>

          {/* Results Output */}
          <AnimatePresence>
            {triageResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-4 text-left"
              >
                {/* Warning Card */}
                <div className="bg-rose-500/15 border border-rose-500/30 p-4 rounded-2xl flex gap-3 items-start">
                  <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-rose-450 leading-relaxed">
                    {triageResult.medicalWarning}
                  </p>
                </div>

                {/* Causes & Avoid Block */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black text-pink-400 uppercase tracking-wider block">Causas Probables</span>
                    <ul className="space-y-1.5 text-[10px] text-gray-700 dark:text-gray-300 font-medium">
                      {triageResult.possibleCauses.map((c: string, i: number) => (
                        <li key={i} className="flex gap-1 items-start">
                          <span className="text-pink-400">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black text-rose-450 uppercase tracking-wider block">Ejercicios a Evitar</span>
                    <ul className="space-y-1.5 text-[10px] text-gray-750 dark:text-gray-300 font-medium">
                      {triageResult.exercisesToAvoid.map((e: string, i: number) => (
                        <li key={i} className="flex gap-1 items-start">
                          <span className="text-rose-400">•</span>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Alternatives & Warmup Block */}
                <div className="bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl space-y-3">
                  <div>
                    <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-wider block">Alternativas Seguras / Descanso Activo</span>
                    <ul className="space-y-1.5 text-[10px] text-gray-700 dark:text-gray-300 font-medium mt-1">
                      {triageResult.safeAlternatives.map((a: string, i: number) => (
                        <li key={i} className="flex gap-1 items-start">
                          <span className="text-emerald-500">•</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-800/30">
                    <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-wider block">Pautas de Calentamiento</span>
                    <ul className="space-y-1.5 text-[10px] text-gray-700 dark:text-gray-300 font-medium mt-1">
                      {triageResult.warmupTips.map((w: string, i: number) => (
                        <li key={i} className="flex gap-1 items-start">
                          <span className="text-blue-500">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* Progress Photos Tab */}
      {activeSubTab === "photos" && (
        <div className="p-6 space-y-6 flex-1 flex flex-col justify-start">
          
          {/* Advice Banner */}
          <div className="bg-pink-500/10 border border-pink-500/20 p-3.5 rounded-2xl flex gap-2.5 items-start text-left">
            <Info className="h-4 w-4 text-pink-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-pink-200 block">Fotografías Semanales de Progreso</span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-normal block">
                Te aconsejamos subir una foto de control los domingos por la mañana en ayunas para asegurar una iluminación constante.
              </span>
            </div>
          </div>

          {/* Add photo trigger button card */}
          <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-3xl p-6 text-center hover:bg-gray-100 dark:hover:bg-white/5 transition duration-200 cursor-pointer">
            <input 
              type="file"
              accept="image/*"
              onChange={handleAddPhoto}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="space-y-2 flex flex-col items-center">
              <div className="w-10 h-10 bg-pink-500/10 border border-pink-500/20 rounded-full flex items-center justify-center text-pink-400">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-xs font-black text-gray-900 dark:text-white">Subir Foto de Control</span>
                <span className="block text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">Captura tu evolución física</span>
              </div>
            </div>
          </div>

          {/* Photos Gallery Grid */}
          {photos.length > 0 ? (
            <div className="space-y-3">
              <span className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono text-left">Galería Física</span>
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo)}
                    className="aspect-square bg-gray-100 dark:bg-[#161824] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 relative cursor-pointer group shadow-sm"
                  >
                    <img 
                      src={photo.base64Data} 
                      alt={`Progreso ${photo.date}`}
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <button
                        onClick={(e) => handleDeletePhoto(photo.id, e)}
                        className="p-1.5 bg-rose-500 hover:bg-rose-600 rounded-xl text-white transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {/* Floating date badge */}
                    <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-mono text-white">
                      {photo.date.substring(5)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 border border-dashed border-gray-200 dark:border-gray-800/80 rounded-3xl text-center text-gray-450 dark:text-gray-550 flex flex-col items-center justify-center gap-1.5">
              <Camera className="h-8 w-8 opacity-40" />
              <span className="text-xs font-bold">No hay fotos guardadas en este dispositivo</span>
            </div>
          )}

        </div>
      )}

      {/* Biblioteca Científica Tab */}
      {activeSubTab === "science" && (
        <div className="p-6 space-y-4 flex-1 flex flex-col justify-start">
          
          {/* Header */}
          <div className="text-left space-y-1">
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-pink-400" />
              <span>Evidencia Científica y Mitos</span>
            </h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
              Explora las bases fisiológicas y nutricionales avaladas por la ciencia del deporte y desmiente los mitos más comunes del fitness.
            </p>
          </div>

          {/* Search and Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por palabra clave o estudio..."
                value={scienceSearch}
                onChange={(e) => setScienceSearch(e.target.value)}
                className="w-full bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 pl-9 text-[11px] text-gray-900 dark:text-white outline-none focus:border-pink-500/40"
              />
              <Search className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 absolute left-3 top-2.5" />
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: "all", label: "Todos" },
                { id: "entrenamiento", label: "Entrenamiento" },
                { id: "nutricion", label: "Nutrición" },
                { id: "cardio", label: "Cardio" },
                { id: "suplementacion", label: "Suplementos" },
                { id: "salud", label: "Salud" },
                { id: "mito", label: "Mitos" }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setScienceCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition whitespace-nowrap cursor-pointer ${
                    scienceCategory === cat.id
                      ? "bg-pink-500 border-pink-500 text-white shadow-sm"
                      : "bg-white dark:bg-[#161824] border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tips List */}
          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-[460px]">
            {filteredTips.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800/80 rounded-2xl bg-white dark:bg-transparent">
                No se encontraron consejos con los filtros seleccionados.
              </div>
            ) : (
              filteredTips.map((tip) => (
                <div
                  key={tip.id}
                  className="bg-white dark:bg-[#161824] p-4.5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2.5 shadow-sm text-left hover:border-pink-500/20 transition duration-200"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase bg-pink-500/10 text-pink-500 dark:text-pink-400 border border-pink-500/20">
                      {tip.category}
                    </span>
                    <span className="text-[8px] font-bold text-gray-450 dark:text-gray-555 font-mono">
                      #{tip.id}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white">
                      {tip.title}
                    </h4>
                    <p className="text-[11px] text-gray-650 dark:text-gray-400 leading-relaxed font-medium">
                      {tip.text}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800/40 flex flex-col gap-1">
                    <span className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-bold block leading-none">Estudio Científico</span>
                    <a
                      href={tip.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-pink-500 dark:text-pink-400 hover:text-pink-400 dark:hover:text-pink-300 font-bold truncate block hover:underline"
                    >
                      {tip.source} ↗
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Full Screen Photo Viewer Modal Overlay */}
      <AnimatePresence>
        {selectedPhoto && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full rounded-3xl overflow-hidden bg-[#12131d] border border-gray-800 text-center relative flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedPhoto.base64Data} 
                alt="Progreso Full" 
                className="w-full max-h-[500px] object-contain bg-black"
              />
              <div className="p-4 bg-[#12131d] flex justify-between items-center text-xs">
                <span className="font-mono font-bold text-gray-400">Fecha de Registro: {selectedPhoto.date}</span>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="bg-gray-850 hover:bg-gray-800 border border-gray-700 text-gray-300 px-3.5 py-1.5 rounded-xl font-bold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
