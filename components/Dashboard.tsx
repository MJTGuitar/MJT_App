

import React, { useState, useEffect } from 'react';
import { Student, ProgressItem } from '../types';
import ProgressBar from './ProgressBar';
import { LogoutIcon, ChevronDownIcon } from './icons';
import Metronome from '@kevinorriss/react-metronome';
import GuitarChord from 'react-guitar-chords';
import { PitchDetector } from 'pitchy';

// ------------------- Error Boundary -------------------
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-red-500 p-4">Something went wrong. Check console.</div>;
    }
    return this.props.children;
  }
}

// ------------------- ClientOnly -------------------
const ClientOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
};

// ------------------- TaskItem -------------------
interface TaskItemProps {
  task: ProgressItem;
}
const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const statusConfig = {
    Completed: { color: "text-matrix-green/30", icon: "✓" },
    "In Progress": { color: "text-yellow-400", icon: "..." },
    "Not Started": { color: "text-red-500", icon: "○" },
  };

  const itemStatus = task?.item_status || "Not Started";
  const { color, icon } = statusConfig[itemStatus] || statusConfig["Not Started"];
  const category = task?.category || "Unknown";
  const detail = task?.detail || "";

  const resourceLinks: { url: string; title: string }[] =
    Array.isArray(task?.resource_links)
      ? task.resource_links.map((link) => ({
          url: typeof link === "string" ? link : link?.url || "#",
          title: typeof link === "string" ? link : link?.title || link?.url || "Link",
        }))
      : [];

  return (
    <li className="flex flex-col p-3 transition-colors bg-matrix-dark/50 hover:bg-matrix-dark rounded-md">
      <div className="flex-1 pr-4">
        <p className="font-bold text-matrix-green/90">
          {category}: <span className="font-normal">{detail}</span>
        </p>
        {resourceLinks.length > 0 && (
          <div className="mt-1 space-y-1">
            {resourceLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cyan-400 hover:underline"
              >
                {link.title}
              </a>
            ))}
          </div>
        )}
      </div>
      <div className={`flex items-center gap-2 font-mono text-sm mt-2 ${color}`}>
        <span>{icon}</span>
        <span>{itemStatus}</span>
      </div>
    </li>
  );
};

// ------------------- GradeSection -------------------
const GradeSection: React.FC<{ grade: string; tasks: ProgressItem[]; isCurrent: boolean }> = ({
  grade,
  tasks,
  isCurrent,
}) => {
  const [isOpen, setIsOpen] = useState(isCurrent);
  const total = tasks.length;
  const completed = tasks.filter((t) => t.item_status === "Completed").length;
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
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div className="p-4 bg-matrix-dark-accent/50">
        <ProgressBar label={`${completed}/${total} Tasks Completed`} percentage={percentage} />
      </div>
      {isOpen && (
        <div className="p-4 border-t border-matrix-green/10">
          <ul className="space-y-2">
            {tasks.length > 0
              ? tasks.map((task, i) => {
                  try {
                    return <TaskItem key={i} task={task} />;
                  } catch (err) {
                    console.error("TaskItem error:", err, task);
                    return <li className="text-red-500">Error loading task</li>;
                  }
                })
              : <p className="text-center text-green/80 py-4">No tasks found for this grade.</p>
            }
          </ul>
        </div>
      )}
    </div>
  );
};

// ------------------- Safe PitchDetector -------------------
const PitchDetectorSafe: React.FC = () => {
  const [note, setNote] = useState<string>("-");
  const [frequency, setFrequency] = useState<number | null>(null);

  useEffect(() => {
    let animationId: number;
    let detector: any;
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Float32Array;
    let sourceNode: MediaStreamAudioSourceNode;

    const init = async () => {
      try {
        if (!navigator.mediaDevices) return;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        sourceNode = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        sourceNode.connect(analyser);
        dataArray = new Float32Array(analyser.fftSize);
        detector = PitchDetector.forFloat32Array(analyser.fftSize);

        const updatePitch = () => {
          analyser.getFloatTimeDomainData(dataArray);
          const [pitch] = detector.findPitch(dataArray, audioContext.sampleRate);
          if (pitch) {
            setFrequency(pitch);
            const midi = 69 + 12 * Math.log2(pitch / 440);
            const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
            setNote(noteNames[Math.round(midi) % 12]);
          }
          animationId = requestAnimationFrame(updatePitch);
        };
        updatePitch();
      } catch (err) {
        console.error("PitchDetector error:", err);
        setNote("-");
        setFrequency(null);
      }
    };

    init();
    return () => {
      cancelAnimationFrame(animationId);
      audioContext?.close();
    };
  }, []);

  return (
    <div className="text-center text-white">
      <p className="text-lg font-bold">{note}</p>
      <p className="text-sm">{frequency ? frequency.toFixed(1) + " Hz" : "-"}</p>
    </div>
  );
};

