const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toDayKey = (dateValue: Date) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);

  return date.toISOString();
};

type StreakEntry = {
  date: Date;
  sabaqSaved?: boolean;
  sabaqParaSaved?: boolean;
  manzilSaved?: boolean;
};

const getCompletedDayKeys = (entries: StreakEntry[]) => {
  const days = new Map<string, { sabaq: boolean; sabaqPara: boolean; manzil: boolean }>();

  entries.forEach((entry) => {
    const dayKey = toDayKey(entry.date);
    const day = days.get(dayKey) || {
      sabaq: false,
      sabaqPara: false,
      manzil: false,
    };

    day.sabaq = day.sabaq || Boolean(entry.sabaqSaved);
    day.sabaqPara = day.sabaqPara || Boolean(entry.sabaqParaSaved);
    day.manzil = day.manzil || Boolean(entry.manzilSaved);
    days.set(dayKey, day);
  });

  return Array.from(days.entries())
    .filter(([, day]) => day.sabaq && day.sabaqPara && day.manzil)
    .map(([dayKey]) => dayKey)
    .sort();
};

export const calculateStreakStats = (entries: StreakEntry[], todayValue = new Date()) => {
  const dayKeys = getCompletedDayKeys(entries);

  if (dayKeys.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      longestStreakRange: null,
      lastCompletedDate: null,
    };
  }

  let currentStart = dayKeys[0];
  let currentEnd = dayKeys[0];
  let bestStart = dayKeys[0];
  let bestEnd = dayKeys[0];
  let bestLength = 1;
  let currentLength = 1;
  let finalRunStart = dayKeys[0];
  let finalRunEnd = dayKeys[0];
  let finalRunLength = 1;

  for (let index = 1; index < dayKeys.length; index += 1) {
    const previousDate = new Date(dayKeys[index - 1]);
    const currentDate = new Date(dayKeys[index]);
    const diffDays = (currentDate.getTime() - previousDate.getTime()) / MS_PER_DAY;

    if (diffDays === 1) {
      currentEnd = dayKeys[index];
      currentLength += 1;
    } else {
      currentStart = dayKeys[index];
      currentEnd = dayKeys[index];
      currentLength = 1;
    }

    if (currentLength > bestLength) {
      bestStart = currentStart;
      bestEnd = currentEnd;
      bestLength = currentLength;
    }

    finalRunStart = currentStart;
    finalRunEnd = currentEnd;
    finalRunLength = currentLength;
  }

  const today = new Date(todayValue);
  today.setHours(0, 0, 0, 0);
  const lastCompletedDate = new Date(dayKeys[dayKeys.length - 1]);
  const daysSinceLastCompleted =
    (today.getTime() - lastCompletedDate.getTime()) / MS_PER_DAY;
  const currentStreak = daysSinceLastCompleted <= 1 ? finalRunLength : 0;

  return {
    currentStreak,
    longestStreak: bestLength,
    longestStreakRange: {
      startDate: bestStart,
      endDate: bestEnd,
      length: bestLength,
    },
    lastCompletedDate: finalRunEnd,
  };
};

export const calculateLongestStreakRange = (entries: StreakEntry[]) =>
  calculateStreakStats(entries).longestStreakRange;
