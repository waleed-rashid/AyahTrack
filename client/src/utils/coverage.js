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
    hasSavedCoverage(entry.manzil, entry.manzilSaved)) &&
  !entry.sabaq?.toLowerCase().includes("surah yasin");
