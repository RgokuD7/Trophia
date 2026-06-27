"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkBirthdayCongrats = exports.checkDeficitNight = exports.checkHydrationAfternoon = exports.checkCreatineAndFoodLunch = exports.checkCreatineMorning = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const webpush = require("web-push");
admin.initializeApp();
const db = admin.firestore();
// Setup web-push
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails("mailto:soporte@trophia.com", vapidPublicKey, vapidPrivateKey);
}
else {
    console.error("VAPID Keys not found in process.env");
}
/**
 * Sends a push notification to all active subscriptions of a user
 */
async function sendPushToUser(userId, title, body) {
    try {
        const subsRef = db.collection("users").doc(userId).collection("push_subscriptions");
        const subsSnap = await subsRef.get();
        if (subsSnap.empty) {
            console.log(`No active subscriptions found for user: ${userId}`);
            return;
        }
        const payload = JSON.stringify({
            notification: {
                title,
                body,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                vibrate: [100, 50, 100],
                data: {
                    url: "/"
                }
            }
        });
        const sendPromises = subsSnap.docs.map(async (doc) => {
            const sub = doc.data();
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }, payload);
                console.log(`Successfully sent push to endpoint: ${sub.endpoint}`);
            }
            catch (err) {
                console.error(`Error sending push to endpoint ${sub.endpoint}:`, err);
                // If subscription is expired/invalid (404/410), delete it
                if (err.statusCode === 404 || err.statusCode === 410) {
                    console.log(`Deleting expired subscription: ${doc.id}`);
                    await doc.ref.delete();
                }
            }
        });
        await Promise.all(sendPromises);
    }
    catch (error) {
        console.error(`Error sending push to user ${userId}:`, error);
    }
}
/**
 * Helper to get today's date in YYYY-MM-DD format (timezone adjusted or default to local)
 */
