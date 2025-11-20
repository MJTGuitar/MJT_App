
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { type Student } from './types';

const App: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    // Check session storage on initial load
    const storedStudentId = sessionStorage.getItem('studentId');
    const storedStudentName = sessionStorage.getItem('studentName');
    if (storedStudentId && storedStudentName) {
      setStudent({ student_id: storedStudentId, student_name: storedStudentName });
    }
  }, []);

  const handleLoginSuccess = (loggedInStudent: Student) => {
    sessionStorage.setItem('studentId', loggedInStudent.student_id);
    sessionStorage.setItem('studentName', loggedInStudent.student_name);
    setStudent(loggedInStudent);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setStudent(null);
  };

  return (
    <div className="min-h-screen bg-matrix-dark p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl animate-fade-in">
        {student ? (
          <Dashboard student={student} onLogout={handleLogout} />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </div>
    </div>
  );
};

export default App;
