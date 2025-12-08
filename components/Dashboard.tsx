import React from "react";
import { type Students, type Progress } from "../types";
import ProgressBar from "./ProgressBar";
import { LogoutIcon, ChevronDownIcon, LinkIcon } from "./icons";

interface DashboardProps {
  student: Students;
  progressData: Progress[];
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ student, progressData, onLogout }) => {
  // Group progress by grade
  const progressByGrade: { [grade: string]: Progress[] } = {};
  progressData.forEach((task) => {
    if (!progressByGrade[task.grade]) progressByGrade[task.grade] = [];
    progressByGrade[task.grade].push(task);
  });

  const grades = [student.current_grade, ...student.previous_grades].filter(Boolean);

  const renderProgress = () => {
    if (!progressData || progressData.length === 0) {
      return <p className="text-center text-green/80">No progress data found.</p>;
    }

    return (
      <div className="space-y-6">
        {grades.map((grade) => (
          <GradeSection
            key={grade}
            grade={grade}
            tasks={progressByGrade[grade] || []}
            isCurrent={grade === student.current_grade}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-start lg:items-center p-9"
         style={{ 
           minHeight: "100vh",
           width: "100%",
           backgroundImage: 'url("https://raw.githubusercontent.com/MJTGuitar/site-assets/06a843085b182ea664ac4547aca8948d0f4e4886/Guitar%20Background.png")',
           backgroundRepeat: "no-repeat",
           backgroundPosition: "center",
           backgroundSize: "cover",
         }}
    >
      <div className="w-full max-w-4xl p-6 bg-matrix-dark-accent/90 backdrop-blur-md border border-matrix-green/50 rounded-lg shadow-lg shadow-matrix-green/90">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-matrix-green/90 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Student Dashboard</h1>
            <p className="text-white">Welcome, {student.student_name}!</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-transparent border border-red-500/50 rounded-md hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogoutIcon className="w-4 h-4" />
            Logout
          </button>
        </header>
        <main>{renderProgress()}</main>
      </div>
    </div>
  );
};

console.log("Login result:", result);

export default Dashboard;
