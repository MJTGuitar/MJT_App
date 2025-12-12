import React, { useState, useEffect, useRef } from "react";
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
      return <div className="text-red-500 p-4">Something went wrong.</div>;
    }
    return this.props.children;
  }
}

// ------------------- ResourceLink -------------------
const ResourceLink: React.FC<{ url: string }> = ({ url }) => {
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const cacheKey = `title_${url}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setTitle(cached);
      return;
    }

    const fetchTitle = async () => {
      try {
        let fetchedTitle = url;
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
          const res = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
          );
          const data = await res.json();
          fetchedTitle = data.title || url;
        } else if (url.includes("docs.google.com")) {
          const res = await fetch(url);
          const html = await res.text();
          const match = html.match(/<title>(.*?)<\/title>/i);
          if (match) fetchedTitle = match[1].replace(" - Google Docs", "").trim();
        }
        if (mounted) {
          setTitle(fetchedTitle);
          sessionStorage.setItem(cacheKey, fetchedTitle);
        }
      } catch {}
    };
    fetchTitle();

    return () => {
      mounted = false;
    };
  }, [url]);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-cyan-400 hover:underline break-all"
    >
      {title || url}
    </a>
  );
};

// ------------------- NeonTuner -------------------
const NeonTuner: React.FC = () => {
  const [note, setNote] = useState("-");
  const [cents, setCents] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const pitchBuffer = useRef<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Float32Array;
    let detector: any;
    let animationId: number;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        dataArray = new Float32Array(analyser.fftSize);
        source.connect(analyser);

        detector = PitchDetector.forFloat32Array(analyser.fftSize);

        const updatePitch = () => {
          analyser.getFloatTimeDomainData(dataArray);
          const rms = Math.sqrt(dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length);

          if (rms < 0.004) {
            setNote("-");
            setCents(null);
          } else {
            const [pitch] = detector.findPitch(dataArray, audioContext.sampleRate);
            if (pitch && pitch > 0) {
              pitchBuffer.current.push(pitch);
              if (pitchBuffer.current.length > 8) pitchBuffer.current.shift();
              const avgPitch =
                pitchBuffer.current.reduce((a, b) => a + b, 0) / pitchBuffer.current.length;

              const midi = 69 + 12 * Math.log2(avgPitch / 440);
              const rounded = Math.round(midi);
              const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
              setNote(noteNames[rounded % 12]);

              const targetFreq = 440 * Math.pow(2, (rounded - 69) / 12);
              const diffCents = 1200 * Math.log2(avgPitch / targetFreq);
              setCents(Math.abs(diffCents) < 5 ? 0 : diffCents);
            }
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
  }, [isOpen]);

  const barColor =
    cents === null ? "bg-orange-500" : Math.abs(cents) <= 5 ? "bg-green-400" : "bg-red-500";

  const barWidth = Math.max(-50, Math.min(50, cents || 0));

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 px-4 bg-green-500 text-black rounded mb-2"
      >
        {isOpen ? "Hide Tuner" : "Show Tuner"}
      </button>

      {isOpen && (
        <div className="flex flex-col items-center w-full p-2 bg-black/40 rounded-lg border border-green-500/50">
          <p className="text-4xl font-bold text-neon-green">{note}</p>
          <div className="relative w-full h-4 bg-black/20 rounded overflow-hidden mt-1">
            <div
              className={`absolute h-full ${barColor} transition-all`}
              style={{
                width: `${Math.abs(barWidth)}%`,
                left: barWidth > 0 ? "50%" : `${50 + barWidth}%`,
              }}
            />
          </div>
          <p className="text-xs mt-1 opacity-70">{cents ? `${cents.toFixed(1)} cents` : "-"}</p>
        </div>
      )}
    </div>
  );
};

// ------------------- TaskItem -------------------
const TaskItem: React.FC<{ task: ProgressItem }> = ({ task }) => {
  const statusColors = {
    Completed: "text-green-500",
    "In Progress": "text-yellow-400",
    "Not Started": "text-red-500",
  };
  const status = task.item_status || "Not Started";

  return (
    <li className="flex flex-col p-3 bg-black/70 rounded-md border border-green-500/20">
      <div className="flex justify-between items-start">
        <p className="font-bold text-green-500 flex-1">
          {task.category}: <span className="font-normal text-white">{task.detail}</span>
        </p>
        <span className={`font-mono text-sm mt-1 ${statusColors[status]}`}>{status}</span>
      </div>
      {task.resource_links.length > 0 && (
        <div className="mt-2 space-y-1">
          {task.resource_links.map((link, i) => (
            <ResourceLink key={i} url={link.url} />
          ))}
        </div>
      )}
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
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="border border-green-500/40 rounded-lg">
      <button
        className="w-full flex justify-between p-4 bg-black/60 hover:bg-black/70 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <h3 className="text-xl text-green-500">{grade}</h3>
          {isCurrent && <p className="text-xs text-green-400/70">Current</p>}
        </div>
        <ChevronDownIcon
          className={`w-6 h-6 text-green-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div className="p-4">
        <ProgressBar label={`${completed}/${total} completed`} percentage={percent} />
      </div>

      {isOpen && (
        <ul className="p-4 pt-0 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-center text-white/60">No tasks for this grade.</p>
          ) : (
            tasks.map((t, i) => <TaskItem key={i} task={t} />)
          )}
        </ul>
      )}
    </div>
  );
};

// ------------------- Dashboard -------------------
const Dashboard: React.FC<{
  student: Student & { previous_grades?: string | string[] };
  progressData: ProgressItem[];
  onLogout: () => void;
}> = ({ student, progressData, onLogout }) => {
  if (!progressData.length) {
    return <p className="text-white text-center py-10">No progress data found.</p>;
  }

  const normalizeGrade = (g: string) => g?.trim();

  const gradesMap: Record<string, ProgressItem[]> = {};
  progressData.forEach((t) => {
    const g = normalizeGrade(t.grade);
    if (!gradesMap[g]) gradesMap[g] = [];
    gradesMap[g].push(t);
  });

  const prevGrades: string[] = Array.isArray(student.previous_grades)
    ? student.previous_grades.map(normalizeGrade).filter(Boolean)
    : typeof student.previous_grades === "string"
    ? student.previous_grades.split(/[,\n;]/).map(normalizeGrade).filter(Boolean)
    : [];

  const gradeList = [normalizeGrade(student.current_grade), ...prevGrades];

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
        <div className="w-full max-w-4xl bg-black/80 p-6 border border-green-500/50 rounded-lg backdrop-blur">

          {/* Logo & Header Left-Aligned */}
          <div className="flex items-start mb-2 gap-2">
            <img
              src="/images/logo.png"
              alt="MJT Guitar Tuition"
              className="w-24 h-24 object-contain neon-glow-flicker"
            />
            <div className="flex flex-col justify-start">
              <h1 className="text-3xl text-neon-green font-bold neon-glow-flicker">Student Dashboard</h1>
              <p className="text-white/80 text-sm mt-0">{student.student_name}</p>
            </div>
          </div>

          {/* Logout Button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={onLogout}
              className="px-4 py-2 border border-red-500/70 text-red-400 rounded hover:bg-red-500/10"
            >
              <LogoutIcon className="inline w-4 h-4 mr-1" /> Logout
            </button>
          </div>

          {/* Tools */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center mb-8">
            <NeonTuner />
          </div>

          {/* Grades */}
          <div className="space-y-6">
            {gradeList.map((g) => (
              <GradeSection
                key={g}
                grade={g}
                tasks={gradesMap[g] || []}
                isCurrent={g === normalizeGrade(student.current_grade)}
              />
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
