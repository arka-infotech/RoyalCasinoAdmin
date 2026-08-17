import axios, { type AxiosInstance } from "axios";

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    console.log(`API: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/login`;
      }
    }
    const message = error.response?.data?.message || error.message || "Network error";
    throw new Error(message);
  }
);

export default apiClient;
