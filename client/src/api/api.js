import axios from "axios";
import { clearSession, getToken } from "../auth/auth";

export const api = axios.create({
  baseURL: "http://localhost:5000",
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

export const createDailyEntry = async (entry) => {
  const res = await api.post("/entries", entry);
  return res.data;
};
