import { surahs } from "../data/surahs";

export const coverageTypes = [
  { key: "sabaq", label: "Sabaq" },
  { key: "sabaqPara", label: "Sabaq Para" },
  { key: "revision", label: "Revision" },
];

export const createDefaultCoverage = () =>
  coverageTypes.reduce((coverage, type) => {
    coverage[type.key] = {
      startSurahNumber: 1,
      startAyah: 1,
      endSurahNumber: 1,
      endAyah: 7,
    };

    return coverage;
  }, {});

export const getSurahByNumber = (surahNumber) =>
  surahs.find((surah) => surah.number === Number(surahNumber)) || surahs[0];

export const formatCoverageRange = (entry) => {
  if (!entry) {
    return "";
  }

  const startSurah = getSurahByNumber(entry.startSurahNumber);
  const endSurah = getSurahByNumber(entry.endSurahNumber);

  if (startSurah.number === endSurah.number) {
    return `${startSurah.name} ${entry.startAyah} - ${entry.endAyah}`;
  }

  return `${startSurah.name} ${entry.startAyah} - ${endSurah.name} ${entry.endAyah}`;
};

const getSurahByName = (surahName) =>
  surahs.find((surah) => surah.name.toLowerCase() === surahName?.toLowerCase());

export const parseCoverageRange = (coverageText) => {
  const legacyRangeMatch = coverageText?.match(
    /^\d+\.\s*([^:]+):(\d+)\s*-\s*\d+\.\s*([^:]+):(\d+)$/
  );

  if (legacyRangeMatch) {
    const [, startSurahName, startAyah, endSurahName, endAyah] = legacyRangeMatch;
    const startSurah = getSurahByName(startSurahName);
    const endSurah = getSurahByName(endSurahName);

    if (startSurah && endSurah) {
      return {
        startSurahNumber: startSurah.number,
        startAyah: Number(startAyah),
        endSurahNumber: endSurah.number,
        endAyah: Number(endAyah),
      };
    }
  }

  const normalizedRangeMatch = coverageText?.match(/^(.+)\s+(\d+)\s+-\s+(.+)\s+(\d+)$/);

  if (normalizedRangeMatch) {
    const [, startSurahName, startAyah, endSurahName, endAyah] = normalizedRangeMatch;
    const startSurah = getSurahByName(startSurahName);
    const endSurah = getSurahByName(endSurahName);

    if (startSurah && endSurah) {
      return {
        startSurahNumber: startSurah.number,
        startAyah: Number(startAyah),
        endSurahNumber: endSurah.number,
        endAyah: Number(endAyah),
      };
    }
  }

  const sameSurahRangeMatch = coverageText?.match(/^(.+)\s+(\d+)\s+-\s+(\d+)$/);

  if (sameSurahRangeMatch) {
    const [, surahName, startAyah, endAyah] = sameSurahRangeMatch;
    const surah = getSurahByName(surahName);

    if (surah) {
      return {
        startSurahNumber: surah.number,
        startAyah: Number(startAyah),
        endSurahNumber: surah.number,
        endAyah: Number(endAyah),
      };
    }
  }

  return null;
};

export const formatRecentCoverage = (coverageText) => {
  const parsedCoverage = parseCoverageRange(coverageText);

  if (!parsedCoverage) {
    return coverageText;
  }

  const startSurah = getSurahByNumber(parsedCoverage.startSurahNumber);
  const endSurah = getSurahByNumber(parsedCoverage.endSurahNumber);
  const startsAtFirstAyah = parsedCoverage.startAyah === 1;
  const endsAtLastAyah = parsedCoverage.endAyah === endSurah.ayahs;

  if (startSurah.number === endSurah.number) {
    if (startsAtFirstAyah && endsAtLastAyah) {
      return startSurah.name;
    }

    return `${startSurah.name} ${parsedCoverage.startAyah} - ${parsedCoverage.endAyah}`;
  }

  const startReference = startsAtFirstAyah
    ? startSurah.name
    : `${startSurah.name} ${parsedCoverage.startAyah}`;
  const endReference = endsAtLastAyah
    ? endSurah.name
    : `${endSurah.name} ${parsedCoverage.endAyah}`;

  return `${startReference} - ${endReference}`;
};

export const createCoverageFromEntry = (entry) => {
  if (!entry) {
    return createDefaultCoverage();
  }

  return {
    ...createDefaultCoverage(),
    ...(parseCoverageRange(entry.sabaq) ? { sabaq: parseCoverageRange(entry.sabaq) } : {}),
    ...(parseCoverageRange(entry.sabaqPara)
      ? { sabaqPara: parseCoverageRange(entry.sabaqPara) }
      : {}),
    ...(parseCoverageRange(entry.manzil) ? { revision: parseCoverageRange(entry.manzil) } : {}),
  };
};

