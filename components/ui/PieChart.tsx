import React from 'react';

interface PieChartProps {
  data: { name: string; value: number; color: string }[];
  size?: number;
}

const getCoordinatesForPercent = (percent: number, radius: number) => {
  const x = Math.cos(2 * Math.PI * percent) * radius;
  const y = Math.sin(2 * Math.PI * percent) * radius;
  return [x, y];
};

export const PieChart: React.FC<PieChartProps> = ({ data, size = 160 }) => {
  let cumulativePercent = 0;
  const radius = size / 2;

  if (data.length === 1 && data[0].value >= 99.9) {
     return (
        <svg width={size} height={size} viewBox={`-${radius} -${radius} ${size} ${size}`}>
            <circle cx="0" cy="0" r={radius} fill={data[0].color} />
        </svg>
     )
  }

  const paths = data.map((slice, index) => {
    if (slice.value === 0) return null;
    const [startX, startY] = getCoordinatesForPercent(cumulativePercent, radius);
    cumulativePercent += slice.value / 100;
    const [endX, endY] = getCoordinatesForPercent(cumulativePercent, radius);
    
    const largeArcFlag = slice.value > 50 ? 1 : 0;

    const pathData = [
      `M ${startX} ${startY}`, // Move
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc
      `L 0 0`, // Line to center
    ].join(' ');

    return (
      <path
        key={index}
        d={pathData}
        fill={slice.color}
        transform={`rotate(-90)`}
      />
    );
  }).filter(Boolean);

  return (
    <svg width={size} height={size} viewBox={`-${radius} -${radius} ${size} ${size}`}>
      {paths}
    </svg>
  );
};
