import React from 'react';

interface ProgressBarProps {
  label: string;
  percentage: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, percentage }) => {
  const safePercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-matrix-green/80">{label}</span>
        <span className="text-sm font-medium text-matrix-green/80">{Math.round(safePercentage)}%</span>
      </div>
      <div className="w-full bg-matrix-dark border border-matrix-green/30 rounded-full h-2.5">
        <div
          className="bg-matrix-green h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${safePercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
