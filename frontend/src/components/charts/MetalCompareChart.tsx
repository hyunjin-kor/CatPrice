import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLang } from '../../lib/i18n';

export type CompareSeries = {
  symbol: string;
  color: string;
  points: Array<{ date: string; price: number }>;
};

// Overlay chart for relative performance: every series is rebased to 100 at
// its first point inside the window so metals with very different absolute
// prices ($30/ozt silver vs $5,000/ozt rhodium) stay comparable.
export default function MetalCompareChart({ series }: { series: CompareSeries[] }) {
  const { lang } = useLang();
  const byDate = new Map<string, Record<string, number | string>>();
  for (const entry of series) {
    const base = entry.points[0]?.price;
    if (!base) continue;
    for (const point of entry.points) {
      const row = byDate.get(point.date) ?? { date: point.date };
      row[entry.symbol] = (point.price / base) * 100;
      byDate.set(point.date, row);
    }
  }
  const data = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgba(25,31,40,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#8b95a1', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) =>
            new Date(String(value)).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
          }
        />
        <YAxis
          tick={{ fill: '#8b95a1', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
          tickFormatter={(value) => `${Number(value).toFixed(0)}`}
          width={44}
        />
        <Tooltip
          cursor={{ stroke: 'rgba(13,148,136,0.35)', strokeWidth: 1, strokeDasharray: '3 3' }}
          formatter={(value, name) => [`${Number(value).toFixed(1)}`, String(name)]}
          labelFormatter={(value) =>
            new Date(String(value)).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          }
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #e5e8eb',
            background: '#ffffff',
            color: '#191f28',
            fontSize: 12,
            boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
            padding: '8px 12px',
          }}
          labelStyle={{ color: '#4e5968', fontSize: 11, marginBottom: 4 }}
        />
        <ReferenceLine y={100} stroke="rgba(25,31,40,0.18)" strokeDasharray="4 4" />
        {series.map((entry) => (
          <Line
            key={entry.symbol}
            type="monotone"
            dataKey={entry.symbol}
            stroke={entry.color}
            strokeWidth={2}
            dot={false}
            connectNulls
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