export const createNextCoverageRange = (coverageText) => {
  const parsedCoverage = parseCoverageRange(coverageText);

  if (!parsedCoverage) {
    return null;
  }

  const endSurah = getSurahByNumber(parsedCoverage.endSurahNumber);
  const nextSurahNumber =
    parsedCoverage.endAyah >= endSurah.ayahs
      ? Math.min(parsedCoverage.endSurahNumber + 1, surahs[surahs.length - 1].number)
      : parsedCoverage.endSurahNumber;
  const nextSurah = getSurahByNumber(nextSurahNumber);
  const nextAyah = parsedCoverage.endAyah >= endSurah.ayahs ? 1 : parsedCoverage.endAyah + 1;

  return {
    startSurahNumber: nextSurah.number,
    startAyah: nextAyah,
    endSurahNumber: nextSurah.number,
    endAyah: nextAyah,
  };
};

export const createNextCoverageFromLatest = (latestCoverage = {}) => ({
  ...createDefaultCoverage(),
  ...(createNextCoverageRange(latestCoverage.sabaq)
    ? { sabaq: createNextCoverageRange(latestCoverage.sabaq) }
    : {}),
  sabaqPara: createNextCoverageRange(latestCoverage.sabaqPara),
  revision: createNextCoverageRange(latestCoverage.manzil),
});

const juzStarts = [
  { juz: 1, surah: 1, ayah: 1 },
  { juz: 2, surah: 2, ayah: 142 },
  { juz: 3, surah: 2, ayah: 253 },
  { juz: 4, surah: 3, ayah: 93 },
  { juz: 5, surah: 4, ayah: 24 },
  { juz: 6, surah: 4, ayah: 148 },
  { juz: 7, surah: 5, ayah: 82 },
  { juz: 8, surah: 6, ayah: 111 },
  { juz: 9, surah: 7, ayah: 88 },
  { juz: 10, surah: 8, ayah: 41 },
  { juz: 11, surah: 9, ayah: 93 },
  { juz: 12, surah: 11, ayah: 6 },
  { juz: 13, surah: 12, ayah: 53 },
  { juz: 14, surah: 15, ayah: 1 },
  { juz: 15, surah: 17, ayah: 1 },
  { juz: 16, surah: 18, ayah: 75 },
  { juz: 17, surah: 21, ayah: 1 },
  { juz: 18, surah: 23, ayah: 1 },
  { juz: 19, surah: 25, ayah: 21 },
  { juz: 20, surah: 27, ayah: 56 },
  { juz: 21, surah: 29, ayah: 46 },
  { juz: 22, surah: 33, ayah: 31 },
  { juz: 23, surah: 36, ayah: 28 },
  { juz: 24, surah: 39, ayah: 32 },
  { juz: 25, surah: 41, ayah: 47 },
  { juz: 26, surah: 46, ayah: 1 },
  { juz: 27, surah: 51, ayah: 31 },
  { juz: 28, surah: 58, ayah: 1 },
  { juz: 29, surah: 67, ayah: 1 },
  { juz: 30, surah: 78, ayah: 1 },
];

const surahOffsets = surahs.reduce((offsets, surah, index) => {
  const previousSurah = surahs[index - 1];
  const previousOffset = previousSurah ? offsets[previousSurah.number] + previousSurah.ayahs : 0;

  offsets[surah.number] = previousOffset;
  return offsets;
}, {});

const quranAyahCount = surahs.reduce((total, surah) => total + surah.ayahs, 0);

const getGlobalAyahNumber = (surahNumber, ayah) => surahOffsets[Number(surahNumber)] + Number(ayah);

const getReferenceFromGlobalAyahNumber = (globalAyahNumber) => {
  const clampedGlobalAyahNumber = Math.min(quranAyahCount, Math.max(1, globalAyahNumber));
  const surah = [...surahs]
    .reverse()
    .find((candidate) => surahOffsets[candidate.number] < clampedGlobalAyahNumber);

  return {
    surahNumber: surah.number,
    ayah: clampedGlobalAyahNumber - surahOffsets[surah.number],
  };
};

const getPreviousAyahReference = (surahNumber, ayah) => {
  if (ayah > 1) {
    return { surah: surahNumber, ayah: ayah - 1 };
  }

  const previousSurah = surahs.find((surah) => surah.number === surahNumber - 1);

  if (!previousSurah) {
    return { surah: surahNumber, ayah };
  }

  return { surah: previousSurah.number, ayah: previousSurah.ayahs };
};

