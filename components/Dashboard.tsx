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
  const [title, setTitle] = useState<string>(url);

  useEffect(() => {
    let mounted = true;

    const fetchTitle = async () => {
      try {
        let fetchedTitle = url;
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
          const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
            url
          )}&format=json`;
          const res = await fetch(oembedUrl);
          const contentType = res.headers.get("content-type");
          if (res.ok && contentType?.includes("application/json")) {
            const data = await res.json();
            fetchedTitle = data.title || url;
          }
        } else if (url.includes("docs.google.com")) {
          const res = await fetch(url);
          const html = await res.text();
          const match = html.match(/<title>(.*?)<\/title>/i);
          fetchedTitle = match ? match[1].replace(" - Google Docs", "").trim() : url;
        }
        if (mounted) setTitle(fetchedTitle);
        sessionStorage.setItem(`link_title_${url}`, fetchedTitle);
      } catch {}
    };

    const cached = sessionStorage.getItem(`link_title_${url}`);
    if (cached) setTitle(cached);
    else fetchTitle();

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
      {title}
    </a>
  );
};

// ------------------- NeonTunerDial -------------------
const NeonTunerDial: React.FC = () => {
  const [note, setNote] = useState("-");
  const [cents, setCents] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const pitchBuffer = useRef<number[]>([]);

  useEffect(() => {
    if (!open) return;

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
          const rms =
            Math.sqrt(dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length);

          if (rms < 0.003) {
            setNote("-");
            setCents(null);
          } else {
            const [pitch] = detector.findPitch(dataArray, audioContext.sampleRate);
            if (pitch && pitch > 0) {
              pitchBuffer.current.push(pitch);
              if (pitchBuffer.current.length > 6) pitchBuffer.current.shift();
              const avgPitch =
                pitchBuffer.current.reduce((a, b) => a + b, 0) / pitchBuffer.current.length;

              const midi = 69 + 12 * Math.log2(avgPitch / 440);
              const rounded = Math.round(midi);
              const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
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

      return () => cancelAnimationFrame(animationId);
    };

    init();
  }, [open]);

  const angle = cents ? Math.max(-50, Math.min(50, cents)) * 1.8 : 0;
  const needleColor =
    cents === null
      ? "#FFA500"
      : Math.abs(cents) <= 5
      ? "#00FF00"
      : Math.abs(cents) < 25
      ? "#FFA500"
      : "#FF0000";

  return (
    <div className="w-full flex flex-col items-center">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-2 px-4 bg-green-500 text-black rounded mb-2"
      >
        {open ? "Hide Tuner" : "Show Tuner"}
      </button>

      {open && (
        <div className="flex flex-col items-center bg-black/40 p-4 rounded-lg border border-green-500/50">
          <p className="text-4xl font-bold text-neon-green">{note}</p>

          <svg width="200" height="120">
            <defs>
              <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="orange" />
                <stop offset="25%" stopColor="orange" />
                <stop offset="45%" stopColor="green" />
                <stop offset="55%" stopColor="green" />
                <stop offset="75%" stopColor="orange" />
                <stop offset="100%" stopColor="red" />
              </linearGradient>
            </defs>

            <path
              d="M 10 110 A 90 90 0 0 1 190 110"
              fill="none"
              stroke="url(#dialGradient)"
              strokeWidth="10"
              strokeLinecap="round"
            />

            <line
              x1="100"
              y1="110"
              x2={100 + 90 * Math.cos((Math.PI / 180) * (angle - 90))}
              y2={110 + 90 * Math.sin((Math.PI / 180) * (angle - 90))}
              stroke={needleColor}
              strokeWidth="3"
              strokeLinecap="round"
            />

            <circle cx="100" cy="110" r="4" fill="#00FF00" />
          </svg>

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
const GradeSection: React.FC<{ grade: string; tasks: ProgressItem[]; isCurrent: boolean }> = ({ grade, tasks, isCurrent }) => {
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
        <ChevronDownIcon className={`w-6 h-6 text-green-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <div className="p-4">
        <ProgressBar label={`${completed}/${total} completed`} percentage={percent} />
      </div>

      {isOpen && (
        <ul className="p-4 pt-0 space-y-2">
          {tasks.length === 0
            ? <p className="text-center text-white/60">No tasks for this grade.</p>
            : tasks.map((t, i) => <TaskItem key={i} task={t} />)
          }
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
  if (!progressData.length) return <p className="text-white text-center py-10">No progress data found.</p>;

  const normalizeGrade = (grade?: string) => grade?.toString().trim().replace(/\s+/g, " ");

  // Build grade -> tasks map
  const gradesMap: Record<string, ProgressItem[]> = {};
  progressData.forEach((task) => {
    const g = normalizeGrade(task.grade);
    if (!g) return;
    if (!gradesMap[g]) gradesMap[g] = [];
    gradesMap[g].push(task);
  });

  // Previous grades as individual array
  let previousGrades: string[] = [];
  if (Array.isArray(student.previous_grades)) previousGrades = student.previous_grades.map(normalizeGrade);
  else if (typeof student.previous_grades === "string")
    previousGrades = student.previous_grades.split(/[,\n;]/).map(normalizeGrade).filter(Boolean);

  const gradeList = Array.from(
  new Set([
    normalizeGrade(student.current_grade),
    ...previousGrades
  ].filter(Boolean))
);

  return (
    <ErrorBoundary>
      <div
        className="min-h-screen py-8 px-4 flex justify-center items-start"
        style={{
          backgroundImage: 'url("https://raw.githubusercontent.com/MJTGuitar/site-assets/06a843085b182ea664ac4547aca8948d0f4e4886/Guitar%20Background.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="w-full max-w-4xl bg-black/80 p-6 border border-green-500/50 rounded-lg backdrop-blur">

          {/* Logo + Header Left-aligned */}
          <div className="flex flex-col items-start mb-2">
            <img src="/images/logo.png" alt="MJT Guitar Tuition"
                 className="w-64 h-32 object-contain neon-glow-pulse opacity-80 mb-0" />
            <h1 className="text-3xl text-green-500 font-bold">Student Dashboard</h1>
            <p className="text-green-400">Welcome, {student.student_name}!</p>
          </div>

          {/* Next Lesson Box */}
          <div className="bg-black/50 p-4 rounded-lg border border-green-500/50 mb-4">
            <h3 className="text-green-500 font-bold">Next Lesson</h3>
            <p className="text-white">
              {student.next_lesson_date} at {student.next_lesson_time} ({student.next_lesson_length})
            </p>
          </div>

          {/* Tools */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <NeonTunerDial />
          </div>

          {/* Grades */}
          <div className="space-y-6">
            {gradeList.map((grade) => (
              <GradeSection key={grade} grade={grade} tasks={gradesMap[grade] || []} isCurrent={grade === normalizeGrade(student.current_grade)} />
            ))}
          </div>

          {/* Logout */}
          <div className="flex justify-end mt-6">
            <button onClick={onLogout} className="px-4 py-2 border border-red-500/70 text-red-400 rounded hover:bg-red-500/10">
              <LogoutIcon className="inline w-4 h-4 mr-1" /> Logout
            </button>
          </div>

        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
