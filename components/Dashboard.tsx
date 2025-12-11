

import React, { useState, useEffect } from 'react';
import { Student, ProgressItem } from '../types';
import ProgressBar from './ProgressBar';
import { LogoutIcon, ChevronDownIcon } from './icons';
import { PitchDetector } from 'pitchy';

// ------------------- ErrorBoundary -------------------
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
  return <>{mounted ? children : null}</>;
};

// ------------------- ClientMetronome -------------------
const ClientMetronome: React.FC<{ bpm?: number }> = ({ bpm = 100 }) => {
  const [Metronome, setMetronome] = useState<any>(null);

  useEffect(() => {
    import('@kevinorriss/react-metronome')
      .then((mod) => setMetronome(() => mod.default))
      .catch((err) => console.error('Metronome import failed:', err));
  }, []);

  if (!Metronome) return <div className="text-white">Loading Metronome...</div>;
  return <Metronome bpm={bpm} />;
};

// ------------------- PitchDetectorSafe -------------------
const PitchDetectorSafe: React.FC = () => {
  const [note, setNote] = useState<string>('-');
  const [frequency, setFrequency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Float32Array;
    let sourceNode: MediaStreamAudioSourceNode;
    let detector: any;
    let animationId: number;

    const startDetector = async () => {
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

        const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

        const updatePitch = () => {
          analyser.getFloatTimeDomainData(dataArray);
          const [pitch] = detector.findPitch(dataArray, audioContext.sampleRate);
          if (pitch) {
            setFrequency(pitch);
            const midi = 69 + 12 * Math.log2(pitch / 440);
            setNote(noteNames[Math.round(midi) % 12]);
          }
          animationId = requestAnimationFrame(updatePitch);
        };

        updatePitch();
      } catch (err) {
        console.error(err);
        setError('Microphone access denied or unsupported.');
      }
    };

    startDetector();

    return () => {
      cancelAnimationFrame(animationId);
      audioContext?.close();
    };
  }, []);

  if (error) return <div className="text-red-500 text-sm">{error}</div>;
  return (
    <div className="text-center text-matrix-green/90">
      <p className="text-lg font-bold">{note}</p>
      <p className="text-sm">{frequency ? frequency.toFixed(1) + ' Hz' : '-'}</p>
    </div>
  );
};

// ------------------- TaskItem -------------------
const TaskItem: React.FC<{ task: ProgressItem }> = ({ task }) => {
  const statusConfig = {
    Completed: { color: 'text-matrix-green/90', icon: '✓' },
    'In Progress': { color: 'text-yellow-400', icon: '...' },
    'Not Started': { color: 'text-red-500', icon: '○' },
  };
  const { color, icon } = statusConfig[task.item_status || 'Not Started'];

  return (
    <li className="flex items-start justify-between p-3 transition-colors bg-matrix-dark/50 hover:bg-matrix-dark rounded-md">
      <div className="flex-1 pr-4">
        <p className="font-bold text-matrix-green/90">{task.category}: <span className="font-normal">{task.detail}</span></p>
        {Array.isArray(task.resource_links) && task.resource_links.map((link, i) => (
          <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline block">{link}</a>
        ))}
      </div>
      <div className={`flex items-center gap-2 font-mono text-sm shrink-0 ${color}`}>
        <span>{icon}</span>
        <span>{task.item_status}</span>
      </div>
    </li>
  );
};