const juzIntervals = juzStarts.map((juzStart, index) => {
  const nextJuzStart = juzStarts[index + 1];
  const endReference = nextJuzStart
    ? getPreviousAyahReference(nextJuzStart.surah, nextJuzStart.ayah)
    : { surah: 114, ayah: 6 };

  return {
    juz: juzStart.juz,
    start: getGlobalAyahNumber(juzStart.surah, juzStart.ayah),
    end: getGlobalAyahNumber(endReference.surah, endReference.ayah),
  };
});

const getJuzIntervalForReference = (surahNumber, ayah) => {
  const globalAyahNumber = getGlobalAyahNumber(surahNumber, ayah);

  return juzIntervals.find(
    (interval) => globalAyahNumber >= interval.start && globalAyahNumber <= interval.end
  );
};

const expandCoverageByAyahCount = (coverage, ayahCount) => {
  const startGlobalAyah = getGlobalAyahNumber(coverage.startSurahNumber, coverage.startAyah);
  const endReference = getReferenceFromGlobalAyahNumber(
    startGlobalAyah + Math.max(1, Math.round(ayahCount)) - 1
  );

  return {
    ...coverage,
    endSurahNumber: endReference.surahNumber,
    endAyah: endReference.ayah,
  };
};

const expandCoverageByPages = (coverage, pages) => {
  const juzInterval = getJuzIntervalForReference(coverage.startSurahNumber, coverage.startAyah);
  const ayahsPerPage = juzInterval ? (juzInterval.end - juzInterval.start + 1) / 20 : 10;

  return expandCoverageByAyahCount(coverage, Number(pages) * ayahsPerPage);
};

const expandCoverageByJuz = (coverage, juzAmount) => {
  const juzInterval = getJuzIntervalForReference(coverage.startSurahNumber, coverage.startAyah);
  const ayahsPerJuz = juzInterval ? juzInterval.end - juzInterval.start + 1 : 200;

  return expandCoverageByAyahCount(coverage, Number(juzAmount) * ayahsPerJuz);
};

export const defaultLessonPreferences = {
  averageSabaqPages: 0.5,
  averageSabaqParaPages: 3,
  averageRevisionJuz: 0.25,
};

export const createIdealCoverageFromLatest = (
  latestCoverage = {},
  lessonPreferences = defaultLessonPreferences,
  sabaqCoverageMap
) => {
  const preferences = {
    ...defaultLessonPreferences,
    ...lessonPreferences,
  };
  const nextCoverage = createNextCoverageFromLatest(latestCoverage);
  const nextSabaqCoverage = sabaqCoverageMap
    ? createNextSabaqCoverage(sabaqCoverageMap, nextCoverage.sabaq)
    : nextCoverage.sabaq;

  return {
    ...nextCoverage,
    sabaq: nextSabaqCoverage
      ? expandCoverageByPages(nextSabaqCoverage, preferences.averageSabaqPages)
      : nextCoverage.sabaq,
    sabaqPara: nextCoverage.sabaqPara
      ? expandCoverageByPages(nextCoverage.sabaqPara, preferences.averageSabaqParaPages)
      : null,
    revision: nextCoverage.revision
      ? expandCoverageByJuz(nextCoverage.revision, preferences.averageRevisionJuz)
      : null,
  };
};

