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
    
    // Clean undefined values to prevent Firestore setDoc errors
    const cleanedProfile = { ...profile };
    (Object.keys(cleanedProfile) as Array<keyof UserProfile>).forEach((key) => {
      if (cleanedProfile[key] === undefined) {
        delete cleanedProfile[key];
      }
    });

    await setDoc(docRef, {
      ...cleanedProfile,
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

// PWA Push Notifications Operations
export const savePushSubscription = async (userId: string, subscription: any): Promise<void> => {
  try {
    // Generate a clean document ID from the endpoint URL by encoding it in base64
    const subId = btoa(subscription.endpoint)
      .replace(/\//g, "_")
      .replace(/\+/g, "-")
      .replace(/=/g, "");
    
    const subRef = doc(db, "users", userId, "push_subscriptions", subId);
    await setDoc(subRef, {
      ...subscription,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    throw error;
  }
};

export const deletePushSubscription = async (userId: string, endpoint: string): Promise<void> => {
  try {
    const subId = btoa(endpoint)
      .replace(/\//g, "_")
      .replace(/\+/g, "-")
      .replace(/=/g, "");
      
    const subRef = doc(db, "users", userId, "push_subscriptions", subId);
    await deleteDoc(subRef);
  } catch (error) {
    console.error("Error deleting push subscription:", error);
    throw error;
  }
};

export const deleteUserAllData = async (userId: string): Promise<void> => {
  try {
    // 1. Delete meals
    const mealsRef = collection(db, "users", userId, "meals");
    const mealsSnap = await getDocs(mealsRef);
    if (!mealsSnap.empty) {
      const mealsBatch = writeBatch(db);
      mealsSnap.docs.forEach((doc) => {
        mealsBatch.delete(doc.ref);
      });
      await mealsBatch.commit();
    }

    // 2. Delete water logs
    const waterRef = collection(db, "users", userId, "waterLogs");
    const waterSnap = await getDocs(waterRef);
    if (!waterSnap.empty) {
      const waterBatch = writeBatch(db);
      waterSnap.docs.forEach((doc) => {
        waterBatch.delete(doc.ref);
      });
      await waterBatch.commit();
    }

    // 3. Delete workouts
    const workoutsRef = collection(db, "users", userId, "workouts");
    const workoutsSnap = await getDocs(workoutsRef);
    if (!workoutsSnap.empty) {
      const workoutsBatch = writeBatch(db);
      workoutsSnap.docs.forEach((doc) => {
        workoutsBatch.delete(doc.ref);
      });
      await workoutsBatch.commit();
    }

    // 4. Delete push subscriptions if any
    const pushRef = collection(db, "users", userId, "push_subscriptions");
    const pushSnap = await getDocs(pushRef);
    if (!pushSnap.empty) {
      const pushBatch = writeBatch(db);
      pushSnap.docs.forEach((doc) => {
        pushBatch.delete(doc.ref);
      });
      await pushBatch.commit();
    }

    // 5. Finally, delete the user profile document itself
    const userDocRef = doc(db, "users", userId);
    await deleteDoc(userDocRef);
  } catch (error) {
    console.error("Error deleting all user data from Firestore:", error);
    throw error;
  }
};


