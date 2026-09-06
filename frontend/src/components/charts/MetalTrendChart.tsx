import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPrice } from '../../lib/format-price';
import { useLang } from '../../lib/i18n';

type HistoryPoint = {
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
};

type Period = '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';

export default function MetalTrendChart({
  data,
  period,
  selectedDisplayUnit,
  selectedColor,
}: {
  data: HistoryPoint[];
  period: Period;
  selectedDisplayUnit: string;
  selectedColor: string;
}) {
  const { lang } = useLang();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={selectedColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={selectedColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#8b95a1', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString(
              lang === 'ko' ? 'ko-KR' : 'en-US',
              period === '1mo' ? { month: 'short', day: 'numeric' } : { year: '2-digit', month: 'short' },
            )
          }
        />
        <YAxis
          tick={{ fill: '#8b95a1', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => formatPrice(Number(value))}
          width={72}
        />
        <Tooltip
          cursor={{ stroke: 'rgba(13,148,136,0.35)', strokeWidth: 1, strokeDasharray: '3 3' }}
          formatter={(value) => [formatPrice(Number(value)), selectedDisplayUnit]}
          labelFormatter={(value) =>
            new Date(value).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
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
        {data.length > 0 ? <ReferenceLine y={data[0]!.price} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" /> : null}
        <Area
          type="monotone"
          dataKey="price"
          stroke={selectedColor}
          strokeWidth={2.2}
          fill="url(#priceFill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
