import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useLang } from '../../lib/i18n';

type PieSlice = {
  name: string;
  value: number;
};

export default function ResultBreakdownPieChart({
  data,
  colors,
}: {
  data: PieSlice[];
  colors: string[];
}) {
  const { t } = useLang();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} innerRadius={64} outerRadius={96} dataKey="value" paddingAngle={3} stroke="transparent">
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(1)}%`, t('Share')]}
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
      </PieChart>
    </ResponsiveContainer>
  );
}
