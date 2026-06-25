import { useEffect, useState } from "react";
import { api } from "../api/api";

const surahs = [
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

const coverageTypes = [
  { key: "sabaq", label: "Sabaq" },
  { key: "sabaqPara", label: "Sabaq Para" },
  { key: "revision", label: "Revision" },
];

const createDefaultCoverage = () =>
  coverageTypes.reduce((coverage, type) => {
    coverage[type.key] = {
      surahNumber: 1,
      fromAyah: 1,
      toAyah: 7,
    };

    return coverage;
  }, {});

const formatEntryDate = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
};

const getSurahByNumber = (surahNumber) =>
  surahs.find((surah) => surah.number === Number(surahNumber)) || surahs[0];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [coverage, setCoverage] = useState(createDefaultCoverage);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");

      const res = await api.get("/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setData(res.data);
    };

    fetchData();
  }, []);

  const updateCoverage = (typeKey, field, value) => {
    setCoverage((currentCoverage) => {
      const currentEntry = currentCoverage[typeKey];

      if (field === "surahNumber") {
        const selectedSurah = getSurahByNumber(value);

        return {
          ...currentCoverage,
          [typeKey]: {
            surahNumber: selectedSurah.number,
            fromAyah: 1,
            toAyah: selectedSurah.ayahs,
          },
        };
      }

      const numericValue = Number(value);
      const nextEntry = {
        ...currentEntry,
        [field]: numericValue,
      };

      if (field === "fromAyah" && numericValue > nextEntry.toAyah) {
        nextEntry.toAyah = numericValue;
      }

      if (field === "toAyah" && numericValue < nextEntry.fromAyah) {
        nextEntry.fromAyah = numericValue;
      }

      return {
        ...currentCoverage,
        [typeKey]: nextEntry,
      };
    });
  };

  if (!data) return <p style={{ padding: 20 }}>Loading...</p>;

  const studentName = data.studentName || data.user?.name || "Student";
  const progress = data.progress || {};

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1>
          Assalam o Alaikum, <span style={{ color: "#2563eb" }}>{studentName}</span>
        </h1>
        <p style={{ color: "#666" }}>
          وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍۢ
        </p>
      </div>

      <main style={styles.content}>
        <div style={styles.dashboardGrid}>
        <section style={styles.panel}>
          <h2>Progress Overview</h2>

          <div style={styles.progressList}>
            <div style={styles.progressItem}>
              <span style={styles.progressLabel}>Juz Memorized</span>
              <strong style={styles.progressValue}>{progress.juz || 0}</strong>
            </div>

            <div style={styles.progressItem}>
              <span style={styles.progressLabel}>Pages Memorized</span>
              <strong style={styles.progressValue}>{progress.pages || 0}</strong>
            </div>

            <div style={styles.progressItem}>
              <span style={styles.progressLabel}>Surahs Memorized</span>
              <strong style={styles.progressValue}>{progress.surahs || 0}</strong>
            </div>

            <div style={styles.progressItem}>
              <span style={styles.progressLabel}>Current Streak</span>
              <strong style={styles.progressValue}>{data.streak}</strong>
            </div>

            <div style={styles.progressItem}>
              <span style={styles.progressLabel}>Longest Streak</span>
              <strong style={styles.progressValue}>{data.longestStreak}</strong>
            </div>
          </div>
        </section>

        <section style={styles.panel}>
          <h2>What did you cover today?</h2>

          <div style={styles.coverageList}>
            {coverageTypes.map((type) => {
              const entry = coverage[type.key];
              const selectedSurah = getSurahByNumber(entry.surahNumber);
              const ayahOptions = Array.from(
                { length: selectedSurah.ayahs },
                (_, index) => index + 1
              );

              return (
                <div key={type.key} style={styles.coverageGroup}>
                  <h3 style={styles.coverageTitle}>{type.label}</h3>

                  <label style={styles.label}>
                    Surah
                    <select
                      value={entry.surahNumber}
                      onChange={(event) =>
                        updateCoverage(type.key, "surahNumber", event.target.value)
                      }
                      style={styles.input}
                    >
                      {surahs.map((surah) => (
                        <option key={surah.number} value={surah.number}>
                          {surah.number}. {surah.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={styles.ayahRow}>
                    <label style={styles.label}>
                      From Ayah
                      <select
                        value={entry.fromAyah}
                        onChange={(event) =>
                          updateCoverage(type.key, "fromAyah", event.target.value)
                        }
                        style={styles.input}
                      >
                        {ayahOptions.map((ayah) => (
                          <option key={ayah} value={ayah}>
                            {ayah}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={styles.label}>
                      To Ayah
                      <select
                        value={entry.toAyah}
                        onChange={(event) =>
                          updateCoverage(type.key, "toAyah", event.target.value)
                        }
                        style={styles.input}
                      >
                        {ayahOptions.map((ayah) => (
                          <option key={ayah} value={ayah}>
                            {ayah}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <button style={styles.button}>Save Entry</button>
        </section>

        <section style={styles.panel}>
          <h2>Recent Entries</h2>

          {data.recentEntries.length === 0 ? (
            <p style={styles.emptyText}>No recent entries yet.</p>
          ) : (
            data.recentEntries.map((entry) => (
              <div key={entry.id} style={styles.entry}>
                <p style={styles.entryDate}>{formatEntryDate(entry.date)}</p>
                <p>
                  <b>{entry.sabaq}</b>
                </p>
                <p style={styles.entryNotes}>{entry.notes}</p>
              </div>
            ))
          )}
        </section>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    padding: 30,
    fontFamily: "Arial",
    background: "#f6f7fb",
    minHeight: "100vh",
    overflowX: "auto",
  },
  header: {
    marginBottom: 20,
    textAlign: "center",
  },
  content: {
    maxWidth: 1120,
    margin: "0 auto",
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 0.85fr) minmax(330px, 1.05fr) minmax(250px, 0.9fr)",
    gap: 16,
    alignItems: "start",
    minWidth: 840,
  },
  panel: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  progressList: {
    display: "grid",
    gap: 12,
  },
  progressItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid #eee",
  },
  progressLabel: {
    color: "#555",
  },
  progressValue: {
    color: "#2563eb",
    fontSize: 20,
  },
  coverageList: {
    display: "grid",
    gap: 16,
    marginBottom: 16,
  },
  coverageGroup: {
    borderBottom: "1px solid #eee",
    paddingBottom: 16,
  },
  coverageTitle: {
    fontSize: 16,
    margin: "0 0 10px",
  },
  ayahRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  label: {
    display: "grid",
    gap: 6,
    color: "#555",
    fontSize: 13,
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    margin: "0 0 10px",
  },
  button: {
    padding: 10,
    width: "100%",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  entry: {
    borderBottom: "1px solid #eee",
    padding: "10px 0",
  },
  entryDate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  entryNotes: {
    fontSize: 12,
    color: "#666",
  },
  emptyText: {
    color: "#666",
    fontSize: 14,
  },
};