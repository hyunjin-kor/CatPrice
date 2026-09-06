import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLang } from '../../lib/i18n';

type HistogramBar = {
  range: string;
  value: number;
  fill: string;
};

export default function EstimateRangeBarChart({ data }: { data: HistogramBar[] }) {
  const { t } = useLang();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={54}>
        <CartesianGrid stroke="rgba(78,89,104,0.18)" vertical={false} />
        <XAxis dataKey="range" tick={{ fill: '#8b95a1', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8b95a1', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(13,148,136,0.06)' }}
          formatter={(value) => [`${value}%`, t('Share of simulations')]}
          contentStyle={{
            borderRadius: 14,
            border: '1px solid rgba(25,31,40,0.10)',
            background: 'rgba(252,248,240,0.97)',
            color: '#191f28',
            fontSize: 12,
            boxShadow: '0 18px 42px rgba(15,23,42,0.10)',
            padding: '8px 12px',
          }}
          labelStyle={{ color: '#4e5968', fontSize: 11, marginBottom: 4 }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.range} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
