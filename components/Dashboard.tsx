import React, { useState, useEffect, useRef } from "react";
import { Student, ProgressItem } from "../types";
import ProgressBar from "./ProgressBar";
import { LogoutIcon, ChevronDownIcon } from "./icons";
import { PitchDetector } from "pitchy";

/* ---------------- Error Boundary ---------------- */
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
    console.error("Dashboard error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-red-500 p-4">Something went wrong.</div>;
    }
    return this.props.children;
  }
}

/* ---------------- Helpers ---------------- */
const normalizeGrade = (grade?: string) =>
  grade
    ?.toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ") || null;

/* ---------------- Resource Link ---------------- */
const ResourceLink: React.FC<{ url: string }> = ({ url }) => {
  const [title, setTitle] = useState(url);

  useEffect(() => {
    const cached = sessionStorage.getItem(`link_${url}`);
    if (cached) {
      setTitle(cached);
      return;
    }

    const fetchTitle = async () => {
      try {
        let fetched = url;

        if (url.includes("youtube")) {
          const res = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
          );
          if (res.ok) fetched = (await res.json()).title || url;
        }

        setTitle(fetched);
        sessionStorage.setItem(`link_${url}`, fetched);
      } catch {
        setTitle(url);
      }
    };

    fetchTitle();
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

/* ---------------- Tuner ---------------- */
const NeonTunerDial: React.FC = () => {
  const [note, setNote] = useState("-");
  const [cents, setCents] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const buffer = useRef<number[]>([]);

  useEffect(() => {
    if (!open) return;

    let ctx: AudioContext;
    let analyser: AnalyserNode;
    let data: Float32Array;
    let detector: any;
    let raf: number;

    const start = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      ctx = new AudioContext();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      data = new Float32Array(analyser.fftSize);

      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);

      detector = PitchDetector.forFloat32Array(analyser.fftSize);

      const loop = () => {
        analyser.getFloatTimeDomainData(data);
        const rms = Math.sqrt(
          data.reduce((s, v) => s + v * v, 0) / data.length
        );

        if (rms < 0.35) {
          setNote("-");
          setCents(null);
        } else {
          const [pitch] = detector.findPitch(data, ctx.sampleRate);
          if (pitch) {
            buffer.current.push(pitch);
            if (buffer.current.length > 15) buffer.current.shift();

            const sorted = [...buffer.current].sort((a, b) => a - b);
            const stable = sorted[Math.floor(sorted.length / 2)];

            const midi = 69 + 12 * Math.log2(stable / 440);
            const rounded = Math.round(midi);
            const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

            setNote(notes[(rounded + 120) % 12]);

            const target = 440 * Math.pow(2, (rounded - 69) / 12);
            setCents(1200 * Math.log2(stable / target));
          }
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
    };

    start();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return (
    <div className="w-full flex flex-col items-center">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-2 px-4 bg-green-500 text-black rounded mb-2"
      >
        {open ? "Hide Tuner" : "Show Tuner"}
      </button>
      {open && <p className="text-4xl text-green-500">{note}</p>}
    </div>
  );
};

/* ---------------- Task Item ---------------- */
const TaskItem: React.FC<{ task: ProgressItem }> = ({ task }) => {
  const status = task.item_status || "Not Started";
  const colors: any = {
    Completed: "text-green-500",
    "In Progress": "text-yellow-400",
    "Not Started": "text-red-500",
  };

  return (
    <li className="p-3 bg-black/70 rounded border border-green-500/20">
      <div className="flex justify-between">
        <p className="text-green-500 font-bold">
          {task.category}: <span className="text-white">{task.detail}</span>
        </p>
        <span className={`text-sm ${colors[status]}`}>{status}</span>
      </div>
      {task.resource_links?.length > 0 && (
        <div className="mt-2 space-y-1">
          {task.resource_links.map((l, i) => (
            <ResourceLink key={i} url={l.url} />
          ))}
        </div>
      )}
    </li>
  );
};

/* ---------------- Grade Section ---------------- */
const GradeSection: React.FC<{
  grade: string;
  tasks: ProgressItem[];
  current: boolean;
}> = ({ grade, tasks, current }) => {
  const [open, setOpen] = useState(current);
  const completed = tasks.filter(t => t.item_status === "Completed").length;

  return (
    <div className="border border-green-500/40 rounded">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex justify-between bg-black/60"
      >
        <div>
          <h3 className="text-green-500 text-xl capitalize">{grade}</h3>
          {current && <p className="text-xs text-green-400">Current</p>}
        </div>
        <ChevronDownIcon
          className={`w-6 h-6 text-green-500 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div className="p-4">
        <ProgressBar
          label={`${completed}/${tasks.length} completed`}
          percentage={tasks.length ? Math.round((completed / tasks.length) * 100) : 0}
        />
      </div>

      {open && (
        <ul className="p-4 pt-0 space-y-2">
          {tasks.map((t, i) => <TaskItem key={i} task={t} />)}
        </ul>
      )}
    </div>
  );
};

/* ---------------- Dashboard ---------------- */
const Dashboard: React.FC<{
  student: Student;
  progressData: ProgressItem[];
  onLogout: () => void;
}> = ({ student, progressData, onLogout }) => {

  /* Build grade → tasks map safely */
  const gradesMap: Record<string, ProgressItem[]> = {};
  progressData.forEach(task => {
    const g = normalizeGrade(task.grade);
    if (!g) return;
    if (!gradesMap[g]) gradesMap[g] = [];
    gradesMap[g].push(task);
  });

  const gradeList = Array.from(
    new Set([
      normalizeGrade(student.current_grade),
      ...(Array.isArray(student.previous_grades)
        ? student.previous_grades.map(normalizeGrade)
        : [])
    ].filter(Boolean))
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-6 bg-cover bg-center">
        <div className="max-w-4xl mx-auto bg-black/80 p-6 rounded border border-green-500/50">
          <h1 className="text-3xl text-green-500">Welcome, {student.student_name}</h1>

          <NeonTunerDial />

          <div className="space-y-6 mt-6">
            {gradeList.map(g => (
              <GradeSection
                key={g}
                grade={g}
                tasks={gradesMap[g] || []}
                current={g === normalizeGrade(student.current_grade)}
              />
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onLogout}
              className="text-red-400 border border-red-500 px-4 py-2 rounded"
            >
              <LogoutIcon className="inline w-4 h-4 mr-1" /> Logout
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
