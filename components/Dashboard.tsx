import React, { useState, useEffect } from "react";
import { Student, ProgressItem } from "../types";
import ProgressBar from "./ProgressBar";
import { LogoutIcon, ChevronDownIcon } from "./icons";
import { PitchDetector } from "pitchy";

// ------------------- ErrorBoundary -------------------
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
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
      return (
        <div className="text-red-500 p-4">
          Something went wrong. Check console.
        </div>
      );
    }
    return this.props.children;
  }
}

// ------------------- Utility: Extract filename or domain -------------------
function prettyLinkName(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.split("/").filter(Boolean);
    if (u.hostname.includes("youtube")) return "YouTube video";
    if (path.length === 0) return u.hostname;
    return path[path.length - 1].replace(/[-_]/g, " ");
  } catch {
    return url;
  }
}

// ------------------- Utility: Get YouTube title -------------------
async function fetchYouTubeTitle(url: string): Promise<string | null> {
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      url
    )}&format=json`;
    const res = await fetch(oembed);
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch {
    return null;
  }
}

// ------------------- ResourceLink -------------------
const ResourceLink: React.FC<{ url: string }> = ({ url }) => {
  const [title, setTitle] = useState<string | null>(null);

  const isYouTube =
    url.includes("youtube.com") || url.includes("youtu.be");

  useEffect(() => {
    let mounted = true;
    const cacheKey = `yt_title_${url}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      setTitle(cached);
      return;
    }

    if (isYouTube) {
      fetchYouTubeTitle(url).then((t) => {
        if (mounted && t) {
          setTitle(t);
          sessionStorage.setItem(cacheKey, t);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [url]);

  const displayText =
    title || prettyLinkName(url) || "Resource";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-cyan-400 hover:underline break-all"
    >
      {displayText}
    </a>
  );
};

// ------------------- Neon Tuner -------------------
const NeonTuner: React.FC = () => {
  const [note, setNote] = useState("-");
  const [cents, setCents] = useState<number | null>(null);

  useEffect(() => {
    let animationId: number;
    let detector: any;
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Float32Array;

    // SETTINGS
    const MIN_VOLUME = 0.02; // noise gate
    const SMOOTHING = 5;
    let recentPitches: number[] = [];

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        audioContext = new AudioContext();
        const sourceNode =
          audioContext.createMediaStreamSource(stream);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        dataArray = new Float32Array(analyser.fftSize);

        sourceNode.connect(analyser);

        detector = PitchDetector.forFloat32Array(
          analyser.fftSize
        );

        const updatePitch = () => {
          analyser.getFloatTimeDomainData(dataArray);

          // Compute RMS for noise gate
          let sumSq = 0;
          for (let i = 0; i < dataArray.length; i++)
            sumSq += dataArray[i] * dataArray[i];
          const rms = Math.sqrt(sumSq / dataArray.length);

          if (rms < MIN_VOLUME) {
            setNote("-");
            setCents(null);
            animationId = requestAnimationFrame(updatePitch);
            return;
          }

          const [pitch] = detector.findPitch(
            dataArray,
            audioContext.sampleRate
          );

          if (pitch > 0) {
            // Smoothing
            recentPitches.push(pitch);
            if (recentPitches.length > SMOOTHING)
              recentPitches.shift();
            const smoothPitch =
              recentPitches.reduce((a, b) => a + b) /
              recentPitches.length;

            const midi =
              69 + 12 * Math.log2(smoothPitch / 440);
            const rounded = Math.round(midi);

            const noteNames = [
              "C",
              "C#",
              "D",
              "D#",
              "E",
              "F",
              "F#",
              "G",
              "G#",
              "A",
              "A#",
              "B",
            ];
            setNote(noteNames[rounded % 12]);

            const targetFreq =
              440 * Math.pow(2, (rounded - 69) / 12);
            const diffCents =
              1200 *
              Math.log2(smoothPitch / targetFreq);
            setCents(diffCents);
          }

          animationId = requestAnimationFrame(updatePitch);
        };

        updatePitch();
      } catch (err) {
        console.error("Tuner error:", err);
      }
    };

    init();

    return () => cancelAnimationFrame(animationId);
  }, []);

  const ABS = cents ? Math.abs(cents) : 0;
  const barWidth = cents
    ? Math.min(50, Math.max(-50, cents))
    : 0;

  // Color scale
  let color = "bg-red-500";
  if (ABS < 5) color = "bg-green-400";
  else if (ABS < 15) color = "bg-yellow-400";
  else if (ABS < 30) color = "bg-orange-500";
  else color = "bg-red-600";

  return (
    <div className="flex flex-col items-center text-matrix-green">
      <p className="text-4xl font-bold text-neon-green">
        {note}
      </p>

      {/* New tuner bar */}
      <div className="w-full bg-black/40 h-3 rounded mt-2 relative overflow-hidden border border-matrix-green/50">

        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white/40"></div>

        {/* Moving indicator */}
        <div
          className={`h-full transition-all ${color}`}
          style={{
            width: `${Math.abs(barWidth)}%`,
            marginLeft:
              barWidth > 0
                ? "50%"
                : `${50 + barWidth}%`,
          }}
        ></div>
      </div>

      <p className="text-xs mt-1 opacity-70">
        {cents ? `${cents.toFixed(1)} cents` : "-"}
      </p>
    </div>
  );
};

