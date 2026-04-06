'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = { meta: '#1877f2', google: '#ea4335', manual: '#6b7280' };
const LABELS = { meta: 'Meta', google: 'Google', manual: 'Manual' };

export default function LeadsByPlatformChart({ data = [] }) {
  const formatted = data.map((d) => ({
    platform: LABELS[d.platform] || d.platform,
    count: d.count,
    color: COLORS[d.platform] || '#6b7280',
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="platform" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
          formatter={(value) => [value, 'Leads']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {formatted.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
