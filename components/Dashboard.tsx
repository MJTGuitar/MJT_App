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
      return <div className="text-red-500 p-4">Something went wrong.</div>;
    }
    return this.props.children;
  }
}

// ------------------- ResourceLink -------------------
const ResourceLink: React.FC<{ url: string }> = ({ url }) => {
  const [title, setTitle] = useState<string | null>(null);

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

  useEffect(() => {
    let mounted = true;
    const cacheKey = `yt_title_${url}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setTitle(cached);
      return;
    }

    if (isYouTube) {
      fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
        .then((res) => res.json())
        .then((data) => {
          if (mounted && data.title) {
            setTitle(data.title);
            sessionStorage.setItem(cacheKey, data.title);
          }
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [url]);

  const displayText = title || url;

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

// ------------------- NeonTuner -------------------
const NeonTuner: React.FC = () => {
  const [note, setNote] = useState("-");
  const [cents, setCents] = useState<number | null>(null);
  const [started, setStarted] = useState(false);

  const startTuner = async () => {
    setStarted(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();

      if (audioContext.state === "suspended") await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const dataArray = new Float32Array(analyser.fftSize);
      source.connect(analyser);
      const detector = PitchDetector.forFloat32Array(analyser.fftSize);

      const updatePitch = () => {
        analyser.getFloatTimeDomainData(dataArray);
        const [pitch] = detector.findPitch(dataArray, audioContext.sampleRate);

        if (pitch && pitch > 0) {
          const midi = 69 + 12 * Math.log2(pitch / 440);
          const rounded = Math.round(midi);
          const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
          setNote(noteNames[rounded % 12]);

          const targetFreq = 440 * Math.pow(2, (rounded - 69) / 12);
          const diffCents = 1200 * Math.log2(pitch / targetFreq);

          setCents(Math.abs(diffCents) < 5 ? 0 : diffCents); // noise gate ±5 cents
        }

        requestAnimationFrame(updatePitch);
      };

      updatePitch();
    } catch (err) {
      console.error("Tuner error:", err);
      setStarted(false);
    }
  };

  const barColor =
    cents === null
      ? "bg-orange-500"
      : Math.abs(cents) <= 5
      ? "bg-green-500"
      : "bg-red-500";

  const barWidth = Math.max(-50, Math.min(50, cents || 0));

  return (
    <div className="flex flex-col items-center w-full">
      {!started ? (
        <button
          onClick={startTuner}
          className="px-6 py-3 bg-green-500 text-black font-bold rounded-md hover:bg-green-400 transition"
        >
          Start Tuner
        </button>
      ) : (
        <>
          <p className="text-5xl font-extrabold text-neon-green">{note}</p>
          <div className="w-full bg-black/40 h-3 rounded mt-3 relative overflow-hidden border border-green-500/50">
            <div
              className={`h-full transition-all ${barColor}`}
              style={{
                width: `${Math.abs(barWidth)}%`,
                marginLeft: barWidth > 0 ? "50%" : `${50 + barWidth}%`,
              }}
            />
          </div>
          <p className="text-xs mt-1 opacity-70">{cents ? `${cents.toFixed(1)} cents` : "-"}</p>
        </>
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
  student: Student & { previous_grades: string };
  progressData: ProgressItem[];
  onLogout: () => void;
}> = ({ student, progressData, onLogout }) => {
  if (!progressData.length) {
    return <p className="text-white text-center py-10">No progress data found.</p>;
  }

  const normalizeGrade = (grade: string) => grade?.trim();

  // Build map of grade -> tasks
  const gradesMap: Record<string, ProgressItem[]> = {};
  progressData.forEach((task) => {
    const g = normalizeGrade(task.grade);
    if (!gradesMap[g]) gradesMap[g] = [];
    gradesMap[g].push(task);
  });

  // Split previous grades individually
  const previousGrades = student.previous_grades
    ? student.previous_grades.split(/[,\n;]/).map(normalizeGrade).filter(Boolean)
    : [];

  const gradeList = [normalizeGrade(student.current_grade), ...previousGrades];

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
        <div className="w-full max-w-4xl bg-black/80 p-6 border border-green-500/50 rounded-lg backdrop-blur flex items-start">
          {/* Logo */}
          <div className="flex-shrink-0 mr-6">
            <img
              src="/images/logo.png"
              alt="MJT Guitar Tuition"
              className="w-64 h-64 object-contain neon-glow-pulse opacity-70"
            />
          </div>

          {/* Main content */}
          <div className="flex-1">
            {/* Header */}
            <header className="flex justify-between items-center pb-4 border-b border-green-500/70 mb-6">
              <div>
                <h1 className="text-3xl text-white font-bold">Student Dashboard</h1>
                <p className="text-white">Welcome, {student.student_name}!</p>
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 border border-red-500/70 text-red-400 rounded hover:bg-red-500/10"
              >
                <LogoutIcon className="inline w-4 h-4 mr-1" />
                Logout
              </button>
            </header>

            {/* Tuner */}
            <div className="flex justify-center mb-8 w-full">
              <div className="bg-black/40 p-4 border border-green-500/50 rounded-lg max-w-xs w-full flex flex-col items-center">
                <h3 className="text-white text-center mb-2 font-bold">Tuner</h3>
                <NeonTuner />
              </div>
            </div>

            {/* Grade sections */}
            <div className="space-y-6">
              {gradeList.map((grade) => (
                <GradeSection
                  key={grade}
                  grade={grade}
                  tasks={gradesMap[grade] || []}
                  isCurrent={grade === normalizeGrade(student.current_grade)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
