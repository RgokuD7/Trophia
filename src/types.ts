export type BiologicalSex = "male" | "female";
export type FitnessGoal = "lose_weight" | "gain_muscle" | "aesthetics" | "maintenance";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type TrainingEnvironment = "gym" | "home" | "outdoor";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface UserProfile {
  name: string;
  age: number;
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
}
