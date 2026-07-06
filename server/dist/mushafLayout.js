"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJuzLayoutForReference = exports.getAyahLineCountInRange = exports.getReferenceStartingBeforeLineCount = exports.getReferenceStartingBeforeAyahLineCount = exports.getReferenceEndingAfterLineCount = exports.getReferenceEndingAfterAyahLineCount = exports.getReferenceEndingAtOrBeforeLine = exports.getReferenceAtOrAfterLine = exports.getAyahLayout = exports.getAyahLinesPerMushafPage = exports.getLinesPerMushafPage = exports.getMushafJuzStarts = exports.getMushafSurahs = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let cachedLayout = null;
let cachedSurahMetadata = null;
let cachedAyahLines = null;
const getLayoutPath = () => path_1.default.resolve(__dirname, "../data/mushaf/ayah-layout.json");
const getSurahMetadataPath = () => path_1.default.resolve(__dirname, "../data/mushaf/surah-metadata.json");
const getLayout = () => {
    if (cachedLayout) {
        return cachedLayout;
    }
    cachedLayout = JSON.parse(fs_1.default.readFileSync(getLayoutPath(), "utf8"));
    return cachedLayout;
};
const getSurahMetadata = () => {
    if (cachedSurahMetadata) {
        return cachedSurahMetadata;
    }
    cachedSurahMetadata = JSON.parse(fs_1.default.readFileSync(getSurahMetadataPath(), "utf8"));
    return cachedSurahMetadata;
};
const getAyahLines = () => {
    if (cachedAyahLines) {
        return cachedAyahLines;
    }
    const ayahLineSet = getLayout().ayahs.reduce((lines, ayah) => {
        for (let line = ayah.startGlobalLine; line <= ayah.endGlobalLine; line += 1) {
            lines.add(line);
        }
        return lines;
    }, new Set());
    cachedAyahLines = [...ayahLineSet].sort((firstLine, secondLine) => firstLine - secondLine);
    return cachedAyahLines;
};
const getMushafSurahs = () => Object.values(getSurahMetadata())
    .map((surah) => ({
    number: surah.id,
    name: surah.name_simple,
    ayahs: surah.verses_count,
}))
    .sort((firstSurah, secondSurah) => firstSurah.number - secondSurah.number);
