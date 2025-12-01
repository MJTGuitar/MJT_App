import React, { useEffect, useState } from "react";
import ProgressBar from "./ProgressBar";

const Dashboard: React.FC = () => {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/sheet");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error loading sheet:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Dashboard</h2>

      {/* Example: fixed or dynamic */}
      <ProgressBar progress={50} />

      <table>
        <thead>
          <tr>
            {data[0]?.map((h, i) => <th key={i}>{h}</th>)}
          </tr>
        </thead>

        <tbody>
          {data.slice(1).map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
