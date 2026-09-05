import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';

interface SimpleBarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  title: string;
  subtitle?: string;
  height?: number;
  defaultColor?: string;
}

export const SimpleBarChart = ({ 
  data, 
  title, 
  subtitle, 
  height = 200,
  defaultColor = '#397dff'
}: SimpleBarChartProps) => {
  return (
    <div className="vf-card p-5">
      <div className="mb-4">
        <h3 className="font-display text-sm font-medium text-midnight mb-1">{title}</h3>
        {subtitle && <p className="text-xs text-graphite-500">{subtitle}</p>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
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
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
          />
          <Bar 
            dataKey="value" 
            radius={[8, 8, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || defaultColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
