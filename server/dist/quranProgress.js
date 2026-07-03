"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIdealLessonCoverage = exports.formatCoverageRange = exports.getLatestSabaqRange = exports.calculateCompletedSurahs = exports.calculateCompletedJuz = exports.parseMemorizedJuzList = exports.getJuzProgressPercent = exports.getJuzForAyahReference = exports.normalizeCoverageRange = exports.parseCoverageRange = exports.surahs = void 0;
exports.surahs = [
    { number: 1, name: "Al-Fatihah", ayahs: 7 },
    { number: 2, name: "Al-Baqarah", ayahs: 286 },
    { number: 3, name: "Ali 'Imran", ayahs: 200 },
    { number: 4, name: "An-Nisa", ayahs: 176 },
    { number: 5, name: "Al-Ma'idah", ayahs: 120 },
    { number: 6, name: "Al-An'am", ayahs: 165 },
    { number: 7, name: "Al-A'raf", ayahs: 206 },
    { number: 8, name: "Al-Anfal", ayahs: 75 },
    { number: 9, name: "At-Tawbah", ayahs: 129 },
    { number: 10, name: "Yunus", ayahs: 109 },
    { number: 11, name: "Hud", ayahs: 123 },
    { number: 12, name: "Yusuf", ayahs: 111 },
    { number: 13, name: "Ar-Ra'd", ayahs: 43 },
    { number: 14, name: "Ibrahim", ayahs: 52 },
    { number: 15, name: "Al-Hijr", ayahs: 99 },
    { number: 16, name: "An-Nahl", ayahs: 128 },
    { number: 17, name: "Al-Isra", ayahs: 111 },
    { number: 18, name: "Al-Kahf", ayahs: 110 },
    { number: 19, name: "Maryam", ayahs: 98 },
    { number: 20, name: "Taha", ayahs: 135 },
    { number: 21, name: "Al-Anbya", ayahs: 112 },
    { number: 22, name: "Al-Hajj", ayahs: 78 },
    { number: 23, name: "Al-Mu'minun", ayahs: 118 },
    { number: 24, name: "An-Nur", ayahs: 64 },
    { number: 25, name: "Al-Furqan", ayahs: 77 },
    { number: 26, name: "Ash-Shu'ara", ayahs: 227 },
    { number: 27, name: "An-Naml", ayahs: 93 },
    { number: 28, name: "Al-Qasas", ayahs: 88 },
    { number: 29, name: "Al-'Ankabut", ayahs: 69 },
    { number: 30, name: "Ar-Rum", ayahs: 60 },
    { number: 31, name: "Luqman", ayahs: 34 },
    { number: 32, name: "As-Sajdah", ayahs: 30 },
    { number: 33, name: "Al-Ahzab", ayahs: 73 },
    { number: 34, name: "Saba", ayahs: 54 },
    { number: 35, name: "Fatir", ayahs: 45 },
    { number: 36, name: "Ya-Sin", ayahs: 83 },
    { number: 37, name: "As-Saffat", ayahs: 182 },
    { number: 38, name: "Sad", ayahs: 88 },
    { number: 39, name: "Az-Zumar", ayahs: 75 },
    { number: 40, name: "Ghafir", ayahs: 85 },
    { number: 41, name: "Fussilat", ayahs: 54 },
    { number: 42, name: "Ash-Shuraa", ayahs: 53 },
    { number: 43, name: "Az-Zukhruf", ayahs: 89 },
    { number: 44, name: "Ad-Dukhan", ayahs: 59 },
    { number: 45, name: "Al-Jathiyah", ayahs: 37 },
    { number: 46, name: "Al-Ahqaf", ayahs: 35 },
    { number: 47, name: "Muhammad", ayahs: 38 },
    { number: 48, name: "Al-Fath", ayahs: 29 },
    { number: 49, name: "Al-Hujurat", ayahs: 18 },
    { number: 50, name: "Qaf", ayahs: 45 },
    { number: 51, name: "Adh-Dhariyat", ayahs: 60 },
    { number: 52, name: "At-Tur", ayahs: 49 },
    { number: 53, name: "An-Najm", ayahs: 62 },
    { number: 54, name: "Al-Qamar", ayahs: 55 },
    { number: 55, name: "Ar-Rahman", ayahs: 78 },
    { number: 56, name: "Al-Waqi'ah", ayahs: 96 },
    { number: 57, name: "Al-Hadid", ayahs: 29 },
    { number: 58, name: "Al-Mujadilah", ayahs: 22 },
    { number: 59, name: "Al-Hashr", ayahs: 24 },
    { number: 60, name: "Al-Mumtahanah", ayahs: 13 },
    { number: 61, name: "As-Saff", ayahs: 14 },
    { number: 62, name: "Al-Jumu'ah", ayahs: 11 },
    { number: 63, name: "Al-Munafiqun", ayahs: 11 },
    { number: 64, name: "At-Taghabun", ayahs: 18 },
    { number: 65, name: "At-Talaq", ayahs: 12 },
    { number: 66, name: "At-Tahrim", ayahs: 12 },
    { number: 67, name: "Al-Mulk", ayahs: 30 },
    { number: 68, name: "Al-Qalam", ayahs: 52 },
    { number: 69, name: "Al-Haqqah", ayahs: 52 },
    { number: 70, name: "Al-Ma'arij", ayahs: 44 },
    { number: 71, name: "Nuh", ayahs: 28 },
    { number: 72, name: "Al-Jinn", ayahs: 28 },
    { number: 73, name: "Al-Muzzammil", ayahs: 20 },
    { number: 74, name: "Al-Muddaththir", ayahs: 56 },
    { number: 75, name: "Al-Qiyamah", ayahs: 40 },
    { number: 76, name: "Al-Insan", ayahs: 31 },
    { number: 77, name: "Al-Mursalat", ayahs: 50 },
    { number: 78, name: "An-Naba", ayahs: 40 },
    { number: 79, name: "An-Nazi'at", ayahs: 46 },
    { number: 80, name: "'Abasa", ayahs: 42 },
    { number: 81, name: "At-Takwir", ayahs: 29 },
    { number: 82, name: "Al-Infitar", ayahs: 19 },
    { number: 83, name: "Al-Mutaffifin", ayahs: 36 },
    { number: 84, name: "Al-Inshiqaq", ayahs: 25 },
    { number: 85, name: "Al-Buruj", ayahs: 22 },
    { number: 86, name: "At-Tariq", ayahs: 17 },
    { number: 87, name: "Al-A'la", ayahs: 19 },
    { number: 88, name: "Al-Ghashiyah", ayahs: 26 },
    { number: 89, name: "Al-Fajr", ayahs: 30 },
    { number: 90, name: "Al-Balad", ayahs: 20 },
    { number: 91, name: "Ash-Shams", ayahs: 15 },
    { number: 92, name: "Al-Layl", ayahs: 21 },
    { number: 93, name: "Ad-Duhaa", ayahs: 11 },
    { number: 94, name: "Ash-Sharh", ayahs: 8 },
    { number: 95, name: "At-Tin", ayahs: 8 },
    { number: 96, name: "Al-'Alaq", ayahs: 19 },
    { number: 97, name: "Al-Qadr", ayahs: 5 },
    { number: 98, name: "Al-Bayyinah", ayahs: 8 },
    { number: 99, name: "Az-Zalzalah", ayahs: 8 },
    { number: 100, name: "Al-'Adiyat", ayahs: 11 },
    { number: 101, name: "Al-Qari'ah", ayahs: 11 },
    { number: 102, name: "At-Takathur", ayahs: 8 },
    { number: 103, name: "Al-'Asr", ayahs: 3 },
    { number: 104, name: "Al-Humazah", ayahs: 9 },
    { number: 105, name: "Al-Fil", ayahs: 5 },
    { number: 106, name: "Quraysh", ayahs: 4 },
    { number: 107, name: "Al-Ma'un", ayahs: 7 },
    { number: 108, name: "Al-Kawthar", ayahs: 3 },
    { number: 109, name: "Al-Kafirun", ayahs: 6 },
    { number: 110, name: "An-Nasr", ayahs: 3 },
    { number: 111, name: "Al-Masad", ayahs: 5 },
    { number: 112, name: "Al-Ikhlas", ayahs: 4 },
    { number: 113, name: "Al-Falaq", ayahs: 5 },
    { number: 114, name: "An-Nas", ayahs: 6 },
];
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
    const globalAyahNumber = getGlobalAyahNumber(surahNumber, ayah);
    const juzInterval = getJuzIntervals().find((interval) => globalAyahNumber >= interval.start && globalAyahNumber <= interval.end);
    return juzInterval?.juz || null;
};
exports.getJuzForAyahReference = getJuzForAyahReference;
const getJuzProgressPercent = (surahNumber, ayah) => {
    if (!surahNumber || !ayah) {
        return 0;
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
    const globalAyahNumber = getGlobalAyahNumber(coverage.startSurahNumber, coverage.startAyah);
    const juzInterval = getJuzIntervals().find((interval) => globalAyahNumber >= interval.start && globalAyahNumber <= interval.end);
    const ayahsPerPage = juzInterval ? (juzInterval.end - juzInterval.start + 1) / 20 : 10;
    return expandCoverageByAyahCount(coverage, Number(pages) * ayahsPerPage);
};
const expandCoverageByJuz = (coverage, juzAmount) => {
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