// ------------------- TaskItem -------------------
const TaskItem: React.FC<{ task: ProgressItem }> = ({
  task,
}) => {
  const statusColors = {
    Completed: "text-matrix-green",
    "In Progress": "text-yellow-400",
    "Not Started": "text-red-500",
  };

  const status = task.item_status || "Not Started";

  const resourceLinks =
    Array.isArray(task.resource_links)
      ? task.resource_links
      : [];

  return (
    <li className="flex flex-col p-3 bg-matrix-dark/70 rounded-md border border-matrix-green/20">
      <div className="flex-1 pr-4">
        <p className="font-bold text-matrix-green">
          {task.category}:{" "}
          <span className="font-normal text-white">
            {task.detail}
          </span>
        </p>

        {resourceLinks.length > 0 && (
          <div className="mt-2 space-y-1">
            {resourceLinks.map((link: any, i: number) => {
              const url =
                typeof link === "string"
                  ? link
                  : link.url;
              return (
                <ResourceLink key={i} url={url} />
              );
            })}
          </div>
        )}
      </div>

      <div
        className={`mt-2 font-mono text-sm flex items-center gap-2 ${statusColors[status]}`}
      >
        <span>●</span>
        <span>{status}</span>
      </div>
    </li>
  );
};

// ------------------- GradeSection -------------------
const GradeSection: React.FC<{
  grade: string;
  tasks: ProgressItem[];
  isCurrent: boolean;
}> = ({ grade, tasks, isCurrent }) => {
  const [isOpen, setIsOpen] = useState(isCurrent);

  const total = tasks.length;
  const completed = tasks.filter(
    (t) => t.item_status === "Completed"
  ).length;

  const percent =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="border border-matrix-green/40 rounded-lg">
      <button
        className="w-full flex justify-between p-4 bg-matrix-dark-accent hover:bg-matrix-dark transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <h3 className="text-xl text-matrix-green">
            {grade}
          </h3>
          {isCurrent && (
            <p className="text-xs text-matrix-green/70">
              Current
            </p>
          )}
        </div>

        <ChevronDownIcon
          className={`w-6 h-6 text-matrix-green transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div className="p-4">
        <ProgressBar
          label={`${completed}/${total} completed`}
          percentage={percent}
        />
      </div>

      {isOpen && (
        <ul className="p-4 pt-0 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-center text-white/60">
              No tasks for this grade.
            </p>
          ) : (
            tasks.map((t, i) => (
              <TaskItem key={i} task={t} />
            ))
          )}
        </ul>
      )}
    </div>
  );
};

// ------------------- Dashboard -------------------
const Dashboard: React.FC<{
  student: Student;
  progressData: ProgressItem[];
  onLogout: () => void;
}> = ({ student, progressData, onLogout }) => {
  if (!progressData.length) {
    return (
      <p className="text-white text-center py-10">
        No progress data found.
      </p>
    );
  }

  // FIX: Normalize grades (handles char arrays)
  const normalizeGrade = (g: any) => {
    if (!g) return null;
    if (typeof g === "string") return g.trim();
    if (Array.isArray(g)) return g.join("").trim();
    return String(g).trim();
  };

  const gradesMap: Record<string, ProgressItem[]> = {};
  progressData.forEach((t) => {
    if (!gradesMap[t.grade]) gradesMap[t.grade] = [];
    gradesMap[t.grade].push(t);
  });

  const previousGrades = (student.previous_grades as any[]) || [];
  const grades = [
    normalizeGrade(student.current_grade),
    ...previousGrades.map(normalizeGrade),
  ].filter(Boolean);

  return (
    <ErrorBoundary>
      <div
        className="min-h-screen py-8 px-4 flex justify-center items-start"
        style={{
          backgroundImage:
            'url("https://raw.githubusercontent.com/MJTGuitar/site-assets/06a843085b182ea664ac4547aca8948d0f4e4886/Guitar%20Background.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="w-full max-w-4xl bg-matrix-dark-accent/90 p-6 border border-matrix-green/50 rounded-lg backdrop-blur">
          {/* Transparent header image */}
          <div className="flex justify-center mb-6">
            <img
              src="/images/lavalogo.gif"
              className="w-40 h-40 object-contain"
              alt="Logo"
            />
          </div>

          {/* Header */}
          <header className="flex justify-between items-center pb-4 border-b border-matrix-green/70 mb-6">
            <div>
              <h1 className="text-3xl text-white font-bold">
                Student Dashboard
              </h1>
              <p className="text-white">
                Welcome, {student.student_name}!
              </p>
            </div>

            <button
              onClick={onLogout}
              className="px-4 py-2 border border-red-500/70 text-red-400 rounded hover:bg-red-500/10"
            >
              <LogoutIcon className="inline w-4 h-4 mr-1" />
              Logout
            </button>
          </header>

          {/* Tools row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-black/40 p-4 border border-matrix-green/50 rounded-lg">
              <h3 className="text-white text-center mb-2 font-bold">
                Tuner
              </h3>
              <NeonTuner />
            </div>
          </div>

          {/* Grade sections */}
          <div className="space-y-6">
            {grades.map((g) => (
              <GradeSection
                key={g}
                grade={g as string}
                tasks={gradesMap[g as string] || []}
                isCurrent={g === student.current_grade}
              />
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
