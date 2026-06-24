import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile, LoggedMeal, WaterLog, WorkoutSession } from "../types";

// User Profile Operations
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

export const saveUserProfile = async (userId: string, profile: UserProfile): Promise<void> => {
  try {
    const docRef = doc(db, "users", userId);
    await setDoc(docRef, {
      ...profile,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw error;
  }
};

// Meals Operations
export const getMeals = async (userId: string): Promise<LoggedMeal[]> => {
  try {
    const mealsRef = collection(db, "users", userId, "meals");
    const q = query(mealsRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const meals: LoggedMeal[] = [];
    querySnapshot.forEach((doc) => {
      meals.push({ id: doc.id, ...doc.data() } as LoggedMeal);
    });
    return meals;
  } catch (error) {
    console.error("Error getting meals:", error);
    // Return empty array on failure as fallback
    return [];
  }
};

export const addMeal = async (userId: string, meal: Omit<LoggedMeal, "id">): Promise<LoggedMeal> => {
  try {
    const mealsRef = collection(db, "users", userId, "meals");
    const newDocRef = doc(mealsRef); // auto-generate ID on client
    const newMeal: LoggedMeal = {
      ...meal,
      id: newDocRef.id,
    };
    await setDoc(newDocRef, newMeal);
    return newMeal;
  } catch (error) {
    console.error("Error adding meal:", error);
    throw error;
  }
};

export const deleteMeal = async (userId: string, mealId: string): Promise<void> => {
  try {
    const mealDocRef = doc(db, "users", userId, "meals", mealId);
    await deleteDoc(mealDocRef);
  } catch (error) {
    console.error("Error deleting meal:", error);
    throw error;
  }
};

// Water Logs Operations
export const getWaterLogs = async (userId: string): Promise<WaterLog[]> => {
  try {
    const waterRef = collection(db, "users", userId, "waterLogs");
    const q = query(waterRef, orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(q);
    const logs: WaterLog[] = [];
    querySnapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as WaterLog);
    });
    return logs;
  } catch (error) {
    console.error("Error getting water logs:", error);
    return [];
  }
};

export const addWaterLog = async (userId: string, waterLog: Omit<WaterLog, "id">): Promise<WaterLog> => {
  try {
    const waterRef = collection(db, "users", userId, "waterLogs");
    const newDocRef = doc(waterRef);
    const newLog: WaterLog = {
      ...waterLog,
      id: newDocRef.id,
    };
    await setDoc(newDocRef, newLog);
    return newLog;
  } catch (error) {
    console.error("Error adding water log:", error);
    throw error;
  }
};

export const clearWaterLogs = async (userId: string): Promise<void> => {
  try {
    const waterRef = collection(db, "users", userId, "waterLogs");
    const snapshot = await getDocs(waterRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error clearing water logs:", error);
    throw error;
  }
};

// Workout Sessions Operations
export const getWorkoutHistory = async (userId: string): Promise<WorkoutSession[]> => {
  try {
    const workoutsRef = collection(db, "users", userId, "workouts");
    const q = query(workoutsRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const workouts: WorkoutSession[] = [];
    querySnapshot.forEach((doc) => {
      workouts.push({ id: doc.id, ...doc.data() } as WorkoutSession);
    });
    return workouts;
  } catch (error) {
    console.error("Error getting workouts:", error);
    return [];
  }
};

export const saveWorkoutSession = async (userId: string, workout: WorkoutSession): Promise<void> => {
  try {
    const docRef = doc(db, "users", userId, "workouts", workout.id || workout.date);
    // If it doesn't have an ID, we'll assign it one based on date or auto-gen
    const workoutData = {
      ...workout,
      id: workout.id || docRef.id,
      timestamp: serverTimestamp(),
    };
    await setDoc(docRef, workoutData, { merge: true });
  } catch (error) {
    console.error("Error saving workout session:", error);
    throw error;
  }
};

export const clearWorkoutHistory = async (userId: string): Promise<void> => {
  try {
    const workoutsRef = collection(db, "users", userId, "workouts");
    const snapshot = await getDocs(workoutsRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error clearing workouts:", error);
    throw error;
  }
};
