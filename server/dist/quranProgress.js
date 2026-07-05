"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIdealLessonCoverage = exports.formatCoverageRange = exports.getFirstReferenceAfterMemorizedJuz = exports.getLatestSabaqRange = exports.calculateCompletedSurahs = exports.calculateCompletedJuz = exports.parseMemorizedJuzList = exports.getJuzProgressPercent = exports.getJuzForAyahReference = exports.normalizeCoverageRange = exports.parseCoverageRange = exports.surahs = void 0;
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
const calculateCompletedJuz = (entries, existingMemorizedJuzList, currentSabaqRange) => {
    const intervals = entries.flatMap((entry) => [entry.sabaq]
        .map(exports.parseCoverageRange)
        .filter((range) => Boolean(range))
        .map(rangeToInterval));
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
const calculateCompletedSurahs = (entries, currentSabaqRange) => {
    const intervals = entries.flatMap((entry) => [entry.sabaq]
        .map(exports.parseCoverageRange)
        .filter((range) => Boolean(range))
        .map(rangeToInterval));
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
const createNextCoverageFromLatest = (latestCoverage) => ({
    ...createDefaultCoverage(),
    ...(createNextCoverageRange(latestCoverage.sabaq)
        ? { sabaq: createNextCoverageRange(latestCoverage.sabaq) }
        : {}),
    ...(createNextCoverageRange(latestCoverage.sabaqPara)
        ? { sabaqPara: createNextCoverageRange(latestCoverage.sabaqPara) }
        : {}),
    ...(createNextCoverageRange(latestCoverage.manzil)
        ? { revision: createNextCoverageRange(latestCoverage.manzil) }
        : {}),
});
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
        const endReference = (0, mushafLayout_1.getReferenceEndingAfterAyahLineCount)({
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
        const juzLineCount = (0, mushafLayout_1.getLinesPerMushafPage)() * 20;
        const lineCount = Math.max(1, Number(juzAmount) * juzLineCount);
        const endReference = (0, mushafLayout_1.getReferenceEndingAfterAyahLineCount)({
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
const buildSabaqCoverageMap = (sabaqEntries, memorizedJuz) => {
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
const createIdealLessonCoverage = ({ latestCoverage, sabaqEntries, memorizedJuz, lessonPreferences, }) => {
    const preferences = {
        ...defaultLessonPreferences,
        ...lessonPreferences,
    };
    const nextCoverage = createNextCoverageFromLatest(latestCoverage);
    const sabaqCoverageMap = buildSabaqCoverageMap(sabaqEntries, memorizedJuz);
    const nextSabaqCoverage = createNextSabaqCoverage(sabaqCoverageMap, nextCoverage.sabaq);
    return {
        sabaq: nextSabaqCoverage
            ? expandCoverageByPages(nextSabaqCoverage, preferences.averageSabaqPages)
            : nextCoverage.sabaq,
        sabaqPara: expandCoverageByPages(nextCoverage.sabaqPara, preferences.averageSabaqParaPages),
        revision: expandCoverageByJuz(nextCoverage.revision, preferences.averageRevisionJuz),
    };
};
exports.createIdealLessonCoverage = createIdealLessonCoverage;
