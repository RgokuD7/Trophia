import React, { useState, useEffect } from "react";
import { 
  Utensils, Droplets, Dumbbell, Settings, Lock, CookingPot, MessageSquare, Sparkles, X, Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { askNutriCoachIA } from "./services/geminiService";
import { User } from "firebase/auth";
import { UserProfile, LoggedMeal, WaterLog, WorkoutSession, MealType } from "./types";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import Hydration from "./components/Hydration";
import SettingsView from "./components/Settings";
import FoodLogger from "./components/FoodLogger";
import Auth from "./components/Auth";
import RecipeAssistantModal from "./components/RecipeAssistantModal";
import NutritionHub from "./components/NutritionHub";
import { getSuggestedMealTypeByTime } from "./utils/fitnessUtils";

// Import Firebase services
import { subscribeToAuthChanges, logout } from "./services/authService";
import { 
  getUserProfile, 
  saveUserProfile, 
  getMeals, 
  addMeal, 
  deleteMeal, 
  getWaterLogs, 
  addWaterLog, 
  clearWaterLogs, 
  getWorkoutHistory, 
  saveWorkoutSession, 
  clearWorkoutHistory,
  deleteUserAllData
} from "./services/dbService";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "nutrition" | "hydration" | "workouts" | "settings">("dashboard");
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);
  const [isFoodLoggerOpen, setIsFoodLoggerOpen] = useState(false);
  const [foodLoggerCustomOnly, setFoodLoggerCustomOnly] = useState(false);
  const [isRecipeAssistantOpen, setIsRecipeAssistantOpen] = useState(false);
  const [defaultMealTypeForLogger, setDefaultMealTypeForLogger] = useState<MealType>("lunch");
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);

  // Nutri-Coach state
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [coachMessage, setCoachMessage] = useState("");
  const [coachChatHistory, setCoachChatHistory] = useState<{ sender: "user" | "coach"; text: string }[]>([
    { sender: "coach", text: "¡Hola! Soy tu Nutri-Coach de Trophia IA. ¿Tienes alguna pregunta sobre tu dieta, suplementos o cómo mejorar tu alimentación hoy? Escribe tu duda aquí abajo." }
  ]);
  const [isCoachTyping, setIsCoachTyping] = useState(false);

  const handleSendCoachMessage = async () => {
    if (!coachMessage.trim() || !profile) return;
    const userText = coachMessage.trim();
    setCoachMessage("");
    setCoachChatHistory(prev => [...prev, { sender: "user", text: userText }]);
    setIsCoachTyping(true);

    try {
      const apiKey = profile.apiKey || import.meta.env.VITE_SYSTEM_GEMINI_API_KEY || "";
      
      const todayStr = new Date().toISOString().split("T")[0];
      const todayMeals = loggedMeals.filter(m => m.timestamp.startsWith(todayStr));
      const totalCal = todayMeals.reduce((s, m) => s + m.calories, 0);
      const totalP = todayMeals.reduce((s, m) => s + m.protein, 0);
      const totalC = todayMeals.reduce((s, m) => s + m.carbs, 0);
      const totalF = todayMeals.reduce((s, m) => s + m.fat, 0);
      
      const targetCal = profile.dailyCalorieTarget || 2000;
      const targetP = profile.proteinTarget || 140;
      const targetC = profile.carbsTarget || 230;
      const targetF = profile.fatTarget || 65;

      const context = `Usuario: ${profile.name}. Meta: ${profile.goal === "lose_weight" ? "Pérdida de peso" : "Ganancia de masa"}. Consumido hoy: ${totalCal}/${targetCal} kcal. P: ${Math.round(totalP)}/${targetP}g, C: ${Math.round(totalC)}/${targetC}g, G: ${Math.round(totalF)}/${targetF}g.`;
      
      const response = await askNutriCoachIA(apiKey, userText, context);
      setCoachChatHistory(prev => [...prev, { sender: "coach", text: response.answer }]);
    } catch (err: any) {
      console.error(err);
      setCoachChatHistory(prev => [...prev, { sender: "coach", text: `Lo siento, ocurrió un error al procesar tu duda: ${err.message || "Inténtalo de nuevo."}` }]);
    } finally {
      setIsCoachTyping(false);
    }
  };

  const handleOpenFoodLogger = (suggestedType?: MealType, isCustomOnly?: boolean) => {
    setDefaultMealTypeForLogger(suggestedType || getSuggestedMealTypeByTime().type);
    setFoodLoggerCustomOnly(!!isCustomOnly);
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
        try {
          // Fetch all data in parallel for efficiency
          const [profileData, mealsData, waterData, workoutsData] = await Promise.all([
            getUserProfile(currentUser.uid),
            getMeals(currentUser.uid),
            getWaterLogs(currentUser.uid),
            getWorkoutHistory(currentUser.uid)
          ]);

          if (profileData) {
            setProfile(profileData);
            if (profileData.apiKey) {
              localStorage.setItem("trophia_api_key", profileData.apiKey);
            }
          } else {
            // First time user, profile will be set after Onboarding
            setProfile(null);
          }
          setLoggedMeals(mealsData);
          setWaterLogs(waterData);
          setWorkoutHistory(workoutsData);
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
        setIsCheckingStorage(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handlers using Firestore dbService
  const handleOnboardingComplete = async (completedProfile: UserProfile) => {
    if (!user) return;
    try {
      await saveUserProfile(user.uid, completedProfile);
      setProfile(completedProfile);
      if (completedProfile.apiKey) {
        localStorage.setItem("trophia_api_key", completedProfile.apiKey);
      }
      setActiveTab("dashboard");
    } catch (e) {
      console.error("Error saving onboarding profile:", e);
    }
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    if (!user) return;
    try {
      await saveUserProfile(user.uid, updatedProfile);
      setProfile(updatedProfile);
      if (updatedProfile.apiKey) {
        localStorage.setItem("trophia_api_key", updatedProfile.apiKey);
      } else {
        localStorage.removeItem("trophia_api_key");
      }
    } catch (e) {
      console.error("Error updating profile:", e);
    }
  };

  const handleAddMeal = async (mealData: Omit<LoggedMeal, "id" | "timestamp">) => {
    if (!user) return;
    try {
      const newMealInput: Omit<LoggedMeal, "id"> = {
        ...mealData,
        timestamp: new Date().toISOString()
      };
      const newMeal = await addMeal(user.uid, newMealInput);
      setLoggedMeals([newMeal, ...loggedMeals]);
    } catch (e) {
      console.error("Error adding meal:", e);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!user) return;
    try {
      await deleteMeal(user.uid, id);
      setLoggedMeals(loggedMeals.filter(m => m.id !== id));
    } catch (e) {
      console.error("Error deleting meal:", e);
    }
  };

  const handleAddWater = async (amount: number) => {
    if (!user) return;
    try {
      const newWaterInput: Omit<WaterLog, "id"> = {
        amount,
        timestamp: new Date().toISOString()
      };
      const newLog = await addWaterLog(user.uid, newWaterInput);
      setWaterLogs([...waterLogs, newLog]);
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
                  onNavigateToTab={(tab) => {
                    if (tab === "workouts") setActiveTab("workouts");
                    if (tab === "hydration") setActiveTab("hydration");
                    if (tab === "settings") setActiveTab("settings");
                    if (tab === "nutrition") setActiveTab("nutrition");
                  }}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}

              {activeTab === "nutrition" && user && (
                <NutritionHub
                  profile={profile}
                  userId={user.uid}
                  loggedMeals={loggedMeals}
                  onAddMeal={handleAddMeal}
                  onDeleteMeal={handleDeleteMeal}
                  onOpenFoodLogger={handleOpenFoodLogger}
                  onOpenRecipeAssistant={() => setIsRecipeAssistantOpen(true)}
                  onUpdateProfile={handleUpdateProfile}
                  onOpenCoach={() => setIsCoachOpen(true)}
                  userCreationDateStr={user?.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString().split("T")[0] : undefined}
                />
              )}

              {activeTab === "hydration" && (
                <Hydration
                  waterLogs={waterLogs}
                  onAddWater={handleAddWater}
                  onClearWater={handleClearWater}
                  dailyGoalMl={2500}
                />
              )}

              {activeTab === "workouts" && (
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-5">
                  <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
                    <Lock className="h-8 w-8 text-white/20" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-black text-white tracking-tight">Próximamente</h2>
                    <p className="text-[11px] text-white/40 leading-relaxed max-w-[260px] mx-auto">
                      Estamos perfeccionando tu módulo de entrenamiento personalizado con IA. ¡Pronto estará disponible!
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <Dumbbell className="h-4 w-4 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400">Rutinas · Ejercicios · Progresión</span>
                  </div>
                </div>
              )}

              {activeTab === "settings" && user && (
                <SettingsView
                  profile={profile}
                  userId={user.uid}
                  onUpdateProfile={handleUpdateProfile}
                  onResetApp={handleResetApp}
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
            onAddMeal={handleAddMeal}
            onClose={() => setIsFoodLoggerOpen(false)}
            defaultMealType={defaultMealTypeForLogger}
            userId={user?.uid}
            isCustomFoodOnlyMode={foodLoggerCustomOnly}
            onCustomFoodAdded={() => {
              window.dispatchEvent(new CustomEvent("trophia_refresh_custom_foods"));
            }}
          />
        )}

        {isRecipeAssistantOpen && profile && (
          <RecipeAssistantModal
            profile={profile}
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
                        Nutri-Coach IA
                        <Sparkles className="h-3 w-3 text-emerald-400 fill-emerald-400/10" />
                      </h3>
                      <p className="text-[9px] text-white/40">Resuelve dudas sobre alimentación y macros</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCoachOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Chat Messages scroll area */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
                  {coachChatHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-emerald-500 text-black font-semibold rounded-tr-none"
                            : "bg-white/5 text-white/80 rounded-tl-none border border-white/5"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  
                  {isCoachTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/5 text-white/40 rounded-2xl rounded-tl-none px-3.5 py-3 text-[10px] font-bold flex items-center gap-2 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        Escribiendo respuesta...
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input panel */}
                <div className="p-4 border-t border-white/5 bg-white/[0.01] shrink-0 flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Ej: ¿El arroz blanco de noche es malo?"
                    value={coachMessage}
                    onChange={(e) => setCoachMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendCoachMessage()}
                    className="flex-1 p-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 focus:bg-white/[0.07] transition"
                  />
                  <button
                    onClick={handleSendCoachMessage}
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
              className={`relative flex flex-col items-center gap-1 py-1.5 transition ${
                activeTab === "workouts" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <div className="relative">
                <Dumbbell className="h-5 w-5" />
                <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1.5 text-amber-400" />
              </div>
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