// ------------------- Helpers -------------------
const parsePreviousGrades = (raw: string | string[] | null | undefined): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((g) => g.trim()).filter(Boolean);
  return raw.split(/[,;\n]/).map((g) => g.trim()).filter(Boolean);
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

  const progressByGrade: { [grade: string]: ProgressItem[] } = {};
  progressData.forEach((task) => {
    if (!progressByGrade[task.grade]) progressByGrade[task.grade] = [];
    progressByGrade[task.grade].push(task);
  });

  const previousGrades = parsePreviousGrades((student as any).previous_grades);
  const grades = [student.current_grade, ...previousGrades].filter(Boolean);

  // Next lesson
  let nextLessonText = "";
  const dateStr = student.next_lesson_date?.trim();
  const timeStr = student.next_lesson_time?.trim();
  const lengthStr = student.next_lesson_length?.trim();
  if (dateStr && timeStr && lengthStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hour, minute] = timeStr.split(":").map(Number);
    const lessonDateTime = new Date(year, month-1, day, hour, minute);
    if (!isNaN(lessonDateTime.getTime())) {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
      const formattedDate = lessonDateTime.toLocaleDateString(undefined, options);
      const formattedTime = lessonDateTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      nextLessonText = `${formattedDate} at ${formattedTime} (${lengthStr})`;
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full flex justify-center items-start lg:items-center p-4 sm:p-9"
        style={{
          backgroundImage: 'url("https://raw.githubusercontent.com/MJTGuitar/site-assets/06a843085b182ea664ac4547aca8948d0f4e4886/Guitar%20Background.png")',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="w-full max-w-4xl p-4 sm:p-6 bg-matrix-dark-accent/90 backdrop-blur-md border border-matrix-green/50 rounded-lg shadow-lg shadow-matrix-green/90">
          
          {/* Lava lamp logo */}
          <div className="flex justify-center mb-6">
            <div
              className="w-28 sm:w-36 h-28 sm:h-36 rounded-full border-4 border-matrix-green/50 shadow-lg shadow-matrix-green/80 overflow-hidden hover:scale-105 transition-transform"
              style={{
                backgroundImage: 'url(/images/lavalogo.gif)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            ></div>
          </div>

          {/* Header */}
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

          {/* Next lesson */}
          {nextLessonText && (
            <div className="mb-6 p-4 w-full bg-matrix-dark/70 border border-matrix-green/30 rounded-lg shadow-md">
              <p className="text-white text-lg text-center font-semibold">
                Next Lesson: {nextLessonText}
              </p>
            </div>
          )}

          {/* Tools row */}
          <ClientOnly>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Metronome */}
              <ErrorBoundary>
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-lg shadow-lg border border-matrix-green/50 flex flex-col items-center">
                  <h3 className="text-white font-bold text-center mb-2">Metronome</h3>
                  <ClientOnly>
                    {(() => { try { return <Metronome bpm={100} />; } catch (err) { console.error("Metronome error:", err); return <div className="text-red-500">Metronome failed</div>; } })()}
                  </ClientOnly>
                </div>
              </ErrorBoundary>

              {/* Guitar Chord Finder */}
              <ErrorBoundary>
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-4 rounded-lg shadow-lg border border-matrix-green/50 flex flex-col items-center">
                  <h3 className="text-white font-bold text-center mb-2">Chord Finder</h3>
                  <ClientOnly>
                    {(() => { try { return <GuitarChord chord="G" tuning="standard" />; } catch (err) { console.error("GuitarChord error:", err); return <div className="text-red-500">Chord Finder failed</div>; } })()}
                  </ClientOnly>
                </div>
              </ErrorBoundary>

              {/* Pitch Detector */}
              <ErrorBoundary>
                <div className="bg-gradient-to-br from-blue-400 to-cyan-500 p-4 rounded-lg shadow-lg border border-matrix-green/50 flex flex-col items-center">
                  <h3 className="text-white font-bold text-center mb-2">Tuner</h3>
                  <ClientOnly>
                    <PitchDetectorSafe />
                  </ClientOnly>
                </div>
              </ErrorBoundary>
            </div>
          </ClientOnly>

          {/* Grades */}
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
    </ErrorBoundary>
  );
};

export default Dashboard;