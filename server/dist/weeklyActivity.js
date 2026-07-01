"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateWeeklyActivity = void 0;
const toDayKey = (dateValue) => {
    const date = new Date(dateValue);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
};
const calculateWeeklyActivity = (entries, todayValue = new Date(), startDateValue) => {
    const activityByDay = new Map();
    entries.forEach((entry) => {
        const dayKey = toDayKey(entry.date);
        const activity = activityByDay.get(dayKey) || {
            sabaq: false,
            sabaqPara: false,
            manzil: false,
        };
        activity.sabaq = activity.sabaq || Boolean(entry.sabaqSaved);
        activity.sabaqPara = activity.sabaqPara || Boolean(entry.sabaqParaSaved);
        activity.manzil = activity.manzil || Boolean(entry.manzilSaved);
        activityByDay.set(dayKey, activity);
    });
    const today = new Date(todayValue);
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        const dayKey = toDayKey(date);
        const activity = activityByDay.get(dayKey);
        const isFuture = date.getTime() > today.getTime();
        const completedCount = activity
            ? [activity.sabaq, activity.sabaqPara, activity.manzil].filter(Boolean).length
            : 0;
        return {
            date: dayKey,
            completedCount,
            isFuture,
        };
    });
};
exports.calculateWeeklyActivity = calculateWeeklyActivity;
