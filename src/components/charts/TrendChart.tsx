import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';

interface TrendChartProps {
  data: Array<{ label: string; value: number }>;
  title: string;
  subtitle?: string;
  color?: string;
  height?: number;
  showArea?: boolean;
  prefix?: string;
  suffix?: string;
}

export const TrendChart = ({ 
  data, 
  title, 
  subtitle, 
  color = '#397dff',
  height = 200,
  showArea = true,
  prefix = '',
  suffix = ''
}: TrendChartProps) => {
  const ChartComponent = showArea ? AreaChart : LineChart;
  const DataComponent = showArea ? Area : Line;

  return (
    <div className="vf-card p-5">
      <div className="mb-4">
        <h3 className="font-display text-sm font-medium text-midnight mb-1">{title}</h3>
        {subtitle && <p className="text-xs text-graphite-500">{subtitle}</p>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="label" 
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              padding: '8px 12px'
            }}
            formatter={(value: any) => [`${prefix}${value}${suffix}`, 'Value']}
          />
          <DataComponent 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={2}
            fill={showArea ? `url(#gradient-${color})` : 'none'}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};
