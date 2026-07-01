const toDayKey = (dateValue: Date) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);

  return date.toISOString();
};

export type WeeklyActivityEntry = {
  date: Date;
  sabaqSaved?: boolean;
  sabaqParaSaved?: boolean;
  manzilSaved?: boolean;
};

export const calculateWeeklyActivity = (
  entries: WeeklyActivityEntry[],
  todayValue = new Date(),
  startDateValue?: Date | null
) => {
  const activityByDay = new Map<
    string,
    { sabaq: boolean; sabaqPara: boolean; manzil: boolean }
  >();

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
