import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  title: string;
  subtitle?: string;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}

export const DonutChart = ({ 
  data, 
  title, 
  subtitle, 
  height = 200,
  centerLabel,
  centerValue
}: DonutChartProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="vf-card p-5">
      <div className="mb-4">
        <h3 className="font-display text-sm font-medium text-midnight mb-1">{title}</h3>
        {subtitle && <p className="text-xs text-graphite-500">{subtitle}</p>}
      </div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                padding: '8px 12px'
              }}
              formatter={(value: any, name: string) => [
                `${value} (${Math.round((value / total) * 100)}%)`,
                name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        {centerLabel && centerValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-2xl font-display font-medium text-midnight">{centerValue}</p>
            <p className="text-xs text-graphite-500">{centerLabel}</p>
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-midnight truncate">{item.label}</p>
              <p className="text-xs text-graphite-500">
                {item.value} ({Math.round((item.value / total) * 100)}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
