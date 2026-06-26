import React, { useState, useEffect } from "react";
import { 
  Heart, Flame, Utensils, Droplets, Dumbbell, Settings, Sparkles, Key, AlertCircle, Info, RefreshCw, ShoppingCart
} from "lucide-react";
import { User } from "firebase/auth";
import { UserProfile, LoggedMeal, WaterLog, WorkoutSession, MealType } from "./types";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import Workouts from "./components/Workouts";
import Hydration from "./components/Hydration";
import SettingsView from "./components/Settings";
import FoodLogger from "./components/FoodLogger";
import Auth from "./components/Auth";
import RecipeAssistantModal from "./components/RecipeAssistantModal";
import HealthWellness from "./components/HealthWellness";
import GroceryPlanner from "./components/GroceryPlanner";
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "workouts" | "hydration" | "settings" | "health" | "grocery">("dashboard");
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);
  const [isFoodLoggerOpen, setIsFoodLoggerOpen] = useState(false);
  const [isRecipeAssistantOpen, setIsRecipeAssistantOpen] = useState(false);
  const [defaultMealTypeForLogger, setDefaultMealTypeForLogger] = useState<MealType>("lunch");
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);

  const handleOpenFoodLogger = (suggestedType?: MealType) => {
    setDefaultMealTypeForLogger(suggestedType || getSuggestedMealTypeByTime().type);
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
                  }}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}

              {activeTab === "workouts" && (
                <Workouts
                  apiKey={profile.apiKey}
                  userProfile={profile}
                  workoutHistory={workoutHistory}
                  onAddWorkout={handleAddWorkout}
                  onClearWorkouts={handleClearWorkouts}
                  onUpdateProfile={handleUpdateProfile}
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

              {activeTab === "health" && (
                <HealthWellness
                  apiKey={profile.apiKey}
                  userProfile={profile}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}

              {activeTab === "grocery" && (
                <GroceryPlanner
                  apiKey={profile.apiKey}
                  userProfile={profile}
                />
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
          />
        )}

        {isRecipeAssistantOpen && profile && (
          <RecipeAssistantModal
            profile={profile}
            onAddMeal={handleAddMeal}
            onClose={() => setIsRecipeAssistantOpen(false)}
          />
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
              onClick={() => setActiveTab("workouts")}
              className={`flex flex-col items-center gap-1 py-1.5 transition ${
                activeTab === "workouts" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Dumbbell className="h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Rutinas</span>
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
              onClick={() => setActiveTab("health")}
              className={`flex flex-col items-center gap-1 py-1.5 transition ${
                activeTab === "health" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Heart className="h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Salud</span>
            </button>

            <button
              onClick={() => setActiveTab("grocery")}
              className={`flex flex-col items-center gap-1 py-1.5 transition ${
                activeTab === "grocery" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-wide">Compras</span>
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