export const buildSabaqCoverageMap = (
  sabaqEntries = [],
  memorizedJuz = [],
  memorizedSurahs = [],
  memorizedAyahRanges = []
) => {
  const coverageMap = surahs.reduce((map, surah) => {
    map[surah.number] = new Set();
    return map;
  }, {});
  const memorizedJuzSet = new Set((memorizedJuz || []).map(Number));

  juzIntervals
    .filter((interval) => memorizedJuzSet.has(interval.juz))
    .forEach((interval) => {
      for (let globalAyah = interval.start; globalAyah <= interval.end; globalAyah += 1) {
        const reference = getReferenceFromGlobalAyahNumber(globalAyah);
        coverageMap[reference.surahNumber].add(reference.ayah);
      }
    });

  (memorizedSurahs || []).forEach((surahNumber) => {
    const surah = getSurahByNumber(surahNumber);

    if (!surah) {
      return;
    }

    for (let ayah = 1; ayah <= surah.ayahs; ayah += 1) {
      coverageMap[surah.number].add(ayah);
    }
  });

  (memorizedAyahRanges || []).forEach((range) => {
    for (
      let surahNumber = Number(range.startSurahNumber);
      surahNumber <= Number(range.endSurahNumber);
      surahNumber += 1
    ) {
      const surah = getSurahByNumber(surahNumber);

      if (!surah) {
        continue;
      }

      const firstAyah =
        surahNumber === Number(range.startSurahNumber) ? Number(range.startAyah) : 1;
      const lastAyah =
        surahNumber === Number(range.endSurahNumber) ? Number(range.endAyah) : surah.ayahs;

      for (let ayah = firstAyah; ayah <= lastAyah; ayah += 1) {
        coverageMap[surahNumber].add(ayah);
      }
    }
  });

  sabaqEntries.forEach((entry) => {
    const parsedCoverage = parseCoverageRange(entry.sabaq);

    if (!parsedCoverage) {
      return;
    }

    for (
      let surahNumber = parsedCoverage.startSurahNumber;
      surahNumber <= parsedCoverage.endSurahNumber;
      surahNumber += 1
    ) {
      const surah = getSurahByNumber(surahNumber);
      const firstAyah =
        surahNumber === parsedCoverage.startSurahNumber ? parsedCoverage.startAyah : 1;
      const lastAyah =
        surahNumber === parsedCoverage.endSurahNumber ? parsedCoverage.endAyah : surah.ayahs;

      for (let ayah = firstAyah; ayah <= lastAyah; ayah += 1) {
        coverageMap[surahNumber].add(ayah);
      }
    }
  });

  return coverageMap;
};

export const getAvailableSurahsForSabaq = (coverageMap) =>
  surahs.filter((surah) => (coverageMap[surah.number]?.size || 0) < surah.ayahs);

export const getAvailableAyahsForSabaq = (coverageMap, surahNumber) => {
  const surah = getSurahByNumber(surahNumber);
  const coveredAyahs = coverageMap[surah.number] || new Set();

  return Array.from({ length: surah.ayahs }, (_, index) => index + 1).filter(
    (ayah) => !coveredAyahs.has(ayah)
  );
};

const findNextAvailableSabaqReference = (coverageMap, preferredCoverage) => {
  const preferredSurahNumber = preferredCoverage?.startSurahNumber || 1;
  const preferredAyah = preferredCoverage?.startAyah || 1;

  for (const surah of surahs) {
    if (surah.number < preferredSurahNumber) {
      continue;
    }

    const firstAyah = surah.number === preferredSurahNumber ? preferredAyah : 1;
    const coveredAyahs = coverageMap[surah.number] || new Set();

    for (let ayah = firstAyah; ayah <= surah.ayahs; ayah += 1) {
      if (!coveredAyahs.has(ayah)) {
        return { surahNumber: surah.number, ayah };
      }
    }
  }

  return null;
};

export const createNextSabaqCoverage = (coverageMap, preferredCoverage) => {
  const nextReference = findNextAvailableSabaqReference(coverageMap, preferredCoverage);

  if (!nextReference) {
    return null;
  }

  return {
    startSurahNumber: nextReference.surahNumber,
    startAyah: nextReference.ayah,
    endSurahNumber: nextReference.surahNumber,
    endAyah: nextReference.ayah,
  };
};

export const isSabaqRangeAvailable = (coverageMap, entry) => {
  for (
    let surahNumber = Number(entry.startSurahNumber);
    surahNumber <= Number(entry.endSurahNumber);
    surahNumber += 1
  ) {
    const surah = getSurahByNumber(surahNumber);
    const coveredAyahs = coverageMap[surah.number] || new Set();
    const firstAyah = surahNumber === Number(entry.startSurahNumber) ? Number(entry.startAyah) : 1;
    const lastAyah =
      surahNumber === Number(entry.endSurahNumber) ? Number(entry.endAyah) : surah.ayahs;

    for (let ayah = firstAyah; ayah <= lastAyah; ayah += 1) {
      if (coveredAyahs.has(ayah)) {
        return false;
      }
    }
  }

  return true;
};

export const hasSavedCoverage = (coverageText, savedFlag) => {
  if (savedFlag === false) {
    return false;
  }

  const trimmedCoverage = String(coverageText || "").trim();

  return (
    trimmedCoverage.length > 0 &&
    trimmedCoverage.toLowerCase() !== "undefined" &&
    trimmedCoverage.toLowerCase() !== "null"
  );
};

export const isVisibleRecentEntry = (entry) =>
  (hasSavedCoverage(entry.sabaq, entry.sabaqSaved) ||
    hasSavedCoverage(entry.sabaqPara, entry.sabaqParaSaved) ||
    hasSavedCoverage(entry.manzil, entry.manzilSaved) ||
    String(entry.notes || "").trim().length > 0) &&
  !entry.sabaq?.toLowerCase().includes("surah yasin");
