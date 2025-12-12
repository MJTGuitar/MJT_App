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
      fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(
          url
        )}&format=json`
      )
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
  const pitchBuffer = useRef<number[]>([]);

  const startTuner = async () => {
    setStarted(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const dataArray = new Float32Array(analyser.fftSize);
      source.connect(analyser);
      const detector = PitchDetector.forFloat32Array(analyser.fftSize);

      const updatePitch = () => {
        analyser.getFloatTimeDomainData(dataArray);

        // RMS volume for noise gate
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length);
        if (rms < 0.02) {
          setNote("-");
          setCents(null);
          requestAnimationFrame(updatePitch);
          return;
        }

        const [pitch] = detector.findPitch(dataArray, audioContext.sampleRate);
        if (pitch && pitch > 0) {
          const midi = 69 + 12 * Math.log2(pitch / 440);
          const rounded = Math.round(midi);
          const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
          setNote(noteNames[rounded % 12]);

          const targetFreq = 440 * Math.pow(2, (rounded - 69) / 12);
          const diffCents = 1200 * Math.log2(pitch / targetFreq);

          // smooth over last 6 readings
          pitchBuffer.current.push(diffCents);
          if (pitchBuffer.current.length > 6) pitchBuffer.current.shift();
          const avgCents = pitchBuffer.current.reduce((a,b)=>a+b,0)/pitchBuffer.current.length;

          setCents(Math.abs(avgCents)<5 ? 0 : avgCents);
        }

        requestAnimationFrame(updatePitch);
      };
      updatePitch();
    } catch (err) {
      console.error("Tuner error:", err);
    }
  };

  const maxCents = 50;
  const needleAngle = cents
    ? Math.max(-maxCents, Math.min(maxCents, cents)) / maxCents * 90
    : 0;

  const getZoneColor = (angle: number) => {
    if (Math.abs(angle) < 10) return "bg-gradient-to-r from-green-400 via-green-500 to-green-600";
    if (Math.abs(angle) < 25) return "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600";
    return "bg-gradient-to-r from-red-500 via-red-600 to-red-700";
  };

  return (
    <div className="flex flex-col items-center w-full mt-2">
      {!started ? (
        <button
          onClick={startTuner}
          className="px-4 py-2 bg-green-500 text-black rounded"
        >
          Start Tuner
        </button>
      ) : (
        <>
          <p className="text-4xl font-bold text-neon-green">{note}</p>
          <div className="relative w-[200px] h-[100px] mt-2">
            <div className={`absolute bottom-0 left-0 w-full h-full rounded-t-full overflow-hidden`}>
              <div
                className={`absolute w-full h-full ${getZoneColor(needleAngle)}`}
                style={{ transform: "translateY(50%)", borderRadius: "50% 50% 0 0" }}
              />
              <div
                className="absolute bottom-0 left-1/2 w-0.5 h-full bg-white origin-bottom transition-transform"
                style={{ transform: `translateX(-50%) rotate(${needleAngle}deg)` }}
              />
            </div>
          </div>
          <p className="text-xs mt-1 opacity-70">
            {cents ? `${cents.toFixed(1)} cents` : "-"}
          </p>
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

  const gradesMap: Record<string, ProgressItem[]> = {};
  progressData.forEach((task) => {
    const g = normalizeGrade(task.grade);
    if (!gradesMap[g]) gradesMap[g] = [];
    gradesMap[g].push(task);
  });

  // split previous grades
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
        <div className="w-full max-w-5xl bg-black/80 p-6 border border-green-500/50 rounded-lg backdrop-blur flex flex-col">
          {/* Logo + Header */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/images/logo.png"
              alt="MJT Guitar Tuition"
              className="w-64 h-64 object-contain neon-glow-pulse opacity-70 mb-2"
            />
            <h1 className="text-3xl text-white font-bold">Student Dashboard</h1>
            <p className="text-white mt-1">Welcome, {student.student_name}!</p>
          </div>

          <div className="flex justify-end mb-6">
            <button
              onClick={onLogout}
              className="px-4 py-2 border border-red-500/70 text-red-400 rounded hover:bg-red-500/10"
            >
              <LogoutIcon className="inline w-4 h-4 mr-1" />
              Logout
            </button>
          </div>

          {/* Tuner dropdown */}
          <div className="mb-6 w-full max-w-xs mx-auto">
            <details className="bg-black/60 border border-green-500/50 rounded-lg p-3">
              <summary className="cursor-pointer text-green-500 font-bold">Tuner</summary>
              <div className="mt-2">
                <NeonTuner />
              </div>
            </details>
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
    </ErrorBoundary>
  );
};

export default Dashboard;
