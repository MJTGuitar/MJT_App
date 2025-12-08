import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom"; // if using react-router
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { type Students, type Progress } from "./types";

const App: React.FC = () => {
  const [student, setStudent] = useState<Students | null>(null);
  const [progressData, setProgressData] = useState<Progress[]>([]);

  useEffect(() => {
    // Optional: restore session
    const storedStudent = sessionStorage.getItem("student");
    const storedProgress = sessionStorage.getItem("progress");
    if (storedStudent && storedProgress) {
      setStudent(JSON.parse(storedStudent));
      setProgressData(JSON.parse(storedProgress));
    }
  }, []);

  const handleLoginSuccess = (s: Students, p: Progress[]) => {
    sessionStorage.setItem("student", JSON.stringify(loggedInStudent));
    sessionStorage.setItem("progress", JSON.stringify(progress));
    setStudent(s);
    setProgressData(p);
  };

  const handleLogout = () => {
    setStudent(null);
    setProgressData([]);
  };

  return (
    <div className="min-h-screen bg-matrix-dark p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl animate-fade-in">
        {student ? (
          <Dashboard
            student={student}
            progressData={progressData}
            onLogout={handleLogout}
          />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </div>
    </div>
  );
};

export default App;
