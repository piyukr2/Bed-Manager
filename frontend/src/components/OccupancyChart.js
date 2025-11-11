import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

function OccupancyChart({ stats }) {
  const data = [
    { name: 'Occupied', value: stats.occupied, color: '#ef4444' },
    { name: 'Available', value: stats.available, color: '#10b981' },
    { name: 'Cleaning', value: stats.cleaning, color: '#f59e0b' },
    { name: 'Reserved', value: stats.reserved, color: '#6366f1' },
  ];

  const COLORS = data.map(d => d.color);

  return (
    <div className="occupancy-chart-container">
      <h3>Bed Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OccupancyChart;