const toDayKey = (dateValue: Date) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);

  return date.toISOString();
};

export type WeeklyActivityEntry = {
  date: Date;
  sabaq?: string;
  sabaqPara?: string;
  manzil?: string;
  sabaqSaved?: boolean;
  sabaqParaSaved?: boolean;
  manzilSaved?: boolean;
  notes?: string | null;
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

export const calculateWeeklyActivityHistory = (
  entries: WeeklyActivityEntry[],
  todayValue = new Date(),
  startDateValue?: Date | null
) => {
  const activityByDay = new Map<
    string,
    {
      sabaq: boolean;
      sabaqPara: boolean;
      manzil: boolean;
      entries: Array<{
        sabaq: string;
        sabaqPara: string;
        manzil: string;
        sabaqSaved: boolean;
        sabaqParaSaved: boolean;
        manzilSaved: boolean;
        notes?: string | null;
      }>;
    }
  >();

  entries.forEach((entry) => {
    const dayKey = toDayKey(entry.date);
    const activity = activityByDay.get(dayKey) || {
      sabaq: false,
      sabaqPara: false,
      manzil: false,
      entries: [],
    };

    activity.sabaq = activity.sabaq || Boolean(entry.sabaqSaved);
    activity.sabaqPara = activity.sabaqPara || Boolean(entry.sabaqParaSaved);
    activity.manzil = activity.manzil || Boolean(entry.manzilSaved);
    activity.entries.push({
      sabaq: entry.sabaq || "",
      sabaqPara: entry.sabaqPara || "",
      manzil: entry.manzil || "",
      sabaqSaved: Boolean(entry.sabaqSaved),
      sabaqParaSaved: Boolean(entry.sabaqParaSaved),
      manzilSaved: Boolean(entry.manzilSaved),
      notes: entry.notes,
    });
    activityByDay.set(dayKey, activity);
  });

  const today = new Date(todayValue);
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(startDateValue || today);
  startDate.setHours(0, 0, 0, 0);

  const firstWeekStart = new Date(startDate);
  firstWeekStart.setDate(startDate.getDate() - startDate.getDay());

  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());

  const weeks = [];

  for (
    const weekStart = new Date(firstWeekStart);
    weekStart.getTime() <= currentWeekStart.getTime();
    weekStart.setDate(weekStart.getDate() + 7)
  ) {
    const weekStartCopy = new Date(weekStart);
    const weekEnd = new Date(weekStartCopy);
    weekEnd.setDate(weekStartCopy.getDate() + 6);

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStartCopy);
      date.setDate(weekStartCopy.getDate() + index);

      const dayKey = toDayKey(date);
      const activity = activityByDay.get(dayKey);
      const isBeforeSignup = date.getTime() < startDate.getTime();
      const isFuture = date.getTime() > today.getTime();
      const isOutsideRange = isBeforeSignup || isFuture;
      const completedCount = activity
        ? [activity.sabaq, activity.sabaqPara, activity.manzil].filter(Boolean).length
        : 0;

      return {
        date: dayKey,
        completedCount,
        isBeforeSignup,
        isFuture,
        isOutsideRange,
        entries: activity?.entries || [],
      };
    });

    weeks.push({
      weekStart: toDayKey(weekStartCopy),
      weekEnd: toDayKey(weekEnd),
      days,
    });
  }

  return weeks;
};
