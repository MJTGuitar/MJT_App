import { type Students, type Progress } from "../types";

interface ApiService {
  verifyLogin(
    email: string,
    password: string
  ): Promise<{ student: Students; progress: Progress[] } | null>;
}

const api: ApiService = {
  verifyLogin: async (email, password) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST", // 🔹 ensures POST
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store", // 🔹 prevent caching issues
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        console.error("Login failed:", res.statusText);
        return null;
      }

      const data = await res.json();
      return data.success ? { student: data.student, progress: data.progress } : null;
    } catch (err) {
      console.error("API verifyLogin error:", err);
      return null;
    }
  },
};

export default api;
