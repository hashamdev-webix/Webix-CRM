'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

export default function MetricOverTimeChart({ data = [], metric = 'spend', color = '#ef4444', formatter }) {
  const formatted = data.map((d) => ({
    ...d,
    label: (() => { try { return format(parseISO(d.date), 'MMM d'); } catch { return d.date; } })(),
    value: parseFloat(d[metric] || 0),
  }));

  const defaultFormatter = (v) => v?.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.18} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
          tickFormatter={(v) => formatter ? formatter(v) : defaultFormatter(v)} width={55} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
          formatter={(v) => [formatter ? formatter(v) : defaultFormatter(v)]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${metric})`}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
