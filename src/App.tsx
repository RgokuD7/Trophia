import React, { useState, useEffect } from "react";
import { 
  Utensils, Droplets, Dumbbell, Settings, Lock, CookingPot, MessageSquare, Sparkles, X, Send, Trash2, BookOpen, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { askNutriCoachIA } from "./services/geminiService";
import { User } from "firebase/auth";
import { UserProfile, LoggedMeal, WaterLog, WorkoutSession, MealType, CoachChatMessage } from "./types";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import Hydration from "./components/Hydration";
import SettingsView from "./components/Settings";
import FoodLogger from "./components/FoodLogger";
import Auth from "./components/Auth";
import RecipeAssistantModal from "./components/RecipeAssistantModal";
import NutritionHub from "./components/NutritionHub";
import Workouts, { getDayKeyFromDateStr } from "./components/Workouts";
import MarkdownMessage from "./components/MarkdownMessage";
import { getSuggestedMealTypeByTime, createTimestampForDate, normalizeCreatineProfile } from "./utils/fitnessUtils";

// Import Firebase services
import { subscribeToAuthChanges, logout } from "./services/authService";
import { 
  getUserProfile, 
  saveUserProfile, 
  getMeals, 
  addMeal, 
  updateMeal,
  deleteMeal, 
  getWaterLogs, 
  addWaterLog, 
  clearWaterLogs, 
  getWorkoutHistory, 
  saveWorkoutSession, 
  clearWorkoutHistory,
  deleteUserAllData,
  updateHouseholdPantry,
  getCoachChatHistory,
  saveCoachChatHistory,
  clearCoachChatHistory,
  saveUserRecipe
} from "./services/dbService";

import { getLocalDateString, isSameDay } from "./utils/fitnessUtils";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "nutrition" | "hydration" | "workouts" | "settings">("dashboard");
  const [hydrationSubTab, setHydrationSubTab] = useState<"water" | "creatine">("water");
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);
  const [isFoodLoggerOpen, setIsFoodLoggerOpen] = useState(false);
  const [foodLoggerCustomOnly, setFoodLoggerCustomOnly] = useState(false);
  const [foodLoggerMode, setFoodLoggerMode] = useState<"log" | "pantry">("log");
  const [isRecipeAssistantOpen, setIsRecipeAssistantOpen] = useState(false);
  const [defaultMealTypeForLogger, setDefaultMealTypeForLogger] = useState<MealType>("lunch");
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);
  const [isRecalibrating, setIsRecalibrating] = useState(false);

  // Nutri-Coach state
  const DEFAULT_COACH_WELCOME: CoachChatMessage = {
    id: "welcome",
    sender: "coach",
    text: "¡Hola! Soy tu Coach de Trophia IA. Conozco en tiempo real tu despensa, tu rutina y ejercicios de hoy, y tus macros restantes. ¿En qué te ayudo? Puedes preguntarme qué cocinar de pre/post-entreno, dudas sobre tus ejercicios de hoy o cómo vas con tus metas.",
    timestamp: new Date().toISOString()
  };

  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [coachMessage, setCoachMessage] = useState("");
  const [coachChatHistory, setCoachChatHistory] = useState<CoachChatMessage[]>([DEFAULT_COACH_WELCOME]);
  const [isCoachTyping, setIsCoachTyping] = useState(false);
  const coachChatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCoachOpen) {
      coachChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [coachChatHistory, isCoachOpen, isCoachTyping]);

  // Real-time floating rest timer across tabs
  const [activeRestTimer, setActiveRestTimer] = useState<{
    remaining: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      setActiveRestTimer(null);
      return;
    }
    const checkTimer = () => {
      try {
        const stored = localStorage.getItem(`trophia_rest_timer_${user.uid}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const diff = Math.ceil((parsed.targetMs - Date.now()) / 1000);
          if (diff > 0) {
            setActiveRestTimer({ remaining: diff, label: parsed.label || "Descanso" });
            return;
          }
        }
        setActiveRestTimer(null);
      } catch (e) {
        setActiveRestTimer(null);
      }
    };
    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const buildCoachContext = (): string => {
    if (!profile) return "";
    const todayStr = getLocalDateString();
    const dayKey = getDayKeyFromDateStr(todayStr);

    // 1. Profile & Goals
    const goalStr =
      profile.goal === "lose_weight"
        ? "Pérdida de grasa / Definición"
        : profile.goal === "gain_muscle"
        ? "Ganancia muscular / Hipertrofia"
        : "Mantenimiento / Salud";

    const userBasics = [
      `PERFIL Y METAS DEL USUARIO:`,
      `- Nombre: ${profile.name || "Usuario"}`,
      `- Meta principal: ${goalStr}`,
      `- Peso actual: ${profile.weight || "?"} kg, Altura: ${profile.height || "?"} cm, Nivel: ${profile.level || "intermedio"}`,
      profile.dietType ? `- Tipo de dieta: ${profile.dietType}` : null,
      profile.allergies && profile.allergies.length > 0 ? `- Alergias o restricciones: ${profile.allergies.join(", ")}` : null,
      profile.equipment && profile.equipment.length > 0
        ? `- Equipamiento disponible: ${profile.equipment.join(", ")}${profile.homeEquipmentNotes ? ` (${profile.homeEquipmentNotes})` : ""}`
        : null
    ].filter(Boolean).join("\n");

    // 2. Exercise expenditure today (Gym, sports, and active routes)
    const activeRoutesToday = profile.activeRoutesToday || [];
    const todayActiveRoutes = activeRoutesToday.filter(r => isSameDay(r.date, todayStr));
    const routeCaloriesBurned = todayActiveRoutes.reduce((sum, activeRoute) => {
      const routeObj = (profile.frequentRoutes || []).find(r => r.id === activeRoute.routeId);
      return sum + (routeObj ? routeObj.caloriesBurned : 0);
    }, 0);

    const todaySession = workoutHistory.find(w => w.date === todayStr);
    const workoutCaloriesBurned = todaySession
      ? (todaySession.completed && todaySession.caloriesBurned !== undefined && todaySession.caloriesBurned > 0
          ? todaySession.caloriesBurned
          : (todaySession.exercises || []).reduce((sum, ex) => {
              const completedSetsCount = (ex.completedSets || []).filter(s => s.completed).length;
              return sum + (completedSetsCount * (ex.caloriesBurnedPerSet || 5));
            }, 0))
      : 0;

    const loggedSportsToday = profile.loggedSportsToday || [];
    const todaySports = loggedSportsToday.filter(s => isSameDay(s.date, todayStr));
    const sportsCaloriesBurned = todaySports.reduce((sum, sport) => sum + (sport.caloriesBurned || 0), 0);

    const totalBurnedCalories = routeCaloriesBurned + workoutCaloriesBurned + sportsCaloriesBurned;

    // 3. Nutrition today
    const todayMeals = loggedMeals.filter(m => isSameDay(m.timestamp, todayStr));
    const totalCal = todayMeals.reduce((s, m) => s + m.calories, 0);
    const totalP = todayMeals.reduce((s, m) => s + m.protein, 0);
    const totalC = todayMeals.reduce((s, m) => s + m.carbs, 0);
    const totalF = todayMeals.reduce((s, m) => s + m.fat, 0);

    const baseCalTarget = profile.dailyCalorieTarget || 2000;
    const adjustedCalTarget = baseCalTarget + totalBurnedCalories;
    const targetP = profile.proteinTarget || 140;
    const targetC = profile.carbsTarget || 230;
    const targetF = profile.fatTarget || 65;

    const remCal = adjustedCalTarget - totalCal;
    const remP = Math.max(0, targetP - totalP);
    const remC = Math.max(0, targetC - totalC);
    const remF = Math.max(0, targetF - totalF);

    const mealsListStr = todayMeals.length > 0
      ? todayMeals.map(m => `  * [${m.type}] ${m.name} (${m.calories} kcal, P:${m.protein}g, C:${m.carbs}g, G:${m.fat}g${m.servingSize ? `, porción: ${m.servingSize}` : ""})`).join("\n")
      : "  * Aún no ha registrado comidas hoy.";

    const nutritionSection = `ESTADO NUTRICIONAL Y BALANCE ENERGÉTICO DE HOY (${todayStr}):
- Meta Calórica Base (en reposo): ${baseCalTarget} kcal
- Gasto por Ejercicio / Deporte Hoy: +${totalBurnedCalories} kcal ${totalBurnedCalories > 0 ? `(🔥 Rutina: ~${workoutCaloriesBurned} kcal, Deportes/Cardio: ~${sportsCaloriesBurned} kcal, Rutas: ~${routeCaloriesBurned} kcal)` : "(Sin ejercicio registrado hoy aún)"}
- Presupuesto Calórico TOTAL Disponible Hoy (Rango ampliado por ejercicio): ${adjustedCalTarget} kcal
- Calorías Consumidas Hoy: ${totalCal} kcal
- Calorías Restantes Disponibles: ${remCal >= 0 ? `${remCal} kcal disponibles` : `Superado por ${Math.abs(remCal)} kcal`}
- Proteínas: ${Math.round(totalP)} / ${targetP}g (${remP > 0 ? `Faltan ${Math.round(remP)}g` : "Meta de proteína cumplida"})
- Carbohidratos: ${Math.round(totalC)} / ${targetC}g (${remC > 0 ? `Faltan ${Math.round(remC)}g` : "Meta de carbos cumplida"})
- Grasas: ${Math.round(totalF)} / ${targetF}g (${remF > 0 ? `Faltan ${Math.round(remF)}g` : "Meta de grasas cumplida"})
- Comidas consumidas hoy:
${mealsListStr}

DIRECTRIZ VITAL PARA EL COACH SOBRE EL RANGO DE CALORÍAS POR EJERCICIO:
${totalBurnedCalories > 0 
  ? `El usuario ha realizado actividad física y ha quemado ${totalBurnedCalories} kcal hoy. Por lo tanto, su presupuesto calórico para hoy NO ES de ${baseCalTarget} kcal, sino de ${adjustedCalTarget} kcal (calorías base + calorías quemadas en ejercicio). Al evaluar si puede comer más o recomendar comidas/recetas, utiliza sus ${remCal} kcal restantes disponibles. NUNCA le digas que ha sobrepasado su meta o que está al límite si aún tiene margen dentro de esas ${remCal} kcal ampliadas por su ejercicio.`
  : `El usuario aún no ha registrado gasto calórico por ejercicio hoy. Su presupuesto es la meta base de ${baseCalTarget} kcal.`
}`;

    // 3. Pantry
    const pantryItems = profile.pantry || [];
    const pantryStr = pantryItems.length > 0
      ? pantryItems.map(p => `  * ${p.name} (Stock: ${p.quantity || "Disponible"}${p.calories ? ` · ${p.calories} kcal/100g, P:${p.protein || 0}g, C:${p.carbs || 0}g, G:${p.fat || 0}g` : ""})`).join("\n")
      : "  * La despensa no tiene ingredientes registrados.";

    const pantrySection = `DESPENSA DEL USUARIO (Alimentos e ingredientes físicos que tiene en casa):
${pantryStr}`;

    // 4. Workout Today
    const scheduledRoutine = profile.weeklyRoutinePlan?.routines?.find(r => r.assignedDay === dayKey);

    let workoutSection = "";
    if (todaySession) {
      const isCompleted = todaySession.completed;
      const totalExercises = todaySession.exercises.length;
      const completedExercises = todaySession.exercises.filter(ex => ex.completedSets && ex.completedSets.length > 0 && ex.completedSets.every(s => s.completed));
      const pendingExercises = todaySession.exercises.filter(ex => !ex.completedSets || !ex.completedSets.every(s => s.completed));
      const currentEx = pendingExercises[0] || null;

      const exercisesDetails = todaySession.exercises.map((ex, idx) => {
        const setsDone = (ex.completedSets || []).filter(s => s.completed).length;
        const totalSets = ex.completedSets?.length || ex.sets || 3;
        const lastLoggedSet = (ex.completedSets || []).filter(s => s.completed).slice(-1)[0];
        const statusStr = setsDone === totalSets && totalSets > 0 ? "✓ COMPLETADO" : setsDone > 0 ? `EN PROGRESO (${setsDone}/${totalSets} series hechas)` : "PENDIENTE";
        const weightsStr = lastLoggedSet ? ` [Última serie: ${lastLoggedSet.weight}kg x ${lastLoggedSet.reps} reps]` : ` [Objetivo: ${ex.sets}x${ex.reps} con ${ex.weight || 0}kg]`;
        return `  ${idx + 1}. ${ex.name}: ${statusStr}${weightsStr}`;
      }).join("\n");

      workoutSection = `ESTADO DE ENTRENAMIENTO DE HOY (${todayStr}):
- Rutina de hoy: "${todaySession.name}"
- Estado general: ${isCompleted ? "¡ENTRENAMIENTO YA COMPLETADO HOY!" : todaySession.startTime ? "EN PROGRESO AHORA MISMO (iniciado)" : "CREADO / INICIADO HOY"}
${currentEx && !isCompleted ? `- Ejercicio en el que se encuentra actualmente: "${currentEx.name}"` : ""}
- Progreso: ${completedExercises.length} de ${totalExercises} ejercicios completados.
- Lista detallada de ejercicios y series:
${exercisesDetails}`;
    } else if (scheduledRoutine) {
      const exercisesList = scheduledRoutine.exercises.map((ex, idx) => `  ${idx + 1}. ${ex.name} (${ex.sets} series x ${ex.reps} reps)`).join("\n");
      workoutSection = `ESTADO DE ENTRENAMIENTO DE HOY (${todayStr}):
- Rutina asignada para hoy (${dayKey}): "${scheduledRoutine.name}" (Enfoque: ${scheduledRoutine.focus || "General"})
- Estado general: AÚN NO HA COMENZADO (no ha iniciado sesión de pesas hoy).
- Ejercicios programados:
${exercisesList}`;
    } else {
      workoutSection = `ESTADO DE ENTRENAMIENTO DE HOY (${todayStr}):
- Estado general: Hoy no tiene rutina programada en su plan semanal (Día de descanso o entrenamiento libre).
- No se han registrado entrenamientos hoy aún.`;
    }

    // 5. Hydration
    const todayWater = waterLogs.filter(w => isSameDay(w.timestamp, todayStr)).reduce((s, w) => s + w.amount, 0);
    const hydrationSection = `HIDRATACIÓN HOY: ${todayWater} ml registrados.`;

    return `${userBasics}\n\n${nutritionSection}\n\n${pantrySection}\n\n${workoutSection}\n\n${hydrationSection}`;
  };

  const handleSendCoachMessage = async (customMessage?: string) => {
    const textToSend = (customMessage || coachMessage).trim();
    if (!textToSend || !profile) return;
    setCoachMessage("");

    const userMsg: CoachChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toISOString()
    };
    const updatedWithUser = [...coachChatHistory, userMsg];
    setCoachChatHistory(updatedWithUser);
    if (user) {
      localStorage.setItem(`trophia_coach_chat_${user.uid}`, JSON.stringify(updatedWithUser));
      saveCoachChatHistory(user.uid, updatedWithUser);
    }
    setIsCoachTyping(true);

    try {
      const apiKey = profile.apiKey || import.meta.env.VITE_SYSTEM_GEMINI_API_KEY || "";
      const context = buildCoachContext();
      const response = await askNutriCoachIA(apiKey, textToSend, context, coachChatHistory);
      const coachMsg: CoachChatMessage = {
        id: `coach_${Date.now()}`,
        sender: "coach",
        text: response.answer,
        suggestedAction: response.suggestedAction || undefined,
        timestamp: new Date().toISOString()
      };
      const updatedWithCoach = [...updatedWithUser, coachMsg];
      setCoachChatHistory(updatedWithCoach);
      if (user) {
        localStorage.setItem(`trophia_coach_chat_${user.uid}`, JSON.stringify(updatedWithCoach));
        saveCoachChatHistory(user.uid, updatedWithCoach);
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg: CoachChatMessage = {
        id: `coach_${Date.now()}`,
        sender: "coach",
        text: `Lo siento, ocurrió un error al procesar tu duda: ${err.message || "Inténtalo de nuevo."}`,
        timestamp: new Date().toISOString()
      };
      setCoachChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsCoachTyping(false);
    }
  };

  const handleLogCoachMeal = async (msgId: string, action: NonNullable<CoachChatMessage["suggestedAction"]>) => {
    if (!user) return;
    try {
      const newMeal: Omit<LoggedMeal, "id" | "timestamp"> = {
        name: action.name,
        calories: Number(action.calories) || 0,
        protein: Number(action.protein) || 0,
        carbs: Number(action.carbs) || 0,
        fat: Number(action.fat) || 0,
        type: action.mealType || "snack"
      };
      await handleAddMeal(newMeal);

      const updated = coachChatHistory.map(m => {
        if (m.id === msgId) {
          const prevApplied = m.actionApplied;
          return {
            ...m,
            actionApplied: prevApplied === "saved_recipe" ? "both" : ("logged_meal" as const)
          };
        }
        return m;
      });
      setCoachChatHistory(updated);
      if (user) {
        localStorage.setItem(`trophia_coach_chat_${user.uid}`, JSON.stringify(updated));
        saveCoachChatHistory(user.uid, updated);
      }
    } catch (e) {
      console.error("Error logging coach meal:", e);
      alert("Error al registrar comida.");
    }
  };

  const handleSaveCoachRecipe = async (msgId: string, action: NonNullable<CoachChatMessage["suggestedAction"]>) => {
    if (!user) return;
    try {
      const ingredients = (action.ingredients || []).map(ing => ({
        name: ing,
        amount: ""
      }));
      await saveUserRecipe(user.uid, {
        userId: user.uid,
        authorName: profile?.name || "Usuario",
        name: action.name,
        calories: Number(action.calories) || 0,
        protein: Number(action.protein) || 0,
        carbs: Number(action.carbs) || 0,
        fat: Number(action.fat) || 0,
        ingredients,
        instructions: action.instructions && action.instructions.length > 0
          ? action.instructions
          : ["Preparar según las indicaciones del Coach"],
        prepTimeMinutes: 15,
        difficulty: "Fácil",
        isPublic: false,
        createdAt: new Date().toISOString()
      });

      const updated = coachChatHistory.map(m => {
        if (m.id === msgId) {
          const prevApplied = m.actionApplied;
          return {
            ...m,
            actionApplied: prevApplied === "logged_meal" ? "both" : ("saved_recipe" as const)
          };
        }
        return m;
      });
      setCoachChatHistory(updated);
      if (user) {
        localStorage.setItem(`trophia_coach_chat_${user.uid}`, JSON.stringify(updated));
        saveCoachChatHistory(user.uid, updated);
      }
      window.dispatchEvent(new CustomEvent("trophia_refresh_recipes"));
    } catch (e) {
      console.error("Error saving coach recipe:", e);
      alert("Error al guardar receta en Mis Recetas.");
    }
  };

  const handleClearCoachChat = async () => {
    if (!window.confirm("¿Seguro que deseas reiniciar y borrar el historial de conversación con el Coach?")) return;
    setCoachChatHistory([DEFAULT_COACH_WELCOME]);
    if (user) {
      localStorage.removeItem(`trophia_coach_chat_${user.uid}`);
      await clearCoachChatHistory(user.uid);
    }
  };

  const [foodLoggerTargetDate, setFoodLoggerTargetDate] = useState<string | null>(null);

  const handleOpenFoodLogger = (suggestedType?: MealType, isCustomOnly?: boolean, isPantry?: boolean, targetDate?: string) => {
    setDefaultMealTypeForLogger(suggestedType || getSuggestedMealTypeByTime().type);
    setFoodLoggerCustomOnly(!!isCustomOnly);
    setFoodLoggerMode(isPantry ? "pantry" : "log");
    setFoodLoggerTargetDate(targetDate || null);
    setIsFoodLoggerOpen(true);
  };

  // Global theme handling
  useEffect(() => {
    const theme = profile?.theme || "dark";
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  }, [profile?.theme]);

  // Subscribe to Auth changes and load user data from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsCheckingStorage(true);
        // Check local cache first for instant load
        const cachedProfileStr = localStorage.getItem(`trophia_profile_${currentUser.uid}`);
        if (cachedProfileStr) {
          try {
            const cachedProfile = JSON.parse(cachedProfileStr);
            const { profile: normCached } = normalizeCreatineProfile(cachedProfile);
            setProfile(normCached);
          } catch (e) {
            console.warn("Could not parse cached profile:", e);
          }
        }

        const cachedChatStr = localStorage.getItem(`trophia_coach_chat_${currentUser.uid}`);
        if (cachedChatStr) {
          try {
            const cachedChat = JSON.parse(cachedChatStr);
            if (Array.isArray(cachedChat) && cachedChat.length > 0) {
              setCoachChatHistory(cachedChat);
            }
          } catch (e) {
            console.warn("Could not parse cached coach chat:", e);
          }
        }

        try {
          // Fetch all data in parallel for efficiency
          const [profileData, mealsData, waterData, workoutsData, chatData] = await Promise.all([
            getUserProfile(currentUser.uid),
            getMeals(currentUser.uid),
            getWaterLogs(currentUser.uid),
            getWorkoutHistory(currentUser.uid),
            getCoachChatHistory(currentUser.uid)
          ]);

          if (profileData) {
            const { profile: normProfile, modified } = normalizeCreatineProfile(profileData);
            setProfile(normProfile);
            localStorage.setItem(`trophia_profile_${currentUser.uid}`, JSON.stringify(normProfile));
            if (profileData.apiKey) {
              localStorage.setItem("trophia_api_key", profileData.apiKey);
            }
            if (modified) {
              saveUserProfile(currentUser.uid, normProfile).catch(console.error);
            }
          } else if (!cachedProfileStr) {
            // First time user, profile will be set after Onboarding
            setProfile(null);
          }
          setLoggedMeals(mealsData);
          setWaterLogs(waterData);
          setWorkoutHistory(workoutsData);
          if (chatData && chatData.length > 0) {
            setCoachChatHistory(chatData);
            localStorage.setItem(`trophia_coach_chat_${currentUser.uid}`, JSON.stringify(chatData));
          }
        } catch (error) {
          console.error("Error loading user data from Firestore:", error);
        } finally {
          setIsCheckingStorage(false);
        }
      } else {
        // Clear all states on logout
        setProfile(null);
        setLoggedMeals([]);
        setWaterLogs([]);
        setWorkoutHistory([]);
        setCoachChatHistory([DEFAULT_COACH_WELCOME]);
        setIsCheckingStorage(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handlers using Firestore dbService
  const handleOnboardingComplete = async (completedProfile: UserProfile) => {
    if (!user) return;
    try {
      setProfile(completedProfile);
      localStorage.setItem(`trophia_profile_${user.uid}`, JSON.stringify(completedProfile));
      if (completedProfile.apiKey) {
        localStorage.setItem("trophia_api_key", completedProfile.apiKey);
      }
      setActiveTab("dashboard");
      await saveUserProfile(user.uid, completedProfile);
    } catch (e) {
      console.error("Error saving onboarding profile to Firestore:", e);
    }
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    if (!user) return;
    try {
      setProfile(updatedProfile);
      localStorage.setItem(`trophia_profile_${user.uid}`, JSON.stringify(updatedProfile));
      if (updatedProfile.apiKey) {
        localStorage.setItem("trophia_api_key", updatedProfile.apiKey);
      } else {
        localStorage.removeItem("trophia_api_key");
      }
      await saveUserProfile(user.uid, updatedProfile);
    } catch (e) {
      console.error("Error updating profile:", e);
    }
  };

  const handleAddMeal = async (mealData: Omit<LoggedMeal, "id" | "timestamp"> & { timestamp?: string }) => {
    if (!user) return;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempMeal: LoggedMeal = {
      ...mealData,
      id: tempId,
      timestamp: mealData.timestamp || (foodLoggerTargetDate ? createTimestampForDate(foodLoggerTargetDate) : new Date().toISOString())
    };
    // Optimistic UI update
    setLoggedMeals(prev => [tempMeal, ...prev]);

    try {
      const newMeal = await addMeal(user.uid, {
        name: mealData.name,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fat: mealData.fat,
        type: mealData.type,
        servingSize: mealData.servingSize || "",
        timestamp: tempMeal.timestamp,
        compositeIngredients: mealData.compositeIngredients
      });
      setLoggedMeals(prev => prev.map(m => m.id === tempId ? newMeal : m));
    } catch (e) {
      console.error("Error adding meal to Firestore:", e);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!user) return;
    // Optimistic UI update
    setLoggedMeals(prev => prev.filter(m => m.id !== id));
    try {
      await deleteMeal(user.uid, id);
    } catch (e) {
      console.error("Error deleting meal:", e);
    }
  };

  const handleUpdateMeal = async (updatedMeal: LoggedMeal) => {
    if (!user) return;
    // Optimistic UI update
    setLoggedMeals(prev => prev.map(m => m.id === updatedMeal.id ? updatedMeal : m));
    try {
      await updateMeal(user.uid, updatedMeal);
    } catch (e) {
      console.error("Error updating meal in Firestore:", e);
    }
  };

  const handleAddWater = async (amount: number) => {
    if (!user) return;
    const tempId = `temp_water_${Date.now()}`;
    const tempLog: WaterLog = {
      id: tempId,
      amount,
      timestamp: new Date().toISOString()
    };
    // Optimistic UI update
    setWaterLogs(prev => [...prev, tempLog]);

    try {
      const newWater = await addWaterLog(user.uid, {
        amount,
        timestamp: tempLog.timestamp
      });
      setWaterLogs(prev => prev.map(w => w.id === tempId ? newWater : w));
    } catch (e) {
      console.error("Error adding water log:", e);
    }
  };

  const handleClearWater = async () => {
    if (!user) return;
    try {
      await clearWaterLogs(user.uid);
      setWaterLogs([]);
    } catch (e) {
      console.error("Error clearing water logs:", e);
    }
  };

  const handleAddWorkout = async (workout: WorkoutSession) => {
    if (!user) return;
    try {
      const workoutId = workout.id || Math.random().toString(36).substr(2, 9);
      const updatedWorkout: WorkoutSession = {
        ...workout,
        id: workoutId
      };
      await saveWorkoutSession(user.uid, updatedWorkout);
      
      const exists = workoutHistory.find(w => w.id === workoutId || w.date === workout.date);
      if (exists) {
        setWorkoutHistory(workoutHistory.map(w => (w.id === workoutId || w.date === workout.date) ? updatedWorkout : w));
      } else {
        setWorkoutHistory([updatedWorkout, ...workoutHistory]);
      }
    } catch (e) {
      console.error("Error saving workout:", e);
    }
  };

  const handleClearWorkouts = async () => {
    if (!user) return;
    try {
      await clearWorkoutHistory(user.uid);
      setWorkoutHistory([]);
    } catch (e) {
      console.error("Error clearing workout history:", e);
    }
  };

  const handleResetApp = async () => {
    if (!user) return;
    try {
      // 1. Delete all user data in Firestore while still authenticated
      await deleteUserAllData(user.uid);
      
      // 2. Clear local storage settings & cache
      localStorage.removeItem("trophia_api_key");
      localStorage.removeItem("trophia_usda_api_key");
      localStorage.removeItem("trophia_grocery_list");
      localStorage.removeItem("trophia_progress_photos");
      localStorage.removeItem(`trophia_coach_chat_${user.uid}`);

      // 3. Log out to reset the authentication state
      await logout();
    } catch (e) {
      console.error("Error resetting app data:", e);
      // Fallback: sign out anyway so the user isn't stuck
      try {
        await logout();
      } catch (logoutError) {
        console.error("Error logging out after reset failure:", logoutError);
      }
    }
  };

  const handleLoginSuccess = () => {
    // onAuthStateChanged will handle loading data automatically
  };

  if (isCheckingStorage) {
    return (
      <div className="flex h-screen bg-[#06070a] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500">Cargando tu perfil fitness en Trophia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070a] text-gray-100 flex items-center justify-center p-0 md:p-6 select-none font-sans">
      
      {/* Smartphone Mockup Container wrapper for PC screens, full bleed on real phones */}
      <div className="w-full h-screen md:h-[840px] md:max-w-[390px] bg-[#0d0e15] md:rounded-[40px] md:border-[8px] md:border-[#1e202f] md:shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col relative">
        
        {/* Notch / Speaker visual on desktop frames */}
        <div className="hidden md:block absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-[#1e202f] rounded-b-2xl z-50"></div>

        {/* Content View Routing */}
        <div className="flex-1 overflow-hidden relative">
          {!user ? (
            <Auth onLoginSuccess={handleLoginSuccess} />
          ) : !profile ? (
            <Onboarding 
              onComplete={handleOnboardingComplete} 
              userId={user.uid}
              defaultName={user.displayName || undefined}
            />
          ) : (
            <>
              {activeTab === "dashboard" && (
                <Dashboard
                  profile={profile}
                  loggedMeals={loggedMeals}
                  waterLogs={waterLogs}
                  workoutHistory={workoutHistory}
                  onOpenFoodLogger={handleOpenFoodLogger}
                  onOpenRecipeAssistant={() => setIsRecipeAssistantOpen(true)}
                  onAddWaterQuick={handleAddWater}
                  onDeleteMeal={handleDeleteMeal}
                  onNavigateToTab={(tab, subTab) => {
                    if (tab === "workouts") setActiveTab("workouts");
                    if (tab === "hydration") {
                      if (subTab === "creatine") {
                        setHydrationSubTab("creatine");
                      } else if (subTab === "water") {
                        setHydrationSubTab("water");
                      }
                      setActiveTab("hydration");
                    }
                    if (tab === "settings") setActiveTab("settings");
                    if (tab === "nutrition") setActiveTab("nutrition");
                  }}
                  onUpdateProfile={handleUpdateProfile}
                  onAddMeal={handleAddMeal}
                  onOpenCoach={() => setIsCoachOpen(true)}
                />
              )}

              {activeTab === "nutrition" && user && (
                <NutritionHub
                  profile={profile}
                  userId={user.uid}
                  loggedMeals={loggedMeals}
                  workoutHistory={workoutHistory}
                  onAddMeal={handleAddMeal}
                  onUpdateMeal={handleUpdateMeal}
                  onDeleteMeal={handleDeleteMeal}
                  onOpenFoodLogger={handleOpenFoodLogger}
                  onOpenRecipeAssistant={() => setIsRecipeAssistantOpen(true)}
                  onUpdateProfile={handleUpdateProfile}
                  onOpenCoach={() => setIsCoachOpen(true)}
                  userCreationDateStr={user?.metadata.creationTime ? getLocalDateString(user.metadata.creationTime) : undefined}
                />
              )}

              {activeTab === "hydration" && (
                <Hydration
                  waterLogs={waterLogs}
                  onAddWater={handleAddWater}
                  onClearWater={handleClearWater}
                  dailyGoalMl={2500}
                  profile={profile || undefined}
                  onUpdateProfile={handleUpdateProfile}
                  initialTab={hydrationSubTab}
                />
              )}

              {activeTab === "workouts" && user && profile && (
                <Workouts
                  apiKey={profile.apiKey}
                  userProfile={profile}
                  userId={user.uid}
                  workoutHistory={workoutHistory}
                  onAddWorkout={handleAddWorkout}
                  onClearWorkouts={handleClearWorkouts}
                  onUpdateProfile={handleUpdateProfile}
                  onNavigateToHydration={(subTab) => {
                    if (subTab === "creatine") setHydrationSubTab("creatine");
                    else setHydrationSubTab("water");
                    setActiveTab("hydration");
                  }}
                />
              )}

              {activeTab === "settings" && user && (
                <SettingsView
                  profile={profile}
                  userId={user.uid}
                  onUpdateProfile={handleUpdateProfile}
                  onResetApp={handleResetApp}
                  onOpenRecalibration={() => setIsRecalibrating(true)}
                />
              )}
            </>
          )}
        </div>

        {/* Floating overlays */}
        {isFoodLoggerOpen && profile && (
          <FoodLogger
            apiKey={profile.apiKey}
            usdaApiKey={profile.usdaApiKey}
            loggedMeals={loggedMeals}
            mode={foodLoggerMode}
            onAddMeal={(meal) => {
              if (foodLoggerMode === "pantry") {
                const protein = meal.protein || 0;
                const carbs = meal.carbs || 0;
                const fat = meal.fat || 0;
                const name = meal.name.toLowerCase();
                
                let category: "protein" | "carb" | "fat" | "supplement" | "other" = "other";
                if (name.includes("proteina") || name.includes("creatina") || name.includes("whey")) {
                  category = "supplement";
                } else if (protein > carbs && protein > fat) {
                  category = "protein";
                } else if (carbs > protein && carbs > fat) {
                  category = "carb";
                } else if (fat > protein && fat > carbs) {
                  category = "fat";
                }

                const newItem = {
                  id: Math.random().toString(36).substring(2, 9),
                  name: meal.name,
                  quantity: meal.servingSize || "100g",
                  category,
                  calories: meal.calories,
                  protein,
                  carbs,
                  fat
                };
                
                const updatedPantry = [...(profile.pantry || []), newItem];
                if (profile.householdId) {
                  updateHouseholdPantry(profile.householdId, updatedPantry).catch((err) => {
                    console.error("Error updating household pantry:", err);
                  });
                }
                handleUpdateProfile({
                  ...profile,
                  pantry: updatedPantry
                });
              } else {
                handleAddMeal(meal);
              }
            }}
            onClose={() => {
              setIsFoodLoggerOpen(false);
              setFoodLoggerTargetDate(null);
            }}
            defaultMealType={defaultMealTypeForLogger}
            userId={user?.uid}
            isCustomFoodOnlyMode={foodLoggerCustomOnly}
            targetDate={foodLoggerTargetDate || undefined}
            pantryItems={profile.pantry || []}
            onCustomFoodAdded={() => {
              window.dispatchEvent(new CustomEvent("trophia_refresh_custom_foods"));
            }}
          />
        )}

        {isRecipeAssistantOpen && profile && (
          <RecipeAssistantModal
            profile={profile}
            userId={user?.uid}
            onAddMeal={handleAddMeal}
            onClose={() => setIsRecipeAssistantOpen(false)}
          />
        )}

        {/* IA Nutri-Coach Drawer Overlay */}
        <AnimatePresence>
          {isCoachOpen && profile && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCoachOpen(false)}
                className="absolute inset-0 bg-black/65 z-50 backdrop-blur-sm"
              />

              {/* Slide up Drawer */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="absolute bottom-0 left-0 right-0 h-[80%] bg-[#0d0e15] border-t border-white/10 rounded-t-[32px] z-50 flex flex-col overflow-hidden shadow-2xl"
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                      <MessageSquare className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white tracking-tight uppercase tracking-wide flex items-center gap-1.5">
                        Coach Trophia IA
                        <Sparkles className="h-3 w-3 text-emerald-400 fill-emerald-400/10" />
                      </h3>
                      <p className="text-[9px] text-white/40">Nutrición, despensa, ejercicios y progreso en tiempo real</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleClearCoachChat}
                      title="Reiniciar conversación"
                      className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCoachOpen(false)}
                      className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Chat Messages scroll area */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
                  {coachChatHistory.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed shadow-sm ${
                          msg.sender === "user"
                            ? "bg-emerald-500 text-black font-semibold rounded-tr-none shadow-md text-xs"
                            : "bg-white/5 text-white/90 rounded-tl-none border border-white/5"
                        }`}
                      >
                        {msg.sender === "user" ? (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        ) : (
                          <MarkdownMessage content={msg.text} />
                        )}
                      </div>

                      {/* Coach Actionable Meal / Recipe Card */}
                      {msg.sender === "coach" && msg.suggestedAction && (
                        <div className="mt-2 max-w-[88%] bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-3 shadow-md space-y-2.5 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black uppercase text-emerald-400 flex items-center gap-1 truncate">
                              🍽️ {msg.suggestedAction.name}
                            </span>
                            <span className="text-[10px] font-black font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full shrink-0">
                              ~{msg.suggestedAction.calories} kcal
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[9px] text-white/60 font-medium">
                            <span>P: <strong className="text-white">{msg.suggestedAction.protein}g</strong></span>
                            <span>C: <strong className="text-white">{msg.suggestedAction.carbs}g</strong></span>
                            <span>G: <strong className="text-white">{msg.suggestedAction.fat}g</strong></span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-500/20">
                            <button
                              type="button"
                              onClick={() => handleLogCoachMeal(msg.id, msg.suggestedAction!)}
                              disabled={msg.actionApplied === "logged_meal" || msg.actionApplied === "both"}
                              className={`py-2 px-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                                msg.actionApplied === "logged_meal" || msg.actionApplied === "both"
                                  ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                                  : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20 active:scale-95"
                              }`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{msg.actionApplied === "logged_meal" || msg.actionApplied === "both" ? "¡Registrado!" : "Registrar en Diario"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSaveCoachRecipe(msg.id, msg.suggestedAction!)}
                              disabled={msg.actionApplied === "saved_recipe" || msg.actionApplied === "both"}
                              className={`py-2 px-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                                msg.actionApplied === "saved_recipe" || msg.actionApplied === "both"
                                  ? "bg-purple-500/20 text-purple-300 cursor-default"
                                  : "bg-white/10 hover:bg-white/15 text-white border border-white/10 active:scale-95"
                              }`}
                            >
                              <BookOpen className="h-3 w-3 text-purple-400" />
                              <span>{msg.actionApplied === "saved_recipe" || msg.actionApplied === "both" ? "¡Guardada!" : "Guardar Receta"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isCoachTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/5 text-white/40 rounded-2xl rounded-tl-none px-3.5 py-3 text-[10px] font-bold flex items-center gap-2 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        Analizando tu despensa y rutina...
                      </div>
                    </div>
                  )}
                  <div ref={coachChatEndRef} />
                </div>

                {/* Quick Action Suggestion Chips */}
                <div className="px-4 py-2 flex gap-1.5 overflow-x-auto no-scrollbar border-t border-white/5 bg-white/[0.01]">
                  {[
                    { label: "⚡ Pre-entreno con despensa", query: "¿Qué me recomiendas preparar de pre-entreno con lo que tengo en mi despensa?" },
                    { label: "🥤 Post-entreno con despensa", query: "¿Qué me preparo de post-entreno con los ingredientes de mi despensa para recuperarme bien?" },
                    { label: "🏋️ ¿Cómo voy con mi entrenamiento?", query: "¿Cómo voy con mi entrenamiento de hoy? ¿Qué ejercicios he completado y cuáles me faltan?" },
                    { label: "🥗 ¿Qué ceno según mis macros?", query: "¿Qué me sugieres cenar según los macros que me quedan hoy y lo que tengo en mi despensa?" }
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendCoachMessage(chip.query)}
                      disabled={isCoachTyping}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-white/70 hover:text-emerald-400 text-[10px] font-bold transition whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Chat Input panel */}
                <div className="p-4 border-t border-white/5 bg-white/[0.01] shrink-0 flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Pregúntame sobre tu despensa, tu rutina, pre-entreno..."
                    value={coachMessage}
                    onChange={(e) => setCoachMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendCoachMessage()}
                    className="flex-1 p-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 focus:bg-white/[0.07] transition"
                  />
                  <button
                    onClick={() => handleSendCoachMessage()}
                    disabled={!coachMessage.trim() || isCoachTyping}
                    className="w-10 h-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 flex items-center justify-center text-black font-black transition cursor-pointer border-none shadow-md"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Full Recalibration with IA Flow */}
        {isRecalibrating && user && profile && (
          <div className="absolute inset-0 z-50 bg-[#050505] flex flex-col overflow-hidden">
            <Onboarding
              onComplete={async (updated) => {
                await handleUpdateProfile(updated);
                setIsRecalibrating(false);
              }}
              userId={user.uid}
              existingProfile={profile}
              mode="recalibration"
              onCancel={() => setIsRecalibrating(false)}
            />
          </div>
        )}

        {/* Floating Rest Timer across tabs */}
        {activeRestTimer && activeTab !== "workouts" && (
          <button
            type="button"
            onClick={() => setActiveTab("workouts")}
            className="fixed bottom-20 right-4 z-40 bg-[#12131d]/95 border border-emerald-500/50 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-pulse cursor-pointer backdrop-blur-md"
            title="Volver a la sesión de entrenamiento"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-xs font-black text-emerald-400 font-mono shrink-0">
              ⏱️ {activeRestTimer.remaining}s
            </span>
            <span className="text-[10px] text-white/80 font-bold truncate max-w-[130px]">
              {activeRestTimer.label}
            </span>
          </button>
        )}

        {/* Bottom Tab Navigation Bar */}
        {user && profile && (
          <div className="h-[74px] border-t border-gray-800/80 bg-[#0d0e15]/95 backdrop-blur-md flex items-center justify-around px-2 pb-2.5 z-40 flex-shrink-0">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex flex-col items-center gap-1 py-1.5 transition ${
                activeTab === "dashboard" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Utensils className="h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Diario</span>
            </button>

            <button
              onClick={() => setActiveTab("nutrition")}
              className={`flex flex-col items-center gap-1 py-1.5 transition ${
                activeTab === "nutrition" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <CookingPot className="h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Alimentación</span>
            </button>

            <button
              onClick={() => setActiveTab("hydration")}
              className={`flex flex-col items-center gap-1 py-1.5 transition ${
                activeTab === "hydration" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Droplets className="h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Agua</span>
            </button>

            <button
              onClick={() => setActiveTab("workouts")}
              className={`flex flex-col items-center gap-1 py-1.5 transition ${
                activeTab === "workouts" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Dumbbell className="h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Rutinas</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex flex-col items-center gap-1 py-1.5 transition ${
                activeTab === "settings" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Settings className="h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Ajustes</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
