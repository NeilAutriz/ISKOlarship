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
import { platformStatistics } from '../data/mockHistoricalData';
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
  // Blue Theme colors
  const colors = {
    primary: 'rgb(37, 99, 235)',
    primaryLight: 'rgba(37, 99, 235, 0.5)',
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

  // Success Rate by GWA Chart - using platformStatistics.gwaDistribution
  const successByGwaData = useMemo(() => {
    const gwaData = platformStatistics.gwaDistribution;
    const labels = Object.keys(gwaData);
    const rates = Object.values(gwaData).map((d: any) => d.successRate);
    
    return {
      labels,
      datasets: [{
        label: 'Success Rate (%)',
        data: rates,
        backgroundColor: [
          colors.greenLight,
          colors.blueLight,
          colors.goldLight,
          colors.orangeLight,
        ],
        borderColor: [
          colors.green,
          colors.blue,
          colors.gold,
          colors.orange,
        ],
        borderWidth: 2,
      }]
    };
  }, []);

  // Success Rate by Income Chart - using platformStatistics.incomeDistribution
  const successByIncomeData = useMemo(() => {
    const incomeData = platformStatistics.incomeDistribution;
    const labels = Object.keys(incomeData);
    const rates = Object.values(incomeData).map((d: any) => d.successRate);
    
    return {
      labels,
      datasets: [{
        label: 'Success Rate (%)',
        data: rates,
        backgroundColor: colors.goldLight,
        borderColor: colors.gold,
        borderWidth: 2,
      }]
    };
  }, []);

  // Success Rate by College Chart - using platformStatistics.byCollege
  const successByCollegeData = useMemo(() => {
    const collegeData = platformStatistics.byCollege;
    const labels = Object.keys(collegeData);
    const rates = Object.values(collegeData).map((d: any) => d.successRate);
    
    return {
      labels,
      datasets: [{
        label: 'Success Rate (%)',
        data: rates,
        backgroundColor: [
          colors.primaryLight,
          colors.goldLight,
          colors.greenLight,
          colors.blueLight,
          colors.orangeLight,
          colors.purpleLight,
          colors.primaryLight,
          colors.goldLight,
          colors.greenLight,
        ],
        borderColor: [
          colors.primary,
          colors.gold,
          colors.green,
          colors.blue,
          colors.orange,
          colors.purple,
          colors.primary,
          colors.gold,
          colors.green,
        ],
        borderWidth: 2,
      }]
    };
  }, []);

  // Scholarships by Type Chart - using scholarshipStats.byType
  const scholarshipsByTypeData = useMemo(() => {
    const typeData = scholarshipStats.byType;
    return {
      labels: ['University', 'College', 'Government', 'Private', 'Thesis Grant'],
      datasets: [{
        data: [
          typeData.university,
          typeData.college,
          typeData.government,
          typeData.private,
          typeData.thesisGrant
        ],
        backgroundColor: [
          colors.primary,
          colors.gold,
          colors.green,
          colors.blue,
          colors.orange,
        ],
        borderWidth: 0,
      }]
    };
  }, [scholarshipStats]);

  // Funding Distribution Chart
  const fundingDistributionData = useMemo(() => {
    const sortedScholarships = [...scholarships]
      .filter(s => s.awardAmount && s.awardAmount > 0)
      .sort((a, b) => (b.awardAmount || 0) - (a.awardAmount || 0))
      .slice(0, 10);
    
    return {
      labels: sortedScholarships.map(s => 
        s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name
      ),
      datasets: [{
        label: 'Grant Amount (₱)',
        data: sortedScholarships.map(s => s.awardAmount || 0),
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
        borderWidth: 1,
      }]
    };
  }, []);

  // Application Trend Chart
  const applicationTrendData = useMemo(() => {
    const yearData = platformStatistics.byAcademicYear;
    const labels = Object.keys(yearData);
    const approved = Object.values(yearData).map((d: any) => d.approved);
    const rejected = Object.values(yearData).map((d: any) => d.rejected);
    
    return {
      labels,
      datasets: [
        {
          label: 'Approved',
          data: approved,
          backgroundColor: colors.greenLight,
          borderColor: colors.green,
          borderWidth: 2,
          fill: true,
        },
        {
          label: 'Rejected',
          data: rejected,
          backgroundColor: colors.orangeLight,
          borderColor: colors.orange,
          borderWidth: 2,
          fill: true,
        }
      ]
    };
  }, []);

  // Chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: (value: any) => `${value}%`
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
      }
    }
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    }
  };

  // Render chart based on type
  const renderChart = () => {
    switch (type) {
      case 'successByGwa':
        return <Bar data={successByGwaData} options={barOptions} />;
      case 'successByIncome':
        return <Bar data={successByIncomeData} options={barOptions} />;
      case 'successByCollege':
        return <Bar data={successByCollegeData} options={barOptions} />;
      case 'scholarshipsByType':
        return <Doughnut data={scholarshipsByTypeData} options={pieOptions} />;
      case 'fundingDistribution':
        return <Bar data={fundingDistributionData} options={{
          ...barOptions,
          scales: {
            ...barOptions.scales,
            y: {
              ...barOptions.scales.y,
              max: undefined,
              ticks: {
                callback: (value: any) => `₱${(value/1000).toFixed(0)}k`
              }
            }
          }
        }} />;
      case 'applicationTrend':
        return <Line data={applicationTrendData} options={lineOptions} />;
      default:
        return <Bar data={successByGwaData} options={barOptions} />;
    }
  };

  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      )}
      <div style={{ height }}>
        {renderChart()}
      </div>
    </div>
  );
};

export default DataVisualization;
