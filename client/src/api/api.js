import axios from "axios";
import { clearSession, getToken } from "../auth/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000"
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      window.location.assign("/");
    }

    return Promise.reject(error);
  }
);

export const getDashboardData = async () => {
  const res = await api.get("/dashboard");
  return res.data;
};

export const updateLessonPreferences = async (lessonPreferences) => {
  const res = await api.patch("/dashboard/lesson-preferences", lessonPreferences);
  return res.data;
};

export const createDailyEntry = async (entry) => {
  const res = await api.post("/entries", entry);
  return res.data;
};

export const deleteDailyEntry = async (entryId) => {
  const res = await api.delete(`/entries/${entryId}`);
  return res.data;
};

export const restoreDailyEntry = async (entry) => {
  const res = await api.patch(`/entries/${entry.id}/restore`, entry);
  return res.data;
};
