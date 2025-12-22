// ============================================================================
// ISKOlarship - DataVisualization Component
// Chart.js based visualizations for scholarship analytics
// Now fetches data from API instead of mock data
// ============================================================================

import React, { useMemo, useState, useEffect } from 'react';
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
import { Loader2, AlertCircle } from 'lucide-react';
import { statisticsApi, scholarshipApi } from '../services/apiClient';

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

interface AnalyticsData {
  gwaStats: Array<{ range: string; totalApplications: number; approved: number; successRate: number }>;
  incomeStats: Array<{ bracket: string; totalApplications: number; approved: number; successRate: number }>;
  collegeStats: Array<{ college: string; totalApplications: number; approved: number; rejected: number; successRate: number }>;
  typeStats: Array<{ type: string; count: number; totalSlots: number; totalFunding: number }>;
  yearlyTrends: Array<{ academicYear: string; totalApplications: number; approvedApplications: number; rejectedApplications: number; successRate: number }>;
}

const DataVisualization: React.FC<DataVisualizationProps> = ({
  type = 'successByGwa',
  title,
  height = 300,
  className = ''
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [scholarships, setScholarships] = useState<any[]>([]);

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

  // Fetch analytics data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [analyticsRes, scholarshipsRes] = await Promise.all([
          statisticsApi.getAnalytics(),
          scholarshipApi.getAll({ limit: 100 })
        ]);

        if (analyticsRes.success && analyticsRes.data) {
          setAnalyticsData({
            gwaStats: analyticsRes.data.gwaStats || [],
            incomeStats: analyticsRes.data.incomeStats || [],
            collegeStats: analyticsRes.data.collegeStats || [],
            typeStats: analyticsRes.data.typeStats || [],
            yearlyTrends: analyticsRes.data.yearlyTrends || []
          });
        }

        if (scholarshipsRes.success && scholarshipsRes.data?.scholarships) {
          setScholarships(scholarshipsRes.data.scholarships);
        }
      } catch (err) {
        console.error('Failed to fetch analytics data:', err);
        setError('Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Success Rate by GWA Chart
  const successByGwaData = useMemo(() => {
    if (!analyticsData?.gwaStats?.length) {
      return {
        labels: ['1.0-1.5', '1.5-2.0', '2.0-2.5', '2.5-3.0'],
        datasets: [{ label: 'Success Rate (%)', data: [0, 0, 0, 0], backgroundColor: colors.greenLight, borderColor: colors.green, borderWidth: 2 }]
      };
    }

    return {
      labels: analyticsData.gwaStats.map(d => d.range),
      datasets: [{
        label: 'Success Rate (%)',
        data: analyticsData.gwaStats.map(d => d.successRate),
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
  }, [analyticsData]);

  // Success Rate by Income Chart
  const successByIncomeData = useMemo(() => {
    if (!analyticsData?.incomeStats?.length) {
      return {
        labels: ['Below 100k', '100k-200k', '200k-300k', '300k+'],
        datasets: [{ label: 'Success Rate (%)', data: [0, 0, 0, 0], backgroundColor: colors.goldLight, borderColor: colors.gold, borderWidth: 2 }]
      };
    }

    return {
      labels: analyticsData.incomeStats.map(d => d.bracket),
      datasets: [{
        label: 'Success Rate (%)',
        data: analyticsData.incomeStats.map(d => d.successRate),
        backgroundColor: colors.goldLight,
        borderColor: colors.gold,
        borderWidth: 2,
      }]
    };
  }, [analyticsData]);

  // Success Rate by College Chart
  const successByCollegeData = useMemo(() => {
    if (!analyticsData?.collegeStats?.length) {
      return {
        labels: ['CAS', 'CEAT', 'CAFS', 'CHE', 'CEM'],
        datasets: [{ label: 'Success Rate (%)', data: [0, 0, 0, 0, 0], backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 2 }]
      };
    }

    const bgColors = [
      colors.primaryLight, colors.goldLight, colors.greenLight,
      colors.blueLight, colors.orangeLight, colors.purpleLight
    ];
    const borderColors = [
      colors.primary, colors.gold, colors.green,
      colors.blue, colors.orange, colors.purple
    ];

    return {
      labels: analyticsData.collegeStats.map(d => d.college),
      datasets: [{
        label: 'Success Rate (%)',
        data: analyticsData.collegeStats.map(d => d.successRate),
        backgroundColor: analyticsData.collegeStats.map((_, i) => bgColors[i % bgColors.length]),
        borderColor: analyticsData.collegeStats.map((_, i) => borderColors[i % borderColors.length]),
        borderWidth: 2,
      }]
    };
  }, [analyticsData]);

  // Scholarships by Type Chart
  const scholarshipsByTypeData = useMemo(() => {
    if (!analyticsData?.typeStats?.length) {
      return {
        labels: ['University', 'College', 'Government', 'Private', 'Thesis Grant'],
        datasets: [{ data: [0, 0, 0, 0, 0], backgroundColor: [colors.primary, colors.gold, colors.green, colors.blue, colors.orange], borderWidth: 0 }]
      };
    }

    return {
      labels: analyticsData.typeStats.map(d => d.type),
      datasets: [{
        data: analyticsData.typeStats.map(d => d.count),
        backgroundColor: [
          colors.primary,
          colors.gold,
          colors.green,
          colors.blue,
          colors.orange,
          colors.purple
        ],
        borderWidth: 0,
      }]
    };
  }, [analyticsData]);

  // Funding Distribution Chart
  const fundingDistributionData = useMemo(() => {
    if (!scholarships.length) {
      return {
        labels: [],
        datasets: [{ label: 'Grant Amount (₱)', data: [], backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1 }]
      };
    }

    const sortedScholarships = [...scholarships]
      .filter(s => {
        const amount = s.awardAmount ?? s.totalGrant ?? 0;
        return amount > 0;
      })
      .sort((a, b) => {
        const amountA = a.awardAmount ?? a.totalGrant ?? 0;
        const amountB = b.awardAmount ?? b.totalGrant ?? 0;
        return amountB - amountA;
      })
      .slice(0, 10);
    
    return {
      labels: sortedScholarships.map(s => 
        s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name
      ),
      datasets: [{
        label: 'Grant Amount (₱)',
        data: sortedScholarships.map(s => s.awardAmount ?? s.totalGrant ?? 0),
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
        borderWidth: 1,
      }]
    };
  }, [scholarships]);

  // Application Trend Chart
  const applicationTrendData = useMemo(() => {
    if (!analyticsData?.yearlyTrends?.length) {
      return {
        labels: ['2021-2022', '2022-2023', '2023-2024', '2024-2025'],
        datasets: [
          { label: 'Approved', data: [0, 0, 0, 0], backgroundColor: colors.greenLight, borderColor: colors.green, borderWidth: 2, fill: true },
          { label: 'Rejected', data: [0, 0, 0, 0], backgroundColor: colors.orangeLight, borderColor: colors.orange, borderWidth: 2, fill: true }
        ]
      };
    }

    return {
      labels: analyticsData.yearlyTrends.map(d => d.academicYear),
      datasets: [
        {
          label: 'Approved',
          data: analyticsData.yearlyTrends.map(d => d.approvedApplications),
          backgroundColor: colors.greenLight,
          borderColor: colors.green,
          borderWidth: 2,
          fill: true,
        },
        {
          label: 'Rejected',
          data: analyticsData.yearlyTrends.map(d => d.rejectedApplications),
          backgroundColor: colors.orangeLight,
          borderColor: colors.orange,
          borderWidth: 2,
          fill: true,
        }
      ]
    };
  }, [analyticsData]);

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

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm \${className}`} style={{ height: height + 40 }}>
        {title && <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            <p className="text-sm text-slate-500">Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm \${className}`} style={{ height: height + 40 }}>
        {title && <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <p className="text-sm text-slate-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

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
                callback: (value: any) => `₱\${(value/1000).toFixed(0)}k`
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
    <div className={`bg-white rounded-xl p-6 shadow-sm \${className}`}>
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