exports.getMushafSurahs = getMushafSurahs;
const getMushafJuzStarts = () => getLayout().juz.map((juz) => ({
    juz: juz.juz,
    surah: juz.startSurah,
    ayah: juz.startAyah,
}));
exports.getMushafJuzStarts = getMushafJuzStarts;
const getLinesPerMushafPage = () => getLayout().source.linesPerPage;
exports.getLinesPerMushafPage = getLinesPerMushafPage;
const getAyahLinesPerMushafPage = () => getAyahLines().length / getLayout().source.numberOfPages;
exports.getAyahLinesPerMushafPage = getAyahLinesPerMushafPage;
const getAyahLayout = (surahNumber, ayah) => getLayout().ayahs.find((layout) => layout.surah === Number(surahNumber) && layout.ayah === Number(ayah)) || null;
exports.getAyahLayout = getAyahLayout;
const getReferenceFromAyahLayout = (layout) => ({
    surahNumber: layout.surah,
    ayah: layout.ayah,
});
const getReferenceAtOrAfterLine = (globalLine) => {
    const layout = getLayout();
    const targetLine = Math.max(1, globalLine);
    return getReferenceFromAyahLayout(layout.ayahs.find((ayah) => ayah.endGlobalLine >= targetLine) ||
        layout.ayahs[layout.ayahs.length - 1]);
};
exports.getReferenceAtOrAfterLine = getReferenceAtOrAfterLine;
const getReferenceEndingAtOrBeforeLine = (globalLine, fallbackReference) => {
    const layout = getLayout();
    const targetLine = Math.max(1, Math.floor(globalLine));
    const fallbackLayout = fallbackReference
        ? (0, exports.getAyahLayout)(fallbackReference.surahNumber, fallbackReference.ayah)
        : layout.ayahs[0];
    return getReferenceFromAyahLayout([...layout.ayahs].reverse().find((ayah) => ayah.endGlobalLine <= targetLine) ||
        fallbackLayout ||
        layout.ayahs[0]);
};
exports.getReferenceEndingAtOrBeforeLine = getReferenceEndingAtOrBeforeLine;
const getReferenceEndingAfterAyahLineCount = (startReference, lineCount) => {
    const startLayout = (0, exports.getAyahLayout)(startReference.surahNumber, startReference.ayah);
    if (!startLayout) {
        return startReference;
    }
    const ayahLines = getAyahLines();
    const firstLineIndex = ayahLines.findIndex((line) => line >= startLayout.startGlobalLine);
    const targetOffset = Math.max(0, Math.floor(lineCount) - 1);
    const targetLine = ayahLines[Math.min(Math.max(0, firstLineIndex) + targetOffset, ayahLines.length - 1)];
    return (0, exports.getReferenceEndingAtOrBeforeLine)(targetLine, startReference);
};
exports.getReferenceEndingAfterAyahLineCount = getReferenceEndingAfterAyahLineCount;
const getReferenceEndingAfterLineCount = (startReference, lineCount) => {
    const startLayout = (0, exports.getAyahLayout)(startReference.surahNumber, startReference.ayah);
    if (!startLayout) {
        return startReference;
    }
    const layout = getLayout();
    const lastGlobalLine = layout.source.numberOfPages * layout.source.linesPerPage;
    const targetLine = Math.min(lastGlobalLine, startLayout.startGlobalLine + Math.max(0, Math.floor(lineCount) - 1));
    return (0, exports.getReferenceEndingAtOrBeforeLine)(targetLine, startReference);
};
exports.getReferenceEndingAfterLineCount = getReferenceEndingAfterLineCount;
const getReferenceStartingBeforeAyahLineCount = (endReference, lineCount) => {
    const endLayout = (0, exports.getAyahLayout)(endReference.surahNumber, endReference.ayah);
    if (!endLayout) {
        return endReference;
    }
    const ayahLines = getAyahLines();
    const lastLineIndex = [...ayahLines]
        .reverse()
        .findIndex((line) => line <= endLayout.endGlobalLine);
    const normalizedLastLineIndex = lastLineIndex >= 0 ? ayahLines.length - 1 - lastLineIndex : ayahLines.length - 1;
    const targetOffset = Math.max(0, Math.floor(lineCount) - 1);
    const targetLine = ayahLines[Math.max(0, normalizedLastLineIndex - targetOffset)];
    return (0, exports.getReferenceAtOrAfterLine)(targetLine);
};
exports.getReferenceStartingBeforeAyahLineCount = getReferenceStartingBeforeAyahLineCount;
const getReferenceStartingBeforeLineCount = (endReference, lineCount) => {
    const endLayout = (0, exports.getAyahLayout)(endReference.surahNumber, endReference.ayah);
    if (!endLayout) {
        return endReference;
    }
    const targetLine = Math.max(1, endLayout.endGlobalLine - Math.max(0, Math.floor(lineCount) - 1));
    return (0, exports.getReferenceAtOrAfterLine)(targetLine);
};
exports.getReferenceStartingBeforeLineCount = getReferenceStartingBeforeLineCount;
const getAyahLineCountInRange = (startGlobalLine, endGlobalLine) => getAyahLines().filter((line) => line >= startGlobalLine && line <= endGlobalLine).length;
exports.getAyahLineCountInRange = getAyahLineCountInRange;
const getJuzLayoutForReference = (surahNumber, ayah) => {
    const ayahLayout = (0, exports.getAyahLayout)(surahNumber, ayah);
    if (!ayahLayout) {
        return null;
    }
    return (getLayout().juz.find((juz) => ayahLayout.startGlobalLine >= juz.startGlobalLine &&
        ayahLayout.startGlobalLine <= juz.endGlobalLine) || null);
};
exports.getJuzLayoutForReference = getJuzLayoutForReference;
