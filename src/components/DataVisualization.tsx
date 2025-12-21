// ============================================================================
// ISKOlarship - DataVisualization Component
// Chart.js based visualizations for scholarship analytics
// ============================================================================

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { scholarshipStatistics, platformStatistics } from '../data/mockHistoricalData';
import { scholarships, getScholarshipStats } from '../data/scholarships';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DataVisualizationProps {
  type?: 'successByGwa' | 'successByIncome' | 'successByCollege' | 'scholarshipsByType' | 'fundingDistribution' | 'applicationTrend';
  title?: string;
  height?: number;
  className?: string;
}

const DataVisualization: React.FC<DataVisualizationProps> = ({
  type = 'successByGwa',
  title,
  height = 300,
  className = ''
}) => {
  // UPLB Theme colors
  const colors = {
    primary: 'rgb(139, 21, 56)',
    primaryLight: 'rgba(139, 21, 56, 0.5)',
    gold: 'rgb(250, 204, 21)',
    goldLight: 'rgba(250, 204, 21, 0.5)',
    green: 'rgb(34, 197, 94)',
    greenLight: 'rgba(34, 197, 94, 0.5)',
    blue: 'rgb(59, 130, 246)',
    blueLight: 'rgba(59, 130, 246, 0.5)',
    orange: 'rgb(249, 115, 22)',
    orangeLight: 'rgba(249, 115, 22, 0.5)',
    purple: 'rgb(168, 85, 247)',
    purpleLight: 'rgba(168, 85, 247, 0.5)',
  };

  const scholarshipStats = getScholarshipStats();

  // Success Rate by GWA Chart
  const successByGwaData = useMemo(() => ({
    labels: scholarshipStatistics.successRateByGWA.map(d => `${d.range[0].toFixed(1)}-${d.range[1].toFixed(1)}`),
    datasets: [{
      label: 'Success Rate (%)',
      data: scholarshipStatistics.successRateByGWA.map(d => d.rate * 100),
      backgroundColor: [
        colors.primaryLight,
        colors.orangeLight,
        colors.goldLight,
        colors.greenLight,
      ],
      borderColor: [
        colors.primary,
        colors.orange,
        colors.gold,
        colors.green,
      ],
      borderWidth: 2,
    }]
  }), []);

  // Success Rate by Income Chart
  const successByIncomeData = useMemo(() => ({
    labels: scholarshipStatistics.successRateByIncome.map(d => `₱${(d.range[0]/1000).toFixed(0)}k-${(d.range[1]/1000).toFixed(0)}k`),
    datasets: [{
      label: 'Success Rate (%)',
      data: scholarshipStatistics.successRateByIncome.map(d => d.rate * 100),
      backgroundColor: colors.goldLight,
      borderColor: colors.gold,
      borderWidth: 2,
    }]
  }), []);

  // Success Rate by College Chart
  const successByCollegeData = useMemo(() => ({
    labels: scholarshipStatistics.successRateByCollege.map(d => d.college),
    datasets: [{
      label: 'Success Rate (%)',
      data: scholarshipStatistics.successRateByCollege.map(d => d.rate * 100),
      backgroundColor: [
        colors.primaryLight,
        colors.goldLight,
        colors.greenLight,
        colors.blueLight,
        colors.orangeLight,
        colors.purpleLight,
      ],
      borderColor: [
        colors.primary,
        colors.gold,
        colors.green,
        colors.blue,
        colors.orange,
        colors.purple,
      ],
      borderWidth: 2,
    }]
  }), []);

  // Scholarships by Type Chart
  const scholarshipsByTypeData = useMemo(() => ({
    labels: scholarshipStats.typeBreakdown.map(t => t.type),
    datasets: [{
      data: scholarshipStats.typeBreakdown.map(t => t.count),
      backgroundColor: [
        colors.primary,
        colors.gold,
        colors.green,
        colors.blue,
      ],
      borderWidth: 0,
    }]
  }), [scholarshipStats]);

  // Funding Distribution Chart
  const fundingDistributionData = useMemo(() => {
    const sortedScholarships = [...scholarships].sort((a, b) => b.amount - a.amount);
    return {
      labels: sortedScholarships.map(s => s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name),
      datasets: [{
        label: 'Grant Amount (₱)',
        data: sortedScholarships.map(s => s.amount),
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
        borderWidth: 1,
      }]
    };
  }, []);

  // Application Trend Chart (mock data)
  const applicationTrendData = useMemo(() => ({
    labels: ['2020', '2021', '2022', '2023', '2024'],
    datasets: [
      {
        label: 'Applications',
        data: [450, 520, 580, 650, 720],
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Approvals',
        data: [180, 210, 245, 290, 340],
        borderColor: colors.green,
        backgroundColor: colors.greenLight,
        fill: true,
        tension: 0.4,
      }
    ]
  }), []);

  // Common chart options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            family: "'Inter', sans-serif",
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: {
          family: "'Inter', sans-serif",
          size: 14,
          weight: 'bold' as const
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
      }
    }
  };

  const barOptions = {
    ...commonOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif"
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif"
          }
        }
      }
    }
  };

  const lineOptions = {
    ...commonOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const doughnutOptions = {
    ...commonOptions,
    cutout: '60%',
  };

  // Render appropriate chart
  const renderChart = () => {
    switch (type) {
      case 'successByGwa':
        return <Bar data={successByGwaData} options={barOptions} />;
      case 'successByIncome':
        return <Bar data={successByIncomeData} options={barOptions} />;
      case 'successByCollege':
        return <Bar data={successByCollegeData} options={barOptions} />;
      case 'scholarshipsByType':
        return <Doughnut data={scholarshipsByTypeData} options={doughnutOptions} />;
      case 'fundingDistribution':
        return <Bar data={fundingDistributionData} options={{
          ...barOptions,
          indexAxis: 'y' as const,
        }} />;
      case 'applicationTrend':
        return <Line data={applicationTrendData} options={lineOptions} />;
      default:
        return <Bar data={successByGwaData} options={barOptions} />;
    }
  };

  // Get default title
  const getDefaultTitle = () => {
    switch (type) {
      case 'successByGwa':
        return 'Success Rate by GWA Range';
      case 'successByIncome':
        return 'Success Rate by Income Bracket';
      case 'successByCollege':
        return 'Success Rate by College';
      case 'scholarshipsByType':
        return 'Scholarships by Type';
      case 'fundingDistribution':
        return 'Funding Distribution';
      case 'applicationTrend':
        return 'Application Trends';
      default:
        return 'Chart';
    }
  };

  return (
    <div className={`card p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        {title || getDefaultTitle()}
      </h3>
      <div style={{ height }}>
        {renderChart()}
      </div>
    </div>
  );
};

export default DataVisualization;