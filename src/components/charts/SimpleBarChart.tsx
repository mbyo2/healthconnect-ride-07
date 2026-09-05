import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';

export interface ChartDatum {
  label?: string;
  name?: string;
  value?: number;
  color?: string;
  [key: string]: any;
}

interface SimpleBarChartProps {
  data: ChartDatum[];
  /** Optional multi-series definition */
  bars?: Array<{ dataKey: string; name?: string; color?: string }>;
  title?: string;
  subtitle?: string;
  height?: number;
  defaultColor?: string;
}

export const SimpleBarChart = ({ 
  data, 
  bars,
  title, 
  subtitle, 
  height = 200,
  defaultColor = '#397dff'
}: SimpleBarChartProps) => {
  const rows = (data || []).map((d) => ({
    ...d,
    label: d.label ?? d.name ?? '',
    value: typeof d.value === 'number' ? d.value : 0,
  }));

  return (
    <div className="vf-card p-5">
      <div className="mb-4">
        <h3 className="font-display text-sm font-medium text-midnight mb-1">{title}</h3>
        {subtitle && <p className="text-xs text-graphite-500">{subtitle}</p>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows}>
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
          {bars && bars.length > 0 ? (
            bars.map((b) => (
              <Bar
                key={b.dataKey}
                dataKey={b.dataKey}
                name={b.name || b.dataKey}
                fill={b.color || defaultColor}
                radius={[8, 8, 0, 0]}
              />
            ))
          ) : (
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {rows.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || defaultColor} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
