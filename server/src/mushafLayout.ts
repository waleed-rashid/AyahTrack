import fs from "fs";
import path from "path";

type AyahLayout = {
  surah: number;
  ayah: number;
  startPage: number;
  startLine: number;
  endPage: number;
  endLine: number;
  startGlobalLine: number;
  endGlobalLine: number;
  startWordId: number;
  endWordId: number;
};

type JuzLayout = {
  juz: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  startGlobalLine: number;
  endGlobalLine: number;
};

type MushafLayout = {
  source: {
    numberOfPages: number;
    linesPerPage: number;
  };
  ayahs: AyahLayout[];
  juz: JuzLayout[];
};

type SurahMetadata = Record<
  string,
  {
    id: number;
    name_simple: string;
    verses_count: number;
  }
>;

type AyahReference = {
  surahNumber: number;
  ayah: number;
};

let cachedLayout: MushafLayout | null = null;
let cachedSurahMetadata: SurahMetadata | null = null;
let cachedAyahLines: number[] | null = null;

const getLayoutPath = () => path.resolve(__dirname, "../data/mushaf/ayah-layout.json");
const getSurahMetadataPath = () => path.resolve(__dirname, "../data/mushaf/surah-metadata.json");

const getLayout = () => {
  if (cachedLayout) {
    return cachedLayout;
  }

  cachedLayout = JSON.parse(fs.readFileSync(getLayoutPath(), "utf8")) as MushafLayout;
  return cachedLayout;
};

const getSurahMetadata = () => {
  if (cachedSurahMetadata) {
    return cachedSurahMetadata;
  }

  cachedSurahMetadata = JSON.parse(fs.readFileSync(getSurahMetadataPath(), "utf8")) as SurahMetadata;
  return cachedSurahMetadata;
};

const getAyahLines = () => {
  if (cachedAyahLines) {
    return cachedAyahLines;
  }

  const ayahLineSet = getLayout().ayahs.reduce<Set<number>>((lines, ayah) => {
    for (let line = ayah.startGlobalLine; line <= ayah.endGlobalLine; line += 1) {
      lines.add(line);
    }

    return lines;
  }, new Set());

  cachedAyahLines = [...ayahLineSet].sort((firstLine, secondLine) => firstLine - secondLine);
  return cachedAyahLines;
};

export const getMushafSurahs = () =>
  Object.values(getSurahMetadata())
    .map((surah) => ({
      number: surah.id,
      name: surah.name_simple,
      ayahs: surah.verses_count,
    }))
    .sort((firstSurah, secondSurah) => firstSurah.number - secondSurah.number);

export const getMushafJuzStarts = () =>
  getLayout().juz.map((juz) => ({
    juz: juz.juz,
    surah: juz.startSurah,
    ayah: juz.startAyah,
  }));

export const getLinesPerMushafPage = () => getLayout().source.linesPerPage;

export const getAyahLinesPerMushafPage = () =>
  getAyahLines().length / getLayout().source.numberOfPages;

export const getAyahLayout = (surahNumber: number, ayah: number) =>
  getLayout().ayahs.find(
    (layout) => layout.surah === Number(surahNumber) && layout.ayah === Number(ayah)
  ) || null;

const getReferenceFromAyahLayout = (layout: AyahLayout): AyahReference => ({
  surahNumber: layout.surah,
  ayah: layout.ayah,
});

export const getReferenceAtOrAfterLine = (globalLine: number) => {
  const layout = getLayout();
  const targetLine = Math.max(1, globalLine);

  return getReferenceFromAyahLayout(
    layout.ayahs.find((ayah) => ayah.endGlobalLine >= targetLine) ||
      layout.ayahs[layout.ayahs.length - 1]
  );
};

export const getReferenceEndingAtOrBeforeLine = (
  globalLine: number,
  fallbackReference?: AyahReference
) => {
  const layout = getLayout();
  const targetLine = Math.max(1, Math.floor(globalLine));
  const fallbackLayout = fallbackReference
    ? getAyahLayout(fallbackReference.surahNumber, fallbackReference.ayah)
    : layout.ayahs[0];

  return getReferenceFromAyahLayout(
    [...layout.ayahs].reverse().find((ayah) => ayah.endGlobalLine <= targetLine) ||
      fallbackLayout ||
      layout.ayahs[0]
  );
};

export const getReferenceEndingAfterAyahLineCount = (
  startReference: AyahReference,
  lineCount: number
) => {
  const startLayout = getAyahLayout(startReference.surahNumber, startReference.ayah);

  if (!startLayout) {
    return startReference;
  }

  const ayahLines = getAyahLines();
  const firstLineIndex = ayahLines.findIndex((line) => line >= startLayout.startGlobalLine);
  const targetOffset = Math.max(0, Math.floor(lineCount) - 1);
  const targetLine =
    ayahLines[Math.min(Math.max(0, firstLineIndex) + targetOffset, ayahLines.length - 1)];

  return getReferenceEndingAtOrBeforeLine(targetLine, startReference);
};

export const getReferenceEndingAfterLineCount = (
  startReference: AyahReference,
  lineCount: number
) => {
  const startLayout = getAyahLayout(startReference.surahNumber, startReference.ayah);

  if (!startLayout) {
    return startReference;
  }

  const layout = getLayout();
  const lastGlobalLine = layout.source.numberOfPages * layout.source.linesPerPage;
  const targetLine = Math.min(
    lastGlobalLine,
    startLayout.startGlobalLine + Math.max(0, Math.floor(lineCount) - 1)
  );

  return getReferenceEndingAtOrBeforeLine(targetLine, startReference);
};

export const getReferenceStartingBeforeAyahLineCount = (
  endReference: AyahReference,
  lineCount: number
) => {
  const endLayout = getAyahLayout(endReference.surahNumber, endReference.ayah);

  if (!endLayout) {
    return endReference;
  }

  const ayahLines = getAyahLines();
  const lastLineIndex = [...ayahLines]
    .reverse()
    .findIndex((line) => line <= endLayout.endGlobalLine);
  const normalizedLastLineIndex =
    lastLineIndex >= 0 ? ayahLines.length - 1 - lastLineIndex : ayahLines.length - 1;
  const targetOffset = Math.max(0, Math.floor(lineCount) - 1);
  const targetLine = ayahLines[Math.max(0, normalizedLastLineIndex - targetOffset)];

  return getReferenceAtOrAfterLine(targetLine);
};

export const getReferenceStartingBeforeLineCount = (
  endReference: AyahReference,
  lineCount: number
) => {
  const endLayout = getAyahLayout(endReference.surahNumber, endReference.ayah);

  if (!endLayout) {
    return endReference;
  }

  const targetLine = Math.max(1, endLayout.endGlobalLine - Math.max(0, Math.floor(lineCount) - 1));

  return getReferenceAtOrAfterLine(targetLine);
};

export const getAyahLineCountInRange = (startGlobalLine: number, endGlobalLine: number) =>
  getAyahLines().filter((line) => line >= startGlobalLine && line <= endGlobalLine).length;

export const getJuzLayoutForReference = (surahNumber: number, ayah: number) => {
  const ayahLayout = getAyahLayout(surahNumber, ayah);

  if (!ayahLayout) {
    return null;
  }

  return (
    getLayout().juz.find(
      (juz) =>
        ayahLayout.startGlobalLine >= juz.startGlobalLine &&
        ayahLayout.startGlobalLine <= juz.endGlobalLine
    ) || null
  );
};
