"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIdealLessonCoverage = exports.formatCoverageRange = exports.getFirstReferenceAfterMemorizedJuz = exports.getLatestSabaqRange = exports.calculateCompletedSurahs = exports.calculateCompletedJuz = exports.parseMemorizedAyahRanges = exports.parseMemorizedSurahList = exports.parseMemorizedJuzList = exports.getSurahProgressPercent = exports.getJuzCompletionEstimate = exports.calculateCurrentJuzCompletionEstimate = exports.calculateCurrentJuzProgressPercent = exports.getJuzProgressPercent = exports.getJuzForAyahReference = exports.normalizeCoverageRange = exports.parseCoverageRange = exports.surahs = void 0;
const mushafLayout_1 = require("./mushafLayout");
exports.surahs = (0, mushafLayout_1.getMushafSurahs)();
const juzStarts = (0, mushafLayout_1.getMushafJuzStarts)();
const surahOffsets = exports.surahs.reduce((offsets, surah, index) => {
    const previousSurah = exports.surahs[index - 1];
    const previousOffset = previousSurah ? offsets[previousSurah.number] + previousSurah.ayahs : 0;
    offsets[surah.number] = previousOffset;
    return offsets;
}, {});
const getSurahByNumber = (surahNumber) => exports.surahs.find((surah) => surah.number === surahNumber);
const getSurahByName = (surahName) => exports.surahs.find((surah) => surah.name.toLowerCase() === surahName.toLowerCase());
const getGlobalAyahNumber = (surahNumber, ayah) => surahOffsets[surahNumber] + ayah;
const getPreviousAyahReference = (surahNumber, ayah) => {
    if (ayah > 1) {
        return { surah: surahNumber, ayah: ayah - 1 };
    }
    const previousSurah = getSurahByNumber(surahNumber - 1);
    if (!previousSurah) {
        return { surah: surahNumber, ayah };
    }
    return { surah: previousSurah.number, ayah: previousSurah.ayahs };
};
const parseCoverageRange = (coverageText) => {
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
    const legacyRangeMatch = coverageText?.match(/^\d+\.\s*([^:]+):(\d+)\s*-\s*\d+\.\s*([^:]+):(\d+)$/);
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
    return null;
};
exports.parseCoverageRange = parseCoverageRange;
const rangeToInterval = (range) => ({
    start: getGlobalAyahNumber(range.startSurahNumber, range.startAyah),
    end: getGlobalAyahNumber(range.endSurahNumber, range.endAyah),
});
const isRangeBeforeOrEqual = (firstRange, secondRange) => rangeToInterval(firstRange).start <= rangeToInterval(secondRange).start;
const normalizeCoverageRange = (range) => {
    if (!range) {
        return null;
    }
    const startSurahNumber = Number(range.startSurahNumber);
    const startAyah = Number(range.startAyah);
    const endSurahNumber = Number(range.endSurahNumber);
    const endAyah = Number(range.endAyah);
    const startSurah = getSurahByNumber(startSurahNumber);
    const endSurah = getSurahByNumber(endSurahNumber);
    if (!startSurah ||
        !endSurah ||
        !Number.isInteger(startAyah) ||
        !Number.isInteger(endAyah) ||
        startAyah < 1 ||
        endAyah < 1 ||
        startAyah > startSurah.ayahs ||
        endAyah > endSurah.ayahs) {
        return null;
    }
    return {
        startSurahNumber,
        startAyah,
        endSurahNumber,
        endAyah,
    };
};
exports.normalizeCoverageRange = normalizeCoverageRange;
const mergeIntervals = (intervals) => {
    const sortedIntervals = [...intervals].sort((a, b) => a.start - b.start);
    return sortedIntervals.reduce((merged, interval) => {
        const previousInterval = merged[merged.length - 1];
        if (!previousInterval || interval.start > previousInterval.end + 1) {
            merged.push({ ...interval });
            return merged;
        }
        previousInterval.end = Math.max(previousInterval.end, interval.end);
        return merged;
    }, []);
};
const getJuzIntervals = () => juzStarts.map((juzStart, index) => {
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
const getJuzForAyahReference = (surahNumber, ayah) => {
    const juzLayout = (0, mushafLayout_1.getJuzLayoutForReference)(surahNumber, ayah);
    if (juzLayout) {
        return juzLayout.juz;
    }
    const globalAyahNumber = getGlobalAyahNumber(surahNumber, ayah);
    const juzInterval = getJuzIntervals().find((interval) => globalAyahNumber >= interval.start && globalAyahNumber <= interval.end);
    return juzInterval?.juz || null;
};
exports.getJuzForAyahReference = getJuzForAyahReference;
const getJuzProgressPercent = (surahNumber, ayah) => {
    if (!surahNumber || !ayah) {
        return 0;
    }
    const ayahLayout = (0, mushafLayout_1.getAyahLayout)(surahNumber, ayah);
    const juzLayout = (0, mushafLayout_1.getJuzLayoutForReference)(surahNumber, ayah);
    if (ayahLayout && juzLayout) {
        const completedLines = (0, mushafLayout_1.getAyahLineCountInRange)(juzLayout.startGlobalLine, ayahLayout.endGlobalLine);
        const totalLines = (0, mushafLayout_1.getAyahLineCountInRange)(juzLayout.startGlobalLine, juzLayout.endGlobalLine);
        return Math.min(100, Math.max(0, Math.round((completedLines / totalLines) * 100)));
    }
    const globalAyahNumber = getGlobalAyahNumber(surahNumber, ayah);
    const juzInterval = getJuzIntervals().find((interval) => globalAyahNumber >= interval.start && globalAyahNumber <= interval.end);
    if (!juzInterval) {
        return 0;
    }
    const completedAyahs = globalAyahNumber - juzInterval.start + 1;
    const totalAyahs = juzInterval.end - juzInterval.start + 1;
    return Math.min(100, Math.max(0, Math.round((completedAyahs / totalAyahs) * 100)));
};
exports.getJuzProgressPercent = getJuzProgressPercent;
const getJuzLayoutByJuzNumber = (juzNumber) => {
    const juzStart = juzStarts.find((start) => start.juz === Number(juzNumber));
    if (!juzStart) {
        return null;
    }
    return (0, mushafLayout_1.getJuzLayoutForReference)(juzStart.surah, juzStart.ayah);
};
const addRangeLinesToJuzCoverage = (range, juzLayout, coveredLines) => {
    for (let surahNumber = range.startSurahNumber; surahNumber <= range.endSurahNumber; surahNumber += 1) {
        const surah = getSurahByNumber(surahNumber);
        if (!surah) {
            continue;
        }
        const firstAyah = surahNumber === range.startSurahNumber ? range.startAyah : 1;
        const lastAyah = surahNumber === range.endSurahNumber ? range.endAyah : surah.ayahs;
        for (let ayah = firstAyah; ayah <= lastAyah; ayah += 1) {
            const ayahLayout = (0, mushafLayout_1.getAyahLayout)(surahNumber, ayah);
            if (!ayahLayout) {
                continue;
            }
            const startLine = Math.max(ayahLayout.startGlobalLine, juzLayout.startGlobalLine);
            const endLine = Math.min(ayahLayout.endGlobalLine, juzLayout.endGlobalLine);
            for (let line = startLine; line <= endLine; line += 1) {
                coveredLines.add(line);
            }
        }
    }
};
const getCurrentJuzCoveredLineCount = (entries, existingMemorizedJuzList, currentJuz, currentSabaqRange, existingMemorizedSurahList = [], existingMemorizedAyahRanges = []) => {
    const juzLayout = getJuzLayoutByJuzNumber(currentJuz);
    if (!juzLayout) {
        return { coveredLines: 0, totalLines: 0 };
    }
    if ((existingMemorizedJuzList || []).map(Number).includes(juzLayout.juz)) {
        return {
            coveredLines: (0, mushafLayout_1.getAyahLineCountInRange)(juzLayout.startGlobalLine, juzLayout.endGlobalLine),
            totalLines: (0, mushafLayout_1.getAyahLineCountInRange)(juzLayout.startGlobalLine, juzLayout.endGlobalLine),
        };
    }
    const coveredLines = new Set();
    const ranges = entries
        .map((entry) => (0, exports.parseCoverageRange)(entry.sabaq))
        .filter((range) => Boolean(range));
    ranges.push(...getMemorizedSurahIntervals(existingMemorizedSurahList).map((interval) => {
        const startReference = getReferenceFromGlobalAyahNumber(interval.start);
        const endReference = getReferenceFromGlobalAyahNumber(interval.end);
        return {
            startSurahNumber: startReference.surahNumber,
            startAyah: startReference.ayah,
            endSurahNumber: endReference.surahNumber,
            endAyah: endReference.ayah,
        };
    }));
    ranges.push(...existingMemorizedAyahRanges);
    if (currentSabaqRange) {
        ranges.push(currentSabaqRange);
    }
    ranges.forEach((range) => addRangeLinesToJuzCoverage(range, juzLayout, coveredLines));
    return {
        coveredLines: coveredLines.size,
        totalLines: (0, mushafLayout_1.getAyahLineCountInRange)(juzLayout.startGlobalLine, juzLayout.endGlobalLine),
    };
};
const calculateCurrentJuzProgressPercent = (entries, existingMemorizedJuzList, currentJuz, currentSabaqRange, existingMemorizedSurahList = [], existingMemorizedAyahRanges = []) => {
    const { coveredLines, totalLines } = getCurrentJuzCoveredLineCount(entries, existingMemorizedJuzList, currentJuz, currentSabaqRange, existingMemorizedSurahList, existingMemorizedAyahRanges);
    if (totalLines <= 0) {
        return 0;
    }
    return Math.min(100, Math.max(0, Math.round((coveredLines / totalLines) * 100)));
};
exports.calculateCurrentJuzProgressPercent = calculateCurrentJuzProgressPercent;
const calculateCurrentJuzCompletionEstimate = (entries, existingMemorizedJuzList, currentJuz, averageSabaqPages = 0.5, currentSabaqRange, existingMemorizedSurahList = [], existingMemorizedAyahRanges = []) => {
    const { coveredLines, totalLines } = getCurrentJuzCoveredLineCount(entries, existingMemorizedJuzList, currentJuz, currentSabaqRange, existingMemorizedSurahList, existingMemorizedAyahRanges);
    if (totalLines <= 0) {
        return null;
    }
    const linesPerLesson = Math.max(1, Number(averageSabaqPages) * (0, mushafLayout_1.getAyahLinesPerMushafPage)());
    const remainingLines = Math.max(0, totalLines - coveredLines);
    const lessonsRemaining = remainingLines > 0 ? Math.ceil(remainingLines / linesPerLesson) : 0;
    const estimatedDate = new Date();
    estimatedDate.setHours(0, 0, 0, 0);
    estimatedDate.setDate(estimatedDate.getDate() + Math.max(0, lessonsRemaining - 1));
    return {
        remainingLines,
        lessonsRemaining,
        estimatedCompletionDate: estimatedDate.toISOString(),
    };
};
exports.calculateCurrentJuzCompletionEstimate = calculateCurrentJuzCompletionEstimate;
const getJuzCompletionEstimate = (surahNumber, ayah, averageSabaqPages = 0.5) => {
    if (!surahNumber || !ayah) {
        return null;
    }
    const ayahLayout = (0, mushafLayout_1.getAyahLayout)(surahNumber, ayah);
    const juzLayout = (0, mushafLayout_1.getJuzLayoutForReference)(surahNumber, ayah);
    if (!ayahLayout || !juzLayout) {
        return null;
    }
    const linesPerLesson = Math.max(1, Number(averageSabaqPages) * (0, mushafLayout_1.getAyahLinesPerMushafPage)());
    const remainingLines = ayahLayout.endGlobalLine >= juzLayout.endGlobalLine
        ? 0
        : (0, mushafLayout_1.getAyahLineCountInRange)(ayahLayout.endGlobalLine + 1, juzLayout.endGlobalLine);
    const lessonsRemaining = remainingLines > 0 ? Math.ceil(remainingLines / linesPerLesson) : 0;
    const estimatedDate = new Date();
    estimatedDate.setHours(0, 0, 0, 0);
    estimatedDate.setDate(estimatedDate.getDate() + Math.max(0, lessonsRemaining - 1));
    return {
        remainingLines,
        lessonsRemaining,
        estimatedCompletionDate: estimatedDate.toISOString(),
    };
};
exports.getJuzCompletionEstimate = getJuzCompletionEstimate;
const getSurahProgressPercent = (surahNumber, ayah) => {
    if (!surahNumber || !ayah) {
        return 0;
    }
    const surah = getSurahByNumber(surahNumber);
    if (!surah) {
        return 0;
    }
    const clampedAyah = Math.min(surah.ayahs, Math.max(1, Number(ayah)));
    const firstAyahLayout = (0, mushafLayout_1.getAyahLayout)(surah.number, 1);
    const currentAyahLayout = (0, mushafLayout_1.getAyahLayout)(surah.number, clampedAyah);
    const lastAyahLayout = (0, mushafLayout_1.getAyahLayout)(surah.number, surah.ayahs);
    if (firstAyahLayout && currentAyahLayout && lastAyahLayout) {
        const completedLines = (0, mushafLayout_1.getAyahLineCountInRange)(firstAyahLayout.startGlobalLine, currentAyahLayout.endGlobalLine);
        const totalLines = (0, mushafLayout_1.getAyahLineCountInRange)(firstAyahLayout.startGlobalLine, lastAyahLayout.endGlobalLine);
        return Math.min(100, Math.max(0, Math.round((completedLines / totalLines) * 100)));
    }
    return Math.min(100, Math.max(0, Math.round((clampedAyah / surah.ayahs) * 100)));
};
exports.getSurahProgressPercent = getSurahProgressPercent;
const parseMemorizedJuzList = (memorizedJuzList) => {
    try {
        const parsedList = JSON.parse(memorizedJuzList);
        return Array.isArray(parsedList) ? parsedList.map(Number).filter(Boolean) : [];
    }
    catch {
        return [];
    }
};
exports.parseMemorizedJuzList = parseMemorizedJuzList;
const parseMemorizedSurahList = (memorizedSurahList = "[]") => {
    try {
        const parsedList = JSON.parse(memorizedSurahList);
        return Array.isArray(parsedList) ? parsedList.map(Number).filter(Boolean) : [];
    }
    catch {
        return [];
    }
};
exports.parseMemorizedSurahList = parseMemorizedSurahList;
const parseMemorizedAyahRanges = (memorizedAyahRanges = "[]") => {
    try {
        const parsedList = JSON.parse(memorizedAyahRanges);
        return Array.isArray(parsedList)
            ? parsedList
                .map((range) => (0, exports.normalizeCoverageRange)(range))
                .filter((range) => Boolean(range))
            : [];
    }
    catch {
        return [];
    }
};
exports.parseMemorizedAyahRanges = parseMemorizedAyahRanges;
const getMemorizedSurahIntervals = (memorizedSurahList) => (memorizedSurahList || [])
    .map(getSurahByNumber)
    .filter((surah) => Boolean(surah))
    .map((surah) => ({
    start: getGlobalAyahNumber(surah.number, 1),
    end: getGlobalAyahNumber(surah.number, surah.ayahs),
}));
const getMemorizedAyahRangeIntervals = (memorizedAyahRanges) => (memorizedAyahRanges || []).map(rangeToInterval);
const calculateCompletedJuz = (entries, existingMemorizedJuzList, currentSabaqRange, existingMemorizedSurahList = [], existingMemorizedAyahRanges = []) => {
    const intervals = entries.flatMap((entry) => [entry.sabaq]
        .map(exports.parseCoverageRange)
        .filter((range) => Boolean(range))
        .map(rangeToInterval));
    intervals.push(...getMemorizedSurahIntervals(existingMemorizedSurahList));
    intervals.push(...getMemorizedAyahRangeIntervals(existingMemorizedAyahRanges));
    if (currentSabaqRange) {
        intervals.push(rangeToInterval(currentSabaqRange));
    }
    const mergedIntervals = mergeIntervals(intervals);
    const completedFromEntries = getJuzIntervals()
        .filter((juzInterval) => mergedIntervals.some((coverageInterval) => coverageInterval.start <= juzInterval.start && coverageInterval.end >= juzInterval.end))
        .map((juzInterval) => juzInterval.juz);
    return [...new Set([...existingMemorizedJuzList, ...completedFromEntries])].sort((a, b) => a - b);
};
exports.calculateCompletedJuz = calculateCompletedJuz;
const calculateCompletedSurahs = (entries, currentSabaqRange, existingMemorizedJuzList = [], existingMemorizedSurahList = [], existingMemorizedAyahRanges = []) => {
    const intervals = entries.flatMap((entry) => [entry.sabaq]
        .map(exports.parseCoverageRange)
        .filter((range) => Boolean(range))
        .map(rangeToInterval));
    const memorizedJuzSet = new Set((existingMemorizedJuzList || []).map(Number));
    getJuzIntervals()
        .filter((interval) => memorizedJuzSet.has(interval.juz))
        .forEach((interval) => {
        intervals.push({ start: interval.start, end: interval.end });
    });
    intervals.push(...getMemorizedSurahIntervals(existingMemorizedSurahList));
    intervals.push(...getMemorizedAyahRangeIntervals(existingMemorizedAyahRanges));
    if (currentSabaqRange) {
        intervals.push(rangeToInterval(currentSabaqRange));
    }
    const mergedIntervals = mergeIntervals(intervals);
    return exports.surahs.filter((surah) => {
        const surahStart = getGlobalAyahNumber(surah.number, 1);
        const surahEnd = getGlobalAyahNumber(surah.number, surah.ayahs);
        return mergedIntervals.some((coverageInterval) => coverageInterval.start <= surahStart && coverageInterval.end >= surahEnd);
    }).length;
};
exports.calculateCompletedSurahs = calculateCompletedSurahs;
const getLatestSabaqRange = (entries) => {
    const latestEntry = entries.find((entry) => (0, exports.parseCoverageRange)(entry.sabaq));
    return latestEntry ? (0, exports.parseCoverageRange)(latestEntry.sabaq) : null;
};
exports.getLatestSabaqRange = getLatestSabaqRange;
const getFirstReferenceAfterMemorizedJuz = (memorizedJuz) => {
    const memorizedJuzSet = new Set((memorizedJuz || []).map(Number));
    const firstAvailableJuz = getJuzIntervals().find((interval) => !memorizedJuzSet.has(interval.juz));
    if (!firstAvailableJuz) {
        const lastSurah = exports.surahs[exports.surahs.length - 1];
        return {
            currentJuz: 30,
            currentSurah: lastSurah.number,
            currentAyah: lastSurah.ayahs,
        };
    }
    const juzStart = juzStarts.find((start) => start.juz === firstAvailableJuz.juz);
    return {
        currentJuz: firstAvailableJuz.juz,
        currentSurah: juzStart?.surah || 1,
        currentAyah: juzStart?.ayah || 1,
    };
};
exports.getFirstReferenceAfterMemorizedJuz = getFirstReferenceAfterMemorizedJuz;
const defaultLessonPreferences = {
    averageSabaqPages: 0.5,
    averageSabaqParaPages: 3,
    averageRevisionJuz: 0.25,
};
const formatCoverageRange = (range) => {
    if (!range) {
        return "";
    }
    const startSurah = getSurahByNumber(range.startSurahNumber);
    const endSurah = getSurahByNumber(range.endSurahNumber);
    if (!startSurah || !endSurah) {
        return "";
    }
    if (startSurah.number === endSurah.number) {
        return `${startSurah.name} ${range.startAyah} - ${range.endAyah}`;
    }
    return `${startSurah.name} ${range.startAyah} - ${endSurah.name} ${range.endAyah}`;
};
exports.formatCoverageRange = formatCoverageRange;
const getReferenceFromGlobalAyahNumber = (globalAyahNumber) => {
    const quranAyahCount = exports.surahs.reduce((total, surah) => total + surah.ayahs, 0);
    const clampedGlobalAyahNumber = Math.min(quranAyahCount, Math.max(1, globalAyahNumber));
    const surah = [...exports.surahs]
        .reverse()
        .find((candidate) => surahOffsets[candidate.number] < clampedGlobalAyahNumber);
    if (!surah) {
        return { surahNumber: 1, ayah: 1 };
    }
    return {
        surahNumber: surah.number,
        ayah: clampedGlobalAyahNumber - surahOffsets[surah.number],
    };
};
const createNextCoverageRange = (coverageText) => {
    const parsedCoverage = coverageText ? (0, exports.parseCoverageRange)(coverageText) : null;
    if (!parsedCoverage) {
        return null;
    }
    const endSurah = getSurahByNumber(parsedCoverage.endSurahNumber);
    if (!endSurah) {
        return null;
    }
    const nextSurahNumber = parsedCoverage.endAyah >= endSurah.ayahs
        ? Math.min(parsedCoverage.endSurahNumber + 1, exports.surahs[exports.surahs.length - 1].number)
        : parsedCoverage.endSurahNumber;
    const nextSurah = getSurahByNumber(nextSurahNumber);
    const nextAyah = parsedCoverage.endAyah >= endSurah.ayahs ? 1 : parsedCoverage.endAyah + 1;
    if (!nextSurah) {
        return null;
    }
    return {
        startSurahNumber: nextSurah.number,
        startAyah: nextAyah,
        endSurahNumber: nextSurah.number,
        endAyah: nextAyah,
    };
};
const createDefaultCoverage = () => ({
    sabaq: { startSurahNumber: 1, startAyah: 1, endSurahNumber: 1, endAyah: 7 },
    sabaqPara: { startSurahNumber: 1, startAyah: 1, endSurahNumber: 1, endAyah: 7 },
    revision: { startSurahNumber: 1, startAyah: 1, endSurahNumber: 1, endAyah: 7 },
});
const createNextPointCoverage = (reference) => {
    const surah = reference?.currentSurah ? getSurahByNumber(reference.currentSurah) : null;
    const ayah = Number(reference?.currentAyah);
    if (!surah || !Number.isInteger(ayah) || ayah < 1 || ayah > surah.ayahs) {
        return null;
    }
    const nextReference = ayah >= surah.ayahs
        ? getSurahByNumber(surah.number + 1)
            ? { surahNumber: surah.number + 1, ayah: 1 }
            : { surahNumber: surah.number, ayah }
        : { surahNumber: surah.number, ayah: ayah + 1 };
    return {
        startSurahNumber: nextReference.surahNumber,
        startAyah: nextReference.ayah,
        endSurahNumber: nextReference.surahNumber,
        endAyah: nextReference.ayah,
    };
};
const createNextCoverageFromLatest = (latestCoverage, onboardingCurrentPoint) => {
    const defaultCoverage = createDefaultCoverage();
    const onboardingCoverage = createNextPointCoverage(onboardingCurrentPoint);
    return {
        ...defaultCoverage,
        sabaq: createNextCoverageRange(latestCoverage.sabaq) ||
            onboardingCoverage ||
            defaultCoverage.sabaq,
        sabaqPara: createNextCoverageRange(latestCoverage.sabaqPara),
        revision: createNextCoverageRange(latestCoverage.manzil),
    };
};
const getFirstFullyMemorizedSurahCoverage = (coverageMap) => {
    const firstFullyMemorizedSurah = exports.surahs.find((surah) => (coverageMap[surah.number]?.size || 0) >= surah.ayahs);
    if (!firstFullyMemorizedSurah) {
        return null;
    }
    return {
        startSurahNumber: firstFullyMemorizedSurah.number,
        startAyah: 1,
        endSurahNumber: firstFullyMemorizedSurah.number,
        endAyah: 1,
    };
};
const createNextRevisionCoverage = (latestRevision, coverageMap) => {
    const parsedRevision = latestRevision ? (0, exports.parseCoverageRange)(latestRevision) : null;
    if (!parsedRevision) {
        return null;
    }
    const lastSurah = exports.surahs[exports.surahs.length - 1];
    const revisionEndedAtQuranEnd = parsedRevision.endSurahNumber >= lastSurah.number &&
        parsedRevision.endAyah >= lastSurah.ayahs;
    if (revisionEndedAtQuranEnd) {
        return getFirstFullyMemorizedSurahCoverage(coverageMap);
    }
    return createNextCoverageRange(latestRevision);
};
const expandCoverageByAyahCount = (coverage, ayahCount) => {
    const startGlobalAyah = getGlobalAyahNumber(coverage.startSurahNumber, coverage.startAyah);
    const endReference = getReferenceFromGlobalAyahNumber(startGlobalAyah + Math.max(1, Math.round(ayahCount)) - 1);
    return {
        ...coverage,
        endSurahNumber: endReference.surahNumber,
        endAyah: endReference.ayah,
    };
};
const expandCoverageByPages = (coverage, pages) => {
    const startLayout = (0, mushafLayout_1.getAyahLayout)(coverage.startSurahNumber, coverage.startAyah);
    if (startLayout) {
        const lineCount = Math.max(1, Number(pages) * (0, mushafLayout_1.getLinesPerMushafPage)());
        const endReference = (0, mushafLayout_1.getReferenceEndingAfterLineCount)({
            surahNumber: coverage.startSurahNumber,
            ayah: coverage.startAyah,
        }, lineCount);
        return {
            ...coverage,
            endSurahNumber: endReference.surahNumber,
            endAyah: endReference.ayah,
        };
    }
    const globalAyahNumber = getGlobalAyahNumber(coverage.startSurahNumber, coverage.startAyah);
    const juzInterval = getJuzIntervals().find((interval) => globalAyahNumber >= interval.start && globalAyahNumber <= interval.end);
    const ayahsPerPage = juzInterval ? (juzInterval.end - juzInterval.start + 1) / 20 : 10;
    return expandCoverageByAyahCount(coverage, Number(pages) * ayahsPerPage);
};
const expandCoverageByJuz = (coverage, juzAmount) => {
    const startLayout = (0, mushafLayout_1.getAyahLayout)(coverage.startSurahNumber, coverage.startAyah);
    const juzLayout = (0, mushafLayout_1.getJuzLayoutForReference)(coverage.startSurahNumber, coverage.startAyah);
    if (startLayout && juzLayout) {
        const juzLineCount = juzLayout.endGlobalLine - juzLayout.startGlobalLine + 1;
        const lineCount = Math.max(1, Number(juzAmount) * juzLineCount);
        const endReference = (0, mushafLayout_1.getReferenceEndingAfterLineCount)({
            surahNumber: coverage.startSurahNumber,
            ayah: coverage.startAyah,
        }, lineCount);
        return {
            ...coverage,
            endSurahNumber: endReference.surahNumber,
            endAyah: endReference.ayah,
        };
    }
    const globalAyahNumber = getGlobalAyahNumber(coverage.startSurahNumber, coverage.startAyah);
    const juzInterval = getJuzIntervals().find((interval) => globalAyahNumber >= interval.start && globalAyahNumber <= interval.end);
    const ayahsPerJuz = juzInterval ? juzInterval.end - juzInterval.start + 1 : 200;
    return expandCoverageByAyahCount(coverage, Number(juzAmount) * ayahsPerJuz);
};
const getCoverageRangeLineCount = (range) => {
    const startLayout = (0, mushafLayout_1.getAyahLayout)(range.startSurahNumber, range.startAyah);
    const endLayout = (0, mushafLayout_1.getAyahLayout)(range.endSurahNumber, range.endAyah);
    if (startLayout && endLayout) {
        return endLayout.endGlobalLine - startLayout.startGlobalLine + 1;
    }
    const interval = rangeToInterval(range);
    return Math.max(1, interval.end - interval.start + 1);
};
const createSabaqParaCoverageFromSabaqHistory = (sabaqEntries, pages) => {
    const parsedRanges = sabaqEntries
        .map((entry) => (0, exports.parseCoverageRange)(entry.sabaq))
        .filter((range) => Boolean(range));
    if (parsedRanges.length === 0) {
        return null;
    }
    const reviewRanges = parsedRanges.slice(1);
    if (reviewRanges.length === 0) {
        return null;
    }
    const targetLineCount = Math.max(1, Number(pages) * (0, mushafLayout_1.getLinesPerMushafPage)());
    const latestRange = reviewRanges[0];
    let accumulatedLineCount = 0;
    let earliestIncludedRange = latestRange;
    for (const range of reviewRanges) {
        accumulatedLineCount += getCoverageRangeLineCount(range);
        earliestIncludedRange = range;
        if (accumulatedLineCount >= targetLineCount) {
            break;
        }
    }
    const calculatedStart = (0, mushafLayout_1.getReferenceStartingBeforeLineCount)({
        surahNumber: latestRange.endSurahNumber,
        ayah: latestRange.endAyah,
    }, Math.min(targetLineCount, accumulatedLineCount));
    const calculatedStartRange = {
        startSurahNumber: calculatedStart.surahNumber,
        startAyah: calculatedStart.ayah,
        endSurahNumber: latestRange.endSurahNumber,
        endAyah: latestRange.endAyah,
    };
    const earliestStartRange = {
        startSurahNumber: earliestIncludedRange.startSurahNumber,
        startAyah: earliestIncludedRange.startAyah,
        endSurahNumber: latestRange.endSurahNumber,
        endAyah: latestRange.endAyah,
    };
    return isRangeBeforeOrEqual(earliestStartRange, calculatedStartRange)
        ? calculatedStartRange
        : earliestStartRange;
};
const buildSabaqCoverageMap = (sabaqEntries, memorizedJuz, memorizedSurahs = [], memorizedAyahRanges = []) => {
    const coverageMap = exports.surahs.reduce((map, surah) => {
        map[surah.number] = new Set();
        return map;
    }, {});
    const memorizedJuzSet = new Set((memorizedJuz || []).map(Number));
    getJuzIntervals()
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
        for (let surahNumber = range.startSurahNumber; surahNumber <= range.endSurahNumber; surahNumber += 1) {
            const surah = getSurahByNumber(surahNumber);
            if (!surah) {
                continue;
            }
            const firstAyah = surahNumber === range.startSurahNumber ? range.startAyah : 1;
            const lastAyah = surahNumber === range.endSurahNumber ? range.endAyah : surah.ayahs;
            for (let ayah = firstAyah; ayah <= lastAyah; ayah += 1) {
                coverageMap[surahNumber].add(ayah);
            }
        }
    });
    sabaqEntries.forEach((entry) => {
        const parsedCoverage = (0, exports.parseCoverageRange)(entry.sabaq);
        if (!parsedCoverage) {
            return;
        }
        for (let surahNumber = parsedCoverage.startSurahNumber; surahNumber <= parsedCoverage.endSurahNumber; surahNumber += 1) {
            const surah = getSurahByNumber(surahNumber);
            if (!surah) {
                continue;
            }
            const firstAyah = surahNumber === parsedCoverage.startSurahNumber ? parsedCoverage.startAyah : 1;
            const lastAyah = surahNumber === parsedCoverage.endSurahNumber ? parsedCoverage.endAyah : surah.ayahs;
            for (let ayah = firstAyah; ayah <= lastAyah; ayah += 1) {
                coverageMap[surahNumber].add(ayah);
            }
        }
    });
    return coverageMap;
};
const findNextAvailableSabaqReference = (coverageMap, preferredCoverage) => {
    const preferredSurahNumber = preferredCoverage?.startSurahNumber || 1;
    const preferredAyah = preferredCoverage?.startAyah || 1;
    for (const surah of exports.surahs) {
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
const createNextSabaqCoverage = (coverageMap, preferredCoverage) => {
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
const createIdealLessonCoverage = ({ latestCoverage, sabaqEntries, sabaqParaSourceEntries, memorizedJuz, memorizedSurahs, memorizedAyahRanges, lessonPreferences, onboardingCurrentPoint, }) => {
    const preferences = {
        ...defaultLessonPreferences,
        ...lessonPreferences,
    };
    const nextCoverage = createNextCoverageFromLatest(latestCoverage, onboardingCurrentPoint);
    const sabaqCoverageMap = buildSabaqCoverageMap(sabaqEntries, memorizedJuz, memorizedSurahs, memorizedAyahRanges);
    const nextSabaqCoverage = createNextSabaqCoverage(sabaqCoverageMap, nextCoverage.sabaq);
    const nextRevisionCoverage = createNextRevisionCoverage(latestCoverage.manzil, sabaqCoverageMap);
    const nextSabaqParaCoverage = createSabaqParaCoverageFromSabaqHistory(sabaqParaSourceEntries || [], preferences.averageSabaqParaPages);
    return {
        sabaq: nextSabaqCoverage
            ? expandCoverageByPages(nextSabaqCoverage, preferences.averageSabaqPages)
            : nextCoverage.sabaq,
        sabaqPara: nextSabaqParaCoverage,
        revision: nextRevisionCoverage
            ? expandCoverageByJuz(nextRevisionCoverage, preferences.averageRevisionJuz)
            : null,
    };
};
exports.createIdealLessonCoverage = createIdealLessonCoverage;
