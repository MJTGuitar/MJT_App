import React, { useState } from 'react';
import { Student, ProgressItem } from '../types';
import ProgressBar from './ProgressBar';
import { LogoutIcon, ChevronDownIcon, LinkIcon } from './icons';

// ------------------- Styles -------------------
const backgroundStyle: React.CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  backgroundImage:
    'url("https://raw.githubusercontent.com/MJTGuitar/site-assets/06a843085b182ea664ac4547aca8948d0f4e4886/Guitar%20Background.png")',
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "cover",
};

// ------------------- Task Item -------------------
import React from "react";
import { ProgressItem } from "../types";
import { LinkIcon } from "./icons";

interface ResourceLink {
  url: string;
  title: string;
}

const TaskItem: React.FC<{ task: ProgressItem }> = ({ task }) => {
  const statusConfig = {
    Completed: { color: "text-matrix-green/30", icon: "✓" },
    "In Progress": { color: "text-yellow-400", icon: "..." },
    "Not Started": { color: "text-red-500", icon: "○" },
  };
  const { color, icon } =
    statusConfig[task.item_status] || statusConfig["Not Started"];

  // Ensure resourceLinks is always an array of {url, title}
  const resourceLinks: ResourceLink[] =
    Array.isArray(task.resource_links) && task.resource_links.length > 0
      ? task.resource_links.map((link) => ({
          url: typeof link === "string" ? link : link.url,
          title: typeof link === "string" ? link : link.title,
        }))
      : [];

  return (
    <li className="flex items-start justify-between p-3 transition-colors bg-matrix-dark/50 hover:bg-matrix-dark rounded-md">
      <div className="flex-1 pr-4">
        <p className="font-bold text-matrix-green/90">
          {task.category}: <span className="font-normal">{task.detail}</span>
        </p>

        {resourceLinks.length > 0 && (
          <div className="mt-1 space-y-1">
            {resourceLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
              >
                <LinkIcon className="w-3 h-3" />
                {link.title || link.url}
              </a>
            ))}
          </div>
        )}
      </div>

      <div
        className={`flex items-center gap-2 font-mono text-sm shrink-0 ${color}`}
      >
        <span>{icon}</span>
        <span>{task.item_status}</span>
      </div>
    </li>
  );
};

// ------------------- Grade Section -------------------
const GradeSection: React.FC<{ grade: string; tasks: ProgressItem[]; isCurrent: boolean }> = ({
  grade,
  tasks,
  isCurrent,
}) => {
  const [isOpen, setIsOpen] = useState(isCurrent);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.item_status === 'Completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="border border-matrix-green/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left flex justify-between items-center p-4 bg-matrix-dark-accent hover:bg-matrix-dark/50 transition-colors"
      >
        <div>
          <h3 className="text-xl font-bold text-matrix-green/80">{grade}</h3>
          {isCurrent && (
            <span className="text-xs text-matrix-green/80 uppercase tracking-widest">Current</span>
          )}
        </div>
        <ChevronDownIcon
          className={`w-6 h-6 text-matrix-green/80 transform transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div className="p-4 bg-matrix-dark-accent/50">
        <ProgressBar label={`${completed}/${total} Tasks Completed`} percentage={percentage} />
      </div>

      {isOpen && (
        <div className="p-4 border-t border-matrix-green/10">
          <ul className="space-y-2">
            {tasks.length > 0 ? (
              tasks.map((task, i) => <TaskItem key={i} task={task} />)
            ) : (
              <p className="text-center text-green/80 py-4">No tasks found for this grade.</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// ------------------- Helper: parse previous grades -------------------
const parsePreviousGrades = (raw: string | string[] | null | undefined): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((g) => g.trim()).filter(Boolean);
  return raw
    .split(/[,;\n]/)
    .map((g) => g.trim())
    .filter(Boolean);
};

// ------------------- Dashboard -------------------
interface DashboardProps {
  student: Student;
  progressData: ProgressItem[];
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ student, progressData, onLogout }) => {
  if (!progressData || progressData.length === 0) {
    return <p className="text-center text-green/80 py-10">No progress data found.</p>;
  }

  // Group tasks by grade
  const progressByGrade: { [grade: string]: ProgressItem[] } = {};
  progressData.forEach((task) => {
    if (!progressByGrade[task.grade]) progressByGrade[task.grade] = [];
    progressByGrade[task.grade].push(task);
  });

  // Use safe parsing for previous grades
  const previousGrades = parsePreviousGrades((student as any).previous_grades);
  const grades = [student.current_grade, ...previousGrades].filter(Boolean);

  // ------------------- Format Next Lesson -------------------
  let nextLessonText = "";
  const dateStr = student.next_lesson_date?.trim();
  const timeStr = student.next_lesson_time?.trim();
  const lengthStr = student.next_lesson_length?.trim();

  if (dateStr && timeStr && lengthStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hour, minute] = timeStr.split(":").map(Number);

    // JS month is 0-based
    const lessonDateTime = new Date(year, month - 1, day, hour, minute);

    if (!isNaN(lessonDateTime.getTime())) {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
      const formattedDate = lessonDateTime.toLocaleDateString(undefined, options);
      const formattedTime = lessonDateTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      nextLessonText = `${formattedDate} at ${formattedTime} (${lengthStr})`;
    }
  }

  return (
    <div
      style={backgroundStyle}
      className="min-h-screen w-full flex justify-center items-start lg:items-center p-9"
    >
      <div className="w-full max-w-4xl p-6 bg-matrix-dark-accent/90 backdrop-blur-md border border-matrix-green/50 rounded-lg shadow-lg shadow-matrix-green/90">
        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-matrix-green/90 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Student Dashboard</h1>
            <p className="text-white">Welcome, {student.student_name}!</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-transparent border border-red-500/50 rounded-md hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogoutIcon className="w-4 h-4" /> Logout
          </button>
        </header>

        {/* ----------------- Next Lesson Box ----------------- */}
        {nextLessonText && (
          <div className="mb-6 p-4 w-full bg-matrix-dark/70 border border-matrix-green/30 rounded-lg shadow-md">
            <p className="text-white text-lg text-center font-semibold">
              Next Lesson: {nextLessonText}
            </p>
          </div>
        )}

        {/* MAIN CONTENT */}
        <main className="space-y-6">
          {grades.map((grade) => (
            <GradeSection
              key={grade}
              grade={grade}
              tasks={progressByGrade[grade] || []}
              isCurrent={grade === student.current_grade}
            />
          ))}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
