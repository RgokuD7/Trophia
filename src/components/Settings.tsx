import React, { useState } from "react";
import { 
  Settings, Key, Eye, User, Weight, Ruler, Award, RefreshCw, Check, Info, AlertCircle, Sun, Moon, LogOut 
} from "lucide-react";
import { UserProfile, BiologicalSex, FitnessGoal, ExperienceLevel, TrainingEnvironment } from "../types";
import { calculateRequirements, calculateBMI } from "../utils/fitnessUtils";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface SettingsProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetApp: () => void;
}

export default function SettingsView({ profile, onUpdateProfile, onResetApp }: SettingsProps) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [sex, setSex] = useState<BiologicalSex>(profile.sex);
  const [weight, setWeight] = useState(profile.weight);
  const [height, setHeight] = useState(profile.height);
  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);
  const [level, setLevel] = useState<ExperienceLevel>(profile.level);
  const [environment, setEnvironment] = useState<TrainingEnvironment>(profile.environment);
  const [apiKey, setApiKey] = useState(profile.apiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(profile.theme || "dark");
  const [takesCreatine, setTakesCreatine] = useState(profile.takesCreatine || false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    // Recalculate targets based on updated parameters
    const reqs = calculateRequirements({ weight, height, age, sex, goal, level });
    const bmi = calculateBMI(weight, height);

    const updatedProfile: UserProfile = {
      ...profile,
      name,
      age,
      sex,
      weight,
      height,
      goal,
      level,
      environment,
      bmi,
      dailyCalorieTarget: reqs.calories,
      proteinTarget: reqs.protein,
      carbsTarget: reqs.carbs,
      fatTarget: reqs.fat,
      apiKey: apiKey || undefined,
      theme,
      takesCreatine
    };

    onUpdateProfile(updatedProfile);
    if (apiKey && apiKey.trim().length >= 15) {
      localStorage.setItem("trophia_api_key", apiKey);
    } else {
      localStorage.removeItem("trophia_api_key");
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0e15] text-gray-100 overflow-y-auto no-scrollbar pb-16">
      
      {/* Title */}
      <div className="p-6 pb-2 border-b border-gray-800/40">
        <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Ajustes y Parámetros</span>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5 mt-0.5">
          <Settings className="h-5 w-5 text-emerald-400" />
          <span>Configuración</span>
        </h2>
      </div>

      <div className="px-6 py-5 space-y-5">
        
        {/* Success Alert */}
        {saveSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-400 font-bold flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Ajustes guardados e indicadores actualizados con éxito.</span>
          </div>
        )}

        {/* Theme Settings */}
        <div className="bg-[#161824] p-4 rounded-xl border border-gray-800 space-y-3 shadow-lg">
          <span className="block text-xs font-bold text-gray-400 uppercase">Tema Visual</span>
          <div className="flex bg-[#0f101a] rounded-lg p-1 border border-gray-800">
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition ${
                theme === "light" ? "bg-emerald-500 text-white" : "text-gray-400"
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              Claro
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition ${
                theme === "dark" ? "bg-emerald-500 text-white" : "text-gray-400"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              Oscuro
            </button>
          </div>
        </div>

        {/* AI Key Configuration */}
        <div className="bg-[#161824] p-4 rounded-xl border border-gray-800 space-y-3 shadow-lg">
          <span className="block text-xs font-bold text-gray-400 uppercase">Credencial de IA Descentralizada</span>
          <p className="text-[10px] text-gray-400 leading-normal">
            Cambia o actualiza tu clave de API de Gemini de Google AI Studio para mantener tus llamadas independientes de cuotas.
          </p>
          
          <Input
            type="password"
            icon={Key}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Ingresa tu clave de API de Gemini..."
            className="bg-[#0f101a] border-gray-800 font-mono"
            size="md"
          />
        </div>

        {/* Biometric Override Fields */}
        <div className="bg-[#161824] p-4 rounded-xl border border-gray-800 space-y-3 shadow-lg">
          <span className="block text-xs font-bold text-gray-400 uppercase">Perfil Físico</span>

          <div className="space-y-2.5">
             <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">Nombre</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#0f101a] border-gray-800"
                size="sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Edad</label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  className="bg-[#0f101a] border-gray-800"
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Sexo Biológico</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as BiologicalSex)}
                  className="w-full bg-[#0f101a] border border-gray-800 rounded-lg py-1.5 px-3 text-xs text-white outline-none"
                >
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Peso (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                  className="bg-[#0f101a] border-gray-800"
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Estatura (cm)</label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                  className="bg-[#0f101a] border-gray-800"
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Training Objectives Settings */}
        <div className="bg-[#161824] p-4 rounded-xl border border-gray-800 space-y-3 shadow-lg">
          <span className="block text-xs font-bold text-gray-400 uppercase">Meta y Plan deportivo</span>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">Meta Nutricional</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as FitnessGoal)}
                className="w-full bg-[#0f101a] border border-gray-800 rounded-lg py-1.5 px-3 text-xs text-white outline-none"
              >
                <option value="lose_weight">Bajar de peso / Definición</option>
                <option value="gain_muscle">Ganar masa muscular / Volumen</option>
                <option value="aesthetics">Recomposición Estética</option>
                <option value="maintenance">Mantenimiento general</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Nivel Histórico</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as ExperienceLevel)}
                  className="w-full bg-[#0f101a] border border-gray-800 rounded-lg py-1.5 px-3 text-xs text-white outline-none"
                >
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzado</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Entorno de Ejercicio</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as TrainingEnvironment)}
                  className="w-full bg-[#0f101a] border border-gray-800 rounded-lg py-1.5 px-3 text-xs text-white outline-none"
                >
                  <option value="home">Casa</option>
                  <option value="gym">Gimnasio</option>
                  <option value="outdoor">Aire Libre</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Supplements Configuration */}
        <div className="bg-[#161824] p-4 rounded-xl border border-gray-800 space-y-3 shadow-lg">
          <span className="block text-xs font-bold text-gray-400 uppercase">Suplementación</span>
          
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5 text-left">
              <span className="text-xs font-bold text-white block">Consumo de Creatina</span>
              <span className="text-[10px] text-gray-400">Activa recordatorios diarios en tu dashboard.</span>
            </div>
            
            <button
              type="button"
              onClick={() => setTakesCreatine(!takesCreatine)}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none flex items-center cursor-pointer ${
                takesCreatine ? "bg-emerald-500 justify-end" : "bg-gray-800 justify-start"
              }`}
            >
              <span className="w-4.5 h-4.5 rounded-full bg-white shadow-md"></span>
            </button>
          </div>
        </div>

        {/* Trigger save */}
        <Button
          variant="primary"
          onClick={handleSave}
          leftIcon={Check}
          className="w-full"
          size="md"
        >
          Guardar Cambios y Recalcular Metas
        </Button>

        {/* Reset App */}
        <div className="border-t border-gray-800/80 pt-4">
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("¿Estás seguro de que deseas cerrar la sesión? Se borrará tu historial y volverás al onboarding.")) {
                onResetApp();
              }
            }}
            leftIcon={LogOut}
            className="w-full font-extrabold"
            size="md"
          >
            Cerrar Sesión (Reiniciar Datos)
          </Button>
        </div>

      </div>
    </div>
  );
}