// ------------------- GradeSection -------------------
const GradeSection: React.FC<{ grade: string; tasks: ProgressItem[]; isCurrent: boolean }> = ({ grade, tasks, isCurrent }) => {
  const [isOpen, setIsOpen] = useState(isCurrent);
  const total = tasks.length;
  const completed = tasks.filter(t => t.item_status === 'Completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="border border-matrix-green/30 rounded-lg overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left flex justify-between items-center p-4 bg-matrix-dark-accent hover:bg-matrix-dark/50 transition-colors">
        <div>
          <h3 className="text-xl font-bold text-matrix-green/80">{grade}</h3>
          {isCurrent && <span className="text-xs text-matrix-green/80 uppercase tracking-widest">Current</span>}
        </div>
        <ChevronDownIcon className={`w-6 h-6 text-matrix-green/80 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className="p-4 bg-matrix-dark-accent/50">
        <ProgressBar label={`${completed}/${total} Tasks Completed`} percentage={percentage} />
      </div>
      {isOpen && (
        <div className="p-4 border-t border-matrix-green/10">
          <ul className="space-y-2">
            {tasks.length ? tasks.map((task,i) => <TaskItem key={i} task={task} />) : <p className="text-center text-green/80 py-4">No tasks</p>}
          </ul>
        </div>
      )}
    </div>
  );
};

// ------------------- Dashboard -------------------
interface DashboardProps {
  student: Student;
  progressData: ProgressItem[];
  onLogout: () => void;
}

const parsePreviousGrades = (raw: string | string[] | null | undefined) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(g => g.trim()).filter(Boolean);
  return raw.split(/[,;\n]/).map(g => g.trim()).filter(Boolean);
};

const Dashboard: React.FC<DashboardProps> = ({ student, progressData, onLogout }) => {
  const progressByGrade: { [grade: string]: ProgressItem[] } = {};
  progressData.forEach(t => { if (!progressByGrade[t.grade]) progressByGrade[t.grade] = []; progressByGrade[t.grade].push(t); });
  const previousGrades = parsePreviousGrades((student as any).previous_grades);
  const grades = [student.current_grade, ...previousGrades].filter(Boolean);

  // Next lesson
  let nextLessonText = '';
  if (student.next_lesson_date && student.next_lesson_time && student.next_lesson_length) {
    const [y,m,d] = student.next_lesson_date.split('-').map(Number);
    const [h,min] = student.next_lesson_time.split(':').map(Number);
    const dt = new Date(y,m-1,d,h,min);
    if (!isNaN(dt.getTime())) {
      const options: Intl.DateTimeFormatOptions = { weekday:'long', month:'short', day:'numeric'};
      const formattedDate = dt.toLocaleDateString(undefined, options);
      const formattedTime = dt.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
      nextLessonText = `${formattedDate} at ${formattedTime} (${student.next_lesson_length})`;
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full flex justify-center items-start lg:items-center p-4 sm:p-9" style={{backgroundImage:'url("https://raw.githubusercontent.com/MJTGuitar/site-assets/06a843085b182ea664ac4547aca8948d0f4e4886/Guitar%20Background.png")',backgroundRepeat:'no-repeat',backgroundPosition:'center',backgroundSize:'cover'}}>
        <div className="w-full max-w-4xl p-4 sm:p-6 bg-matrix-dark-accent/90 backdrop-blur-md border border-matrix-green/50 rounded-lg shadow-lg shadow-matrix-green/90">

          {/* Header and Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-28 sm:w-36 h-28 sm:h-36 rounded-full border-4 border-matrix-green/50 shadow-lg shadow-matrix-green/80 overflow-hidden hover:scale-105 transition-transform" style={{backgroundImage:'url(/images/lavalogo.gif)',backgroundSize:'cover',backgroundPosition:'center'}} />
          </div>
          <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-matrix-green/90 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Student Dashboard</h1>
              <p className="text-white">Welcome, {student.student_name}!</p>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-transparent border border-red-500/50 rounded-md hover:bg-red-500/10 hover:text-red-300 transition-colors">
              <LogoutIcon className="w-4 h-4" /> Logout
            </button>
          </header>

          {/* Next Lesson */}
          {nextLessonText && (
            <div className="mb-6 p-4 w-full bg-matrix-dark/70 border border-matrix-green/30 rounded-lg shadow-md">
              <p className="text-white text-lg text-center font-semibold">Next Lesson: {nextLessonText}</p>
            </div>
          )}

          {/* Tuner and Metronome */}
          <ClientOnly>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 bg-matrix-green/80 p-4 rounded-lg shadow-lg border border-matrix-green/50 flex flex-col items-center justify-center min-h-[150px]">
                <h3 className="text-white font-bold text-center mb-2">Tuner</h3>
                <PitchDetectorSafe />
              </div>
              <div className="flex-1 bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-lg shadow-lg border border-matrix-green/50 flex flex-col items-center justify-center min-h-[150px]">
                <h3 className="text-white font-bold text-center mb-2">Metronome</h3>
                <ClientMetronome bpm={100} />
              </div>
            </div>
          </ClientOnly>

          {/* Grades */}
          <main className="space-y-6">
            {grades.map(g => <GradeSection key={g} grade={g} tasks={progressByGrade[g] || []} isCurrent={g === student.current_grade} />)}
          </main>

        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;