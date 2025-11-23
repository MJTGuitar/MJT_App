import { type Students, type Progress } from "../types";

interface ApiService {
  verifyLogin(
    student_email: string,
    student_password: string
  ): Promise<{ student: Students; progress: Progress[] } | null>;
  getStudentProgressData(student_id: string): Promise<Progress | null>;
}

const api: ApiService = {
  // 🔹 Send email/password to /api/login
  verifyLogin: async (email, password) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      return data.success
        ? { student: data.user, progress: data.progress }
        : null;
    } catch (err) {
      console.error("API verifyLogin error:", err);
      return null;
    }
  },

  // 🔹 Optional: fetch progress for a specific student
  getStudentProgressData: async (studentId) => {
    try {
      const res = await fetch("/api/getSheet"); // if you need sheet raw data
      if (!res.ok) return null;

      const data = await res.json();
      return data.values?.find((s: any) => s.id === studentId) || null;
    } catch (err) {
      console.error("API getStudentProgressData error:", err);
      return null;
    }
  },
};

export default api;
