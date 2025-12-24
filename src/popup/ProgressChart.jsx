import React, { useState } from 'react';

function ProgressChart({ submissionCalendar }) {
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'

  if (!submissionCalendar) {
    return (
      <div className="text-center py-8 text-text-muted">
        <span className="text-3xl mb-2 block">📊</span>
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  // Get last 30 days of data
  const getLast30DaysData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const timestamp = Math.floor(utcDate.getTime() / 1000).toString();
      const count = parseInt(submissionCalendar[timestamp]) || 0;
      
      data.push({
        date: date,
        label: date.getDate().toString(),
        count: count,
        isToday: i === 0
      });
    }
    
    return data;
  };

  const data = getLast30DaysData();
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  // Chart dimensions
  const width = 320;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 25 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Calculate positions
  const barWidth = chartWidth / data.length;
  
  return (
    <div className="bg-gradient-to-br from-surface to-surfaceHover/30 p-5 rounded-xl border border-surfaceHover shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📈</span>
          <div>
            <h3 className="font-bold text-sm text-text-main">Progress Trend</h3>
            <p className="text-[10px] text-text-muted">Last 30 days</p>
          </div>
        </div>
        
        {/* Chart Type Toggle */}
        <div className="flex gap-1 bg-background/50 rounded-lg p-1">
          <button
            onClick={() => setChartType('bar')}
            className={`px-2 py-1 text-[10px] font-semibold rounded transition-all ${
              chartType === 'bar' 
                ? 'bg-primary text-white' 
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            Bar
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-2 py-1 text-[10px] font-semibold rounded transition-all ${
              chartType === 'line' 
                ? 'bg-primary text-white' 
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            Line
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {/* Y-axis label */}
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 origin-center">
          <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wide">Submissions</span>
        </div>
        
        <svg width={width} height={height} className="overflow-visible">
          {/* Y-axis labels */}
          {[0, Math.ceil(maxCount / 2), maxCount].map((value, idx) => (
            <text
              key={idx}
              x={padding.left - 5}
              y={padding.top + chartHeight - (value / maxCount) * chartHeight}
              textAnchor="end"
              className="text-[8px] fill-text-muted"
              dominantBaseline="middle"
            >
              {value}
            </text>
          ))}
          
          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, idx) => (
            <line
              key={idx}
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - ratio)}
              x2={padding.left + chartWidth}
              y2={padding.top + chartHeight * (1 - ratio)}
              stroke="currentColor"
              strokeWidth="1"
              className="stroke-surfaceHover opacity-30"
              strokeDasharray="2,2"
            />
          ))}

          {chartType === 'bar' ? (
            // Bar Chart
            <>
              {data.map((d, idx) => {
                const barHeight = (d.count / maxCount) * chartHeight;
                const x = padding.left + idx * barWidth;
                const y = padding.top + chartHeight - barHeight;
                
                return (
                  <g key={idx}>
                    <rect
                      x={x + barWidth * 0.15}
                      y={y}
                      width={barWidth * 0.7}
                      height={barHeight || 2}
                      fill="currentColor"
                      className={`${
                        d.isToday 
                          ? 'fill-primary' 
                          : d.count > 0 
                            ? 'fill-primary/70' 
                            : 'fill-surfaceHover'
                      } transition-all duration-300 hover:fill-primary`}
                      rx="2"
                    />
                    {/* Show label every 5 days */}
                    {idx % 5 === 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={height - 5}
                        textAnchor="middle"
                        className="text-[8px] fill-text-muted"
                      >
                        {d.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          ) : (
            // Line Chart
            <>
              {/* Line path */}
              <path
                d={data.map((d, idx) => {
                  const x = padding.left + idx * barWidth + barWidth / 2;
                  const y = padding.top + chartHeight - (d.count / maxCount) * chartHeight;
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="stroke-primary"
              />
              
              {/* Points */}
              {data.map((d, idx) => {
                const x = padding.left + idx * barWidth + barWidth / 2;
                const y = padding.top + chartHeight - (d.count / maxCount) * chartHeight;
                
                return (
                  <g key={idx}>
                    <circle
                      cx={x}
                      cy={y}
                      r={d.isToday ? 4 : d.count > 0 ? 3 : 2}
                      fill="currentColor"
                      className={`${
                        d.isToday 
                          ? 'fill-primary' 
                          : d.count > 0 
                            ? 'fill-primary/70' 
                            : 'fill-surfaceHover'
                      } transition-all duration-300 hover:fill-primary hover:r-5`}
                    />
                    {/* Show label every 5 days */}
                    {idx % 5 === 0 && (
                      <text
                        x={x}
                        y={height - 5}
                        textAnchor="middle"
                        className="text-[8px] fill-text-muted"
                      >
                        {d.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}
        </svg>
        
        {/* X-axis label */}
        <div className="text-center mt-1">
          <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wide">Days</span>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-xs font-bold text-primary">
            {data.reduce((sum, d) => sum + d.count, 0)}
          </div>
          <div className="text-[9px] text-text-muted">Total</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-primary">
            {(data.reduce((sum, d) => sum + d.count, 0) / 30).toFixed(1)}
          </div>
          <div className="text-[9px] text-text-muted">Avg/Day</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-primary">
            {Math.max(...data.map(d => d.count))}
          </div>
          <div className="text-[9px] text-text-muted">Peak</div>
        </div>
      </div>
    </div>
  );
}

export default ProgressChart;
