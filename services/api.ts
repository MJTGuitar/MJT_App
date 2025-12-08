// services/api.ts

import { type Students, type Progress } from "../types";

interface ApiService {
  verifyLogin(
    email: string,
    password: string
  ): Promise<{ student: Students; progress: Progress[] } | null>;
}

const students: Students[] = [
  {
    student_id: "123",
    student_name: "Alice",
    current_grade: "Grade 6",
    previous_grades: ["Grade 5"],
    comments: "",
    share_link: "",
    student_email: "alice@example.com",
    student_password: "password123", // demo only
  },
];

const flatProgress: Progress[] = [
  {
    student_id: "123",
    grade: "Grade 6",
    category: "Scales",
    detail: "Practice C Major",
    item_status: "Completed",
    resource_links: "https://example.com/scales",
  },
  {
    student_id: "123",
    grade: "Grade 6",
    category: "Chords",
    detail: "Learn G Major",
    item_status: "In Progress",
  },
  {
    student_id: "123",
    grade: "Grade 5",
    category: "Theory",
    detail: "Read notes",
    item_status: "Not Started",
  },
];

const api: ApiService = {
  verifyLogin: async (email, password) => {
    const student = students.find(
      (s) => s.student_email === email && s.student_password === password
    );
    if (!student) return null;

    // Return flat progress rows directly
    const progress = flatProgress.filter((p) => p.student_id === student.student_id);

    return { student, progress };
  },
};

export default api;
