export type BiologicalSex = "male" | "female";
export type FitnessGoal = "lose_weight" | "gain_muscle" | "aesthetics" | "maintenance";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type TrainingEnvironment = "gym" | "home" | "outdoor";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type DietType = "standard" | "vegetarian" | "vegan" | "keto" | "paleo" | "mediterranean";

export interface UserProfile {
  name: string;
  age: number;
  birthdate?: string; // Format YYYY-MM-DD
  sex: BiologicalSex;
  weight: number; // in kg
  height: number; // in cm
  neck?: number; // in cm, for Navy formula
  waist?: number; // in cm, for Navy formula
  hip?: number; // in cm, optional for female Navy formula
  bodyFat?: number; // percentage
  bmi: number;
  goal: FitnessGoal;
  level: ExperienceLevel;
  environment: TrainingEnvironment;
  equipment: string[];
  nutritionKnowledge: "low" | "medium" | "high";
  dietType?: DietType;
  dailyCalorieTarget: number;
  proteinTarget: number; // in grams
  carbsTarget: number; // in grams
  fatTarget: number; // in grams
  apiKey?: string;
  usdaApiKey?: string;
  isOnboardingCompleted: boolean;
  theme: "light" | "dark";
  takesCreatine?: boolean;
  lastCreatineIntake?: string; // Format YYYY-MM-DD
  favoriteExercises?: string[];
  sleepLogs?: { date: string; hours: number; quality: number }[];
  moodLogs?: { date: string; mood: number; energy: number; notes?: string }[];
  frequentRoutes?: FrequentRoute[];
  activeRoutesToday?: { routeId: string; date: string }[];
  loggedSportsToday?: LoggedSport[];
  weeklyTrainingDays?: number;
  environments?: TrainingEnvironment[];
  activityLevel?: "sedentary" | "lightly_active" | "moderately_active" | "highly_active" | "heavy_labor";
  stepsRange?: "under_4k" | "5k_7k" | "8k_10k" | "12k_15k" | "over_18k";
  deficitPace?: "conservative" | "moderate" | "aggressive";
  solidMealsCount?: number;
  parqAnswers?: {
    q1: boolean;
    q2: boolean;
    q3: boolean;
    q4: boolean;
    q5: boolean;
    q6: boolean;
    q7: boolean;
  };
  requiresMedicalClearance?: boolean;
  jointPainAreas?: ("knee" | "back" | "shoulder")[];
  trainingAge?: ExperienceLevel;

  aiRecommendations?: {
    summary: string;
    nutritionAdvice: string;
    trainingAdvice: string;
    healthCheck: string;
    lastUpdated: string;
  };
}

export interface LoggedMeal {
  id: string;
  name: string;
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
  timestamp: string; // ISO string
  type: MealType;
}

export interface WaterLog {
  id: string;
  amount: number; // in ml
  timestamp: string; // ISO string
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number; // in kg
  caloriesBurnedPerSet: number; // conservative estimation
  completedSets: {
    setIndex: number;
    completed: boolean;
    reps: number;
    weight: number;
  }[];
}

export interface WorkoutSession {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  warmup: string[]; // warm-up mobility exercises
  exercises: WorkoutExercise[];
  cooldown: string[]; // cool-down stretches
  completed: boolean;
  durationMinutes: number;
}

export interface MuscleRecovery {
  chest: number; // 0 to 100
  back: number;
  legs: number;
  shoulders: number;
  arms: number;
  core: number;
  lastUpdated: string; // ISO string
}

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  source?: "local" | "history" | "usda" | "off";
  brand?: string;
  image?: string;
  barcode?: string;
  ingredients?: string[];
}

export interface FrequentRoute {
  id: string;
  name: string;
  distanceKm: number;
  activityType: "walking" | "running" | "cycling";
  caloriesBurned: number;
}

export interface LoggedSport {
  id: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
  date: string; // YYYY-MM-DD
}
