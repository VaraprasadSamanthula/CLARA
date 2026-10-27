/**
 * Lab trend chart using Recharts.
 * Displays time series of lab values (e.g., HbA1c) with reference range.
 */

import type { LabTrendResponse } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface LabChartProps {
  data: LabTrendResponse;
  testName?: string;
}

export function LabChart({ data, testName }: LabChartProps) {
  // Parse reference range (e.g., "4.0-6.0" -> min: 4.0, max: 6.0)
  let refMin = 0;
  let refMax = 0;

  if (data.values.length > 0 && data.values[0].reference_range_text) {
    const range = data.values[0].reference_range_text;
    const match = range.match(/[\d.]+/g);
    if (match && match.length >= 2) {
      refMin = parseFloat(match[0]);
      refMax = parseFloat(match[1]);
    }
  }

  // Transform data for chart
  const chartData = data.values.map((v) => ({
    date: new Date(v.recorded_date).toLocaleDateString(),
    value: v.value,
    lab_id: v.lab_id,
  }));

  return (
    <div className="card">
      <h3>{data.test_name} Trend ({data.unit})</h3>

      {chartData.length === 0 ? (
        <div className="empty-state" style={{ padding: '20px' }}>
          <p>No data available for {data.test_name}.</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value) => `${value} ${data.unit}`}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />

              {/* Reference range lines */}
              {refMin > 0 && <ReferenceLine y={refMin} stroke="#90ee90" label="Normal Min" />}
              {refMax > 0 && <ReferenceLine y={refMax} stroke="#90ee90" label="Normal Max" />}

              {/* Data line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3498db"
                dot={{ fill: '#3498db', r: 5 }}
                activeDot={{ r: 7 }}
                name={data.test_name}
              />
            </LineChart>
          </ResponsiveContainer>

          <div style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
            {refMin > 0 && refMax > 0 && (
              <p>Reference range: {refMin} - {refMax} {data.unit}</p>
            )}
            <p>Total readings: {chartData.length}</p>
          </div>
        </>
      )}
    </div>
  );
}
