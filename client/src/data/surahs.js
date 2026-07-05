import surahMetadata from "./quran-metadata-surah-name.json";

export const surahs = Object.values(surahMetadata)
  .map((surah) => ({
    number: surah.id,
    name: surah.name_simple,
    ayahs: surah.verses_count,
  }))
  .sort((firstSurah, secondSurah) => firstSurah.number - secondSurah.number);
