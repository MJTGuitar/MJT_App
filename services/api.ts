import { type Students, type Progress } from "../types";

interface ApiService {
  verifyLogin(student_email: string, student_password: string): Promise<{ student: Students; progress: Progress[] } | null>;
  getStudentProgressData(student_id: string): Promise<Progress | null>;
}

const api: ApiService = {
  // POST to /api/login
  verifyLogin: async (email, password) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.success ? { student: data.user, progress: data.progress } : null;
  },

  // Optional: fetch progress for a specific student (already returned in login)
  getStudentProgressData: async (studentId) => {
    const res = await fetch("/api/login", { // could also hit /api/getSheet if needed
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_email: "", student_password: "" }), // or remove if using cached data
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.progress?.find((p: any) => p.id === studentId) || null;
  },
};

export default api;