function getTodayStrSantiago() {
    const santiagoDateStr = new Date().toLocaleString("en-US", { timeZone: "America/Santiago" });
    const d = new Date(santiagoDateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
// 1. Mañana - 09:00 AM (Chile)
exports.checkCreatineMorning = (0, scheduler_1.onSchedule)({
    schedule: "0 9 * * *",
    timeZone: "America/Santiago",
    memory: "256MiB"
}, async (event) => {
    console.log("Running checkCreatineMorning schedule...");
    const todayStr = getTodayStrSantiago();
    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
        const user = doc.data();
        if (user.isOnboardingCompleted && user.takesCreatine) {
            if (user.lastCreatineIntake !== todayStr) {
                const title = "⚡ ¡Hora de tu Creatina! 🏆";
                const body = `Hola ${user.name || "Richard"}, no olvides tomar tus 5g de creatina hoy para optimizar tu fuerza y recuperación.`;
                await sendPushToUser(doc.id, title, body);
            }
        }
    }
});
// 2. Almuerzo - 02:00 PM (Chile)
exports.checkCreatineAndFoodLunch = (0, scheduler_1.onSchedule)({
    schedule: "0 14 * * *",
    timeZone: "America/Santiago",
    memory: "256MiB"
}, async (event) => {
    console.log("Running checkCreatineAndFoodLunch schedule...");
    const todayStr = getTodayStrSantiago();
    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
        const user = doc.data();
        if (!user.isOnboardingCompleted)
            continue;
        // Creatina check
        if (user.takesCreatine && user.lastCreatineIntake !== todayStr) {
            const title = "⏱️ ¿Ya tomaste tu Creatina?";
            const body = `${user.name}, recuerda registrar tus 5g de creatina hoy para mantener tu racha de recuperación.`;
            await sendPushToUser(doc.id, title, body);
            continue; // Skip food check if we already reminded about creatine to not spam
        }
        // Food check (meals logged today)
        const mealsRef = db.collection("users").doc(doc.id).collection("meals");
        const mealsSnap = await mealsRef.where("date", "==", todayStr).get();
        if (mealsSnap.empty) {
            const title = "🥗 Registro de Almuerzo";
            const body = `Hola ${user.name}, ¿qué almorzaste hoy? Registra tus alimentos para mantener el control de tus macros.`;
            await sendPushToUser(doc.id, title, body);
        }
    }
});
// 3. Tarde - 06:00 PM (Chile)
exports.checkHydrationAfternoon = (0, scheduler_1.onSchedule)({
    schedule: "0 18 * * *",
    timeZone: "America/Santiago",
    memory: "256MiB"
}, async (event) => {
    console.log("Running checkHydrationAfternoon schedule...");
    const todayStr = getTodayStrSantiago();
    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
        const user = doc.data();
        if (!user.isOnboardingCompleted)
            continue;
        // Check water logs
        const waterRef = db.collection("users").doc(doc.id).collection("waterLogs");
        const waterSnap = await waterRef.where("date", "==", todayStr).get();
        let totalWaterMl = 0;
        waterSnap.forEach((logDoc) => {
            const data = logDoc.data();
            totalWaterMl += (data.amount || 0);
        });
        if (totalWaterMl < 1500) {
            const title = "💧 ¡Hora de hidratarse!";
            const body = `${user.name}, hoy has registrado menos de 1,500ml de agua (${totalWaterMl}ml). Bebe un vaso ahora.`;
            await sendPushToUser(doc.id, title, body);
            continue;
        }
        // Check if meals is empty
        const mealsRef = db.collection("users").doc(doc.id).collection("meals");
        const mealsSnap = await mealsRef.where("date", "==", todayStr).get();
        if (mealsSnap.empty) {
            const title = "🍽️ Diario de Comidas";
            const body = `¿Se te pasó registrar tus comidas, ${user.name}? Hazlo ahora para medir tu balance energético.`;
            await sendPushToUser(doc.id, title, body);
        }
    }
});
// 4. Noche - 09:30 PM (Chile)
exports.checkDeficitNight = (0, scheduler_1.onSchedule)({
    schedule: "30 21 * * *",
    timeZone: "America/Santiago",
    memory: "256MiB"
}, async (event) => {
    console.log("Running checkDeficitNight schedule...");
    const todayStr = getTodayStrSantiago();
    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
        const user = doc.data();
        if (!user.isOnboardingCompleted)
            continue;
        // Sum calories logged today
        const mealsRef = db.collection("users").doc(doc.id).collection("meals");
        const mealsSnap = await mealsRef.where("date", "==", todayStr).get();
        let totalCalories = 0;
        mealsSnap.forEach((mealDoc) => {
            const data = mealDoc.data();
            totalCalories += (data.calories || 0);
        });
        // Check sports logged today to calculate adjusted target
        const loggedSportsToday = user.loggedSportsToday || [];
        const todaySports = loggedSportsToday.filter((s) => s.date === todayStr);
        const sportsCalories = todaySports.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);
        const baseTarget = user.dailyCalorieTarget || 2000;
        const adjustedTarget = baseTarget + sportsCalories;
        // If total calories logged is below 70% of adjusted target
        if (totalCalories > 0 && totalCalories < adjustedTarget * 0.70) {
            const title = "⚠️ Alerta de Ingesta Calórica";
            const body = `Hola ${user.name}, hoy has consumido muy pocas calorías (${totalCalories} kcal de ${Math.round(adjustedTarget)}). Considera una merienda proteica para proteger tu masa muscular.`;
            await sendPushToUser(doc.id, title, body);
        }
    }
});
// 5. Cumpleaños - 00:01 AM (Chile)
exports.checkBirthdayCongrats = (0, scheduler_1.onSchedule)({
    schedule: "1 0 * * *",
    timeZone: "America/Santiago",
    memory: "256MiB"
}, async (event) => {
    console.log("Running checkBirthdayCongrats schedule...");
    const santiagoDateStr = new Date().toLocaleString("en-US", { timeZone: "America/Santiago" });
    const d = new Date(santiagoDateStr);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const todayMMDD = `${month}-${day}`; // e.g. "06-27"
    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
        const user = doc.data();
        if (user.isOnboardingCompleted && user.birthdate) {
            // birthdate format is YYYY-MM-DD
            const parts = user.birthdate.split("-");
            if (parts.length === 3) {
                const userMMDD = `${parts[1]}-${parts[2]}`;
                if (userMMDD === todayMMDD) {
                    const title = `🎂 ¡Feliz Cumpleaños, ${user.name}! 🥳`;
                    const body = "¡El equipo de Trophia te desea un día espectacular! Que hoy sea un día lleno de energía, salud y mucho entrenamiento. ¡A celebrar! 🏆";
                    await sendPushToUser(doc.id, title, body);
                }
            }
        }
    }
});
//# sourceMappingURL=index.js.map