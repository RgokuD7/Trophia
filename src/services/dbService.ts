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
  serverTimestamp,
  updateDoc,
  increment,
  where,
  onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile, LoggedMeal, WaterLog, WorkoutSession, CustomFood, CustomExercise, BarcodeCorrection, HouseholdGroup, PantryItem, CoachChatMessage, SavedRecipe } from "../types";

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

const removeUndefinedRecursive = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedRecursive).filter(item => item !== undefined);
  } else if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      const val = removeUndefinedRecursive(obj[key]);
      if (val !== undefined) {
        newObj[key] = val;
      }
    });
    return newObj;
  }
  return obj;
};

export const saveUserProfile = async (userId: string, profile: UserProfile): Promise<void> => {
  try {
    const docRef = doc(db, "users", userId);
    
    // Clean undefined values recursively to prevent Firestore setDoc errors
    const cleanedProfile = removeUndefinedRecursive(profile);

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
    const cleanedMeal = removeUndefinedRecursive(newMeal);
    await setDoc(newDocRef, cleanedMeal);
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

export const updateMeal = async (userId: string, meal: LoggedMeal): Promise<LoggedMeal> => {
  try {
    const mealDocRef = doc(db, "users", userId, "meals", meal.id);
    const cleanedMeal = removeUndefinedRecursive(meal);
    await setDoc(mealDocRef, cleanedMeal, { merge: true });
    return meal;
  } catch (error) {
    console.error("Error updating meal:", error);
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
    const cleanedLog = removeUndefinedRecursive(newLog);
    await setDoc(newDocRef, cleanedLog);
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
    const cleanedWorkout = removeUndefinedRecursive(workoutData);
    await setDoc(docRef, cleanedWorkout, { merge: true });
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
const getSubscriptionDocId = (endpoint: string): string => {
  const endpointStr = String(endpoint || Date.now());
  return btoa(unescape(encodeURIComponent(endpointStr)))
    .replace(/\//g, "_")
    .replace(/\+/g, "-")
    .replace(/=/g, "")
    .slice(-100);
};

export const savePushSubscription = async (userId: string, subscription: any): Promise<void> => {
  try {
    const subId = getSubscriptionDocId(subscription?.endpoint);
    const subRef = doc(db, "users", userId, "push_subscriptions", subId);
    const cleanedSub = removeUndefinedRecursive(subscription);
    await setDoc(subRef, {
      ...cleanedSub,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("Error saving push subscription:", error);
  }
};

export const deletePushSubscription = async (userId: string, endpoint: string): Promise<void> => {
  try {
    const subId = getSubscriptionDocId(endpoint);
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

    // Delete custom foods
    const customFoodsRef = collection(db, "users", userId, "customFoods");
    const customFoodsSnap = await getDocs(customFoodsRef);
    if (!customFoodsSnap.empty) {
      const customFoodsBatch = writeBatch(db);
      customFoodsSnap.docs.forEach((doc) => {
        customFoodsBatch.delete(doc.ref);
      });
      await customFoodsBatch.commit();
    }

    // Delete custom exercises
    const customExercisesRef = collection(db, "users", userId, "customExercises");
    const customExercisesSnap = await getDocs(customExercisesRef);
    if (!customExercisesSnap.empty) {
      const customExercisesBatch = writeBatch(db);
      customExercisesSnap.docs.forEach((doc) => {
        customExercisesBatch.delete(doc.ref);
      });
      await customExercisesBatch.commit();
    }

    // Delete saved recipes
    const recipesRef = collection(db, "users", userId, "recipes");
    const recipesSnap = await getDocs(recipesRef);
    if (!recipesSnap.empty) {
      const recipesBatch = writeBatch(db);
      recipesSnap.docs.forEach((doc) => {
        recipesBatch.delete(doc.ref);
      });
      await recipesBatch.commit();
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

    // 5. Delete coach chat history if any
    const coachChatRef = doc(db, "users", userId, "coachChat", "history");
    await deleteDoc(coachChatRef).catch(() => {});

    // 6. Finally, delete the user profile document itself
    const userDocRef = doc(db, "users", userId);
    await deleteDoc(userDocRef);
  } catch (error) {
    console.error("Error deleting all user data from Firestore:", error);
    throw error;
  }
};

// Custom Foods Operations (Firestore-backed personal food database)
export const getCustomFoods = async (userId: string): Promise<CustomFood[]> => {
  try {
    const foodsRef = collection(db, "users", userId, "customFoods");
    const q = query(foodsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const foods: CustomFood[] = [];
    querySnapshot.forEach((doc) => {
      foods.push({ id: doc.id, ...doc.data() } as CustomFood);
    });
    return foods;
  } catch (error) {
    console.error("Error getting custom foods:", error);
    return [];
  }
};

export const addCustomFood = async (userId: string, food: Omit<CustomFood, "id">): Promise<CustomFood> => {
  try {
    const foodsRef = collection(db, "users", userId, "customFoods");
    const newDocRef = doc(foodsRef);
    const newFood: CustomFood = { ...food, id: newDocRef.id };
    const cleanedFood = removeUndefinedRecursive(newFood);
    await setDoc(newDocRef, cleanedFood);
    return newFood;
  } catch (error) {
    console.error("Error adding custom food:", error);
    throw error;
  }
};

export const deleteCustomFood = async (userId: string, foodId: string): Promise<void> => {
  try {
    const foodDocRef = doc(db, "users", userId, "customFoods", foodId);
    await deleteDoc(foodDocRef);
  } catch (error) {
    console.error("Error deleting custom food:", error);
    throw error;
  }
};

export const updateCustomFood = async (userId: string, food: CustomFood): Promise<void> => {
  try {
    const foodDocRef = doc(db, "users", userId, "customFoods", food.id);
    const cleanedFood = removeUndefinedRecursive(food);
    await setDoc(foodDocRef, cleanedFood, { merge: true });
  } catch (error) {
    console.error("Error updating custom food:", error);
    throw error;
  }
};

// ==========================================
// Saved Recipes Operations (Personal & Public Community)
// ==========================================

export const getUserRecipes = async (userId: string): Promise<SavedRecipe[]> => {
  try {
    const recipesRef = collection(db, "users", userId, "recipes");
    const q = query(recipesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const recipes: SavedRecipe[] = [];
    querySnapshot.forEach((doc) => {
      recipes.push({ id: doc.id, ...doc.data() } as SavedRecipe);
    });
    return recipes;
  } catch (error) {
    console.error("Error getting user recipes:", error);
    return [];
  }
};

export const getPublicRecipes = async (): Promise<SavedRecipe[]> => {
  try {
    const publicRef = collection(db, "public_recipes");
    const q = query(publicRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const recipes: SavedRecipe[] = [];
    querySnapshot.forEach((doc) => {
      recipes.push({ id: doc.id, ...doc.data() } as SavedRecipe);
    });
    return recipes;
  } catch (error) {
    console.error("Error getting public recipes:", error);
    return [];
  }
};

export const saveUserRecipe = async (
  userId: string,
  recipe: Omit<SavedRecipe, "id"> | SavedRecipe
): Promise<SavedRecipe> => {
  try {
    const recipesRef = collection(db, "users", userId, "recipes");
    const recipeId = (recipe as SavedRecipe).id || doc(recipesRef).id;
    const finalRecipe: SavedRecipe = {
      ...recipe,
      id: recipeId,
      userId,
      createdAt: (recipe as SavedRecipe).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const cleaned = removeUndefinedRecursive(finalRecipe);

    // Save in user's personal collection
    await setDoc(doc(db, "users", userId, "recipes", recipeId), cleaned, { merge: true });

    // If marked public, sync to public_recipes collection
    if (finalRecipe.isPublic) {
      await setDoc(doc(db, "public_recipes", recipeId), cleaned, { merge: true });
    } else {
      // If was previously public and now private, remove from public collection
      try {
        await deleteDoc(doc(db, "public_recipes", recipeId));
      } catch (_) {}
    }

    return finalRecipe;
  } catch (error) {
    console.error("Error saving recipe:", error);
    throw error;
  }
};

export const deleteUserRecipe = async (userId: string, recipeId: string): Promise<void> => {
  try {
    // Delete from user collection
    await deleteDoc(doc(db, "users", userId, "recipes", recipeId));
    // Also delete from public_recipes if it existed
    try {
      await deleteDoc(doc(db, "public_recipes", recipeId));
    } catch (_) {}
  } catch (error) {
    console.error("Error deleting recipe:", error);
    throw error;
  }
};

export const toggleRecipePublic = async (userId: string, recipe: SavedRecipe, isPublic: boolean): Promise<void> => {
  try {
    const updated: SavedRecipe = {
      ...recipe,
      isPublic,
      updatedAt: new Date().toISOString()
    };
    await saveUserRecipe(userId, updated);
  } catch (error) {
    console.error("Error toggling recipe public status:", error);
    throw error;
  }
};

// Community Barcode Corrections Operations
export const getBarcodeCorrection = async (barcode: string): Promise<BarcodeCorrection | null> => {
  if (!barcode || barcode.trim() === "") return null;
  try {
    const docRef = doc(db, "barcodes", barcode);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as BarcodeCorrection;
    }
    return null;
  } catch (error) {
    console.error("Error getting barcode correction:", error);
    return null;
  }
};

export const saveBarcodeCorrection = async (
  barcode: string,
  data: Omit<BarcodeCorrection, "yesVotes" | "noVotes" | "updatedAt">
): Promise<void> => {
  if (!barcode || barcode.trim() === "") return;
  try {
    const docRef = doc(db, "barcodes", barcode);
    await setDoc(docRef, {
      ...data,
      barcode,
      yesVotes: 1, // Start with 1 vote from creator
      noVotes: 0,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("Error saving barcode correction:", error);
    throw error;
  }
};

export const voteBarcodeCorrection = async (barcode: string, approved: boolean): Promise<void> => {
  if (!barcode || barcode.trim() === "") return;
  try {
    const docRef = doc(db, "barcodes", barcode);
    await updateDoc(docRef, {
      yesVotes: approved ? increment(1) : increment(0),
      noVotes: !approved ? increment(1) : increment(0),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error voting on barcode correction:", error);
  }
};

// Custom Exercises Operations (Personal exercise library & AI cache)
export const getCustomExercises = async (userId: string): Promise<CustomExercise[]> => {
  try {
    const exRef = collection(db, "users", userId, "customExercises");
    const q = query(exRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const exercises: CustomExercise[] = [];
    querySnapshot.forEach((doc) => {
      exercises.push({ id: doc.id, ...doc.data() } as CustomExercise);
    });
    return exercises;
  } catch (error) {
    console.error("Error getting custom exercises:", error);
    return [];
  }
};

export const addCustomExercise = async (userId: string, exercise: Omit<CustomExercise, "id">): Promise<CustomExercise> => {
  try {
    const exRef = collection(db, "users", userId, "customExercises");
    const newDocRef = doc(exRef);
    const cleaned = removeUndefinedRecursive(exercise);
    const newExercise: CustomExercise = {
      ...cleaned,
      id: newDocRef.id,
      normalizedName: exercise.name.trim().toLowerCase(),
    };
    await setDoc(newDocRef, newExercise);
    return newExercise;
  } catch (error) {
    console.error("Error adding custom exercise:", error);
    throw error;
  }
};

export const updateCustomExercise = async (
  userId: string, 
  exerciseId: string, 
  updates: Partial<Omit<CustomExercise, "id">>
): Promise<void> => {
  try {
    const exDocRef = doc(db, "users", userId, "customExercises", exerciseId);
    const cleaned = removeUndefinedRecursive(updates);
    if (cleaned.name) {
      cleaned.normalizedName = cleaned.name.trim().toLowerCase();
    }
    await updateDoc(exDocRef, cleaned);
  } catch (error) {
    console.error("Error updating custom exercise:", error);
    throw error;
  }
};

export const deleteCustomExercise = async (userId: string, exerciseId: string): Promise<void> => {
  try {
    const exDocRef = doc(db, "users", userId, "customExercises", exerciseId);
    await deleteDoc(exDocRef);
  } catch (error) {
    console.error("Error deleting custom exercise:", error);
    throw error;
  }
};

// Household & Shared Pantry Operations
export const generateHouseholdInviteCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "FAM-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createHouseholdGroup = async (
  userId: string,
  userName: string,
  householdName: string,
  initialPantry: PantryItem[] = []
): Promise<HouseholdGroup> => {
  try {
    const householdRef = doc(collection(db, "households"));
    const inviteCode = generateHouseholdInviteCode();
    const newGroup: HouseholdGroup = {
      id: householdRef.id,
      name: householdName.trim() || "Mi Hogar",
      inviteCode,
      createdBy: userId,
      members: [
        {
          userId,
          name: userName.trim() || "Usuario",
          joinedAt: new Date().toISOString()
        }
      ],
      pantry: initialPantry,
      updatedAt: new Date().toISOString()
    };

    await setDoc(householdRef, newGroup);

    // Link user profile
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      householdId: newGroup.id,
      householdName: newGroup.name,
      householdInviteCode: newGroup.inviteCode
    });

    return newGroup;
  } catch (error) {
    console.error("Error creating household group:", error);
    throw error;
  }
};

export const joinHouseholdGroupByCode = async (
  userId: string,
  userName: string,
  inviteCode: string
): Promise<HouseholdGroup> => {
  try {
    const cleanedCode = inviteCode.trim().toUpperCase();
    const householdsRef = collection(db, "households");
    const q = query(householdsRef, where("inviteCode", "==", cleanedCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("No se encontró ningún grupo familiar con este código de invitación.");
    }

    const docSnap = snap.docs[0];
    const group = { id: docSnap.id, ...docSnap.data() } as HouseholdGroup;

    // Check if user is already a member
    const isMember = (group.members || []).some(m => m.userId === userId);
    if (!isMember) {
      const updatedMembers = [
        ...(group.members || []),
        {
          userId,
          name: userName.trim() || "Familiar",
          joinedAt: new Date().toISOString()
        }
      ];

      await updateDoc(docSnap.ref, {
        members: updatedMembers,
        updatedAt: new Date().toISOString()
      });

      group.members = updatedMembers;
    }

    // Link user profile
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      householdId: group.id,
      householdName: group.name,
      householdInviteCode: group.inviteCode
    });

    return group;
  } catch (error) {
    console.error("Error joining household group:", error);
    throw error;
  }
};

export const leaveHouseholdGroup = async (userId: string, householdId: string): Promise<void> => {
  try {
    const householdRef = doc(db, "households", householdId);
    const snap = await getDoc(householdRef);

    if (snap.exists()) {
      const group = snap.data() as HouseholdGroup;
      const filteredMembers = (group.members || []).filter(m => m.userId !== userId);
      await updateDoc(householdRef, {
        members: filteredMembers,
        updatedAt: new Date().toISOString()
      });
    }

    // Unlink user profile
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      householdId: null,
      householdName: null,
      householdInviteCode: null
    });
  } catch (error) {
    console.error("Error leaving household group:", error);
    throw error;
  }
};

export const updateHouseholdPantry = async (householdId: string, pantry: PantryItem[]): Promise<void> => {
  try {
    const householdRef = doc(db, "households", householdId);
    await updateDoc(householdRef, {
      pantry,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating household pantry:", error);
    throw error;
  }
};

export const subscribeToHousehold = (
  householdId: string,
  callback: (group: HouseholdGroup | null) => void
): (() => void) => {
  const householdRef = doc(db, "households", householdId);
  return onSnapshot(
    householdRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as HouseholdGroup);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error("Error in household snapshot subscription:", err);
      callback(null);
    }
  );
};

// Coach Chat History Operations
export const getCoachChatHistory = async (userId: string): Promise<CoachChatMessage[]> => {
  try {
    const chatDocRef = doc(db, "users", userId, "coachChat", "history");
    const snap = await getDoc(chatDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data?.messages || []) as CoachChatMessage[];
    }
    return [];
  } catch (error) {
    console.error("Error getting coach chat history:", error);
    return [];
  }
};

export const saveCoachChatHistory = async (userId: string, messages: CoachChatMessage[]): Promise<void> => {
  try {
    const chatDocRef = doc(db, "users", userId, "coachChat", "history");
    // Cap at the latest 40 messages to keep document lightweight and fast
    const cappedMessages = messages.slice(-40);
    await setDoc(chatDocRef, {
      messages: cappedMessages,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving coach chat history:", error);
  }
};

export const clearCoachChatHistory = async (userId: string): Promise<void> => {
  try {
    const chatDocRef = doc(db, "users", userId, "coachChat", "history");
    await deleteDoc(chatDocRef);
  } catch (error) {
    console.error("Error clearing coach chat history:", error);
  }
};

