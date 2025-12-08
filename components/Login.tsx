import React, { useState } from "react";
import api from "../services/api";
import { Students, Progress } from "../types";

interface LoginProps {
  onLoginSuccess: (student: Students, progress: Progress[]) => void;
}

const backgroundStyle: React.CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  backgroundImage:
    'url("https://raw.githubusercontent.com/MJTGuitar/site-assets/06a843085b182ea664ac4547aca8948d0f4e4886/Guitar%20Background.png")',
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "cover",
};

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await api.verifyLogin(email, password); // now posts to /api/login
      setIsLoading(false);

      if (result) {
        // result contains both student and progress
        onLoginSuccess(result.student, result.progress);
      } else {
        setError("Access Denied. Invalid credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setIsLoading(false);
      setError("An error occurred. Please try again.");

    }
  };

  return (
    <div
      style={backgroundStyle}
      className="min-h-screen w-full flex justify-center items-start lg:items-center p-4"
    >
      <div className="w-full max-w-md p-8 space-y-6 bg-white border border-gray-800 rounded-2xl shadow-2xl shadow-white/50">
        <div className="flex flex-col items-center text-center">
          <img
            src="https://raw.githubusercontent.com/MJTGuitar/site-assets/main/MJT%20smaller.png"
            alt="Logo"
            className="w-auto h-20 max-w-full mb-6"
          />
          <h2 className="text-3xl font-bold tracking-tight text-black">
            Student Login
          </h2>
          <p className="mt-2 text-sm text-black">Check Your Guitar Progress</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-matrix-black bg-matrix-dark border border-matrix-black/30 rounded-md focus:ring-matrix-black focus:border-matrix-black placeholder-black-700/50 mt-1"
              placeholder="student@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black/80">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-matrix-black bg-matrix-dark border border-matrix-black/30 rounded-md focus:ring-matrix-green/30 focus:border-matrix-green/30 placeholder-black-700/50 mt-1"
              placeholder="password123"
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center animate-pulse">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-matrix-dark bg-matrix-green/30 hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-matrix-dark focus:ring-matrix-green/30 disabled:bg-green-800 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Verifying..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
