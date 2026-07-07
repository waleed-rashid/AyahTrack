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
  const startDate = new Date(startDateValue || today);
  startDate.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

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
      return date;
    })
      .filter((date) => date.getTime() >= startDate.getTime() && date.getTime() <= today.getTime())
      .map((date) => {
        const dayKey = toDayKey(date);
        const activity = activityByDay.get(dayKey);
        const completedCount = activity
          ? [activity.sabaq, activity.sabaqPara, activity.manzil].filter(Boolean).length
          : 0;

        return {
          date: dayKey,
          completedCount,
          isBeforeSignup: false,
          isFuture: false,
          isOutsideRange: false,
          entries: activity?.entries || [],
        };
      });

    if (days.length > 0) {
      weeks.push({
        weekStart: days[0].date,
        weekEnd: days[days.length - 1].date,
        days,
      });
    }
  }

  return weeks;
};

export const calculateActivityMonths = (todayValue = new Date(), startDateValue?: Date | null) => {
  const today = new Date(todayValue);
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(startDateValue || today);
  startDate.setHours(0, 0, 0, 0);

  const months = [];

  for (
    const monthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    monthCursor.getTime() <= today.getTime();
    monthCursor.setMonth(monthCursor.getMonth() + 1)
  ) {
    months.push({
      key: `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, "0")}`,
      label: monthCursor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    });
  }

  return months;
};
