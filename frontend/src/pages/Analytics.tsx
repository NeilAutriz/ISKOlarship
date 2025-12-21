// ============================================================================
// ISKOlarship - Analytics Page
// Platform-wide analytics and scholarship statistics (API Connected)
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Award,
  Target,
  BarChart2,
  PieChart,
  Activity,
  Calendar,
  GraduationCap,
  DollarSign,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { statisticsApi } from '../services/apiClient';

// ============================================================================
// Types
// ============================================================================

interface AnalyticsData {
  platformStatistics: {
    totalApplications: number;
    totalApprovedAllTime: number;
    totalRejectedAllTime: number;
    overallSuccessRate: number;
    averageGWAApproved: number | null;
    averageIncomeApproved: number | null;
    uniqueScholars: number;
    totalFunding: number;
    totalStudents: number;
    totalScholarships: number;
    activeScholarships: number;
  };
  yearlyTrends: Array<{
    academicYear: string;
    totalApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    successRate: number;
  }>;
  collegeStats: Array<{
    college: string;
    totalApplications: number;
    approved: number;
    successRate: number;
  }>;
  gwaStats: Array<{
    range: string;
    totalApplications: number;
    approved: number;
    successRate: number;
  }>;
  incomeStats: Array<{
    bracket: string;
    totalApplications: number;
    approved: number;
    successRate: number;
  }>;
  yearLevelStats: Array<{
    yearLevel: string;
    totalApplications: number;
    approved: number;
    successRate: number;
  }>;
  typeStats: Array<{
    type: string;
    count: number;
    totalSlots: number;
    totalFunding: number;
  }>;
  modelMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  } | null;
  lastUpdated: string;
}

// ============================================================================
// Analytics Page Component
// ============================================================================

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data from API
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await statisticsApi.getAnalytics();
      if (response.success) {
        setData(response.data);
      } else {
        setError('Failed to load analytics data');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Unable to connect to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate year-over-year changes
  const calculateYoYChange = () => {
    if (!data || data.yearlyTrends.length < 2) {
      return { applications: 0, successRate: 0 };
    }
    
    const sorted = [...data.yearlyTrends].sort((a, b) => 
      b.academicYear.localeCompare(a.academicYear)
    );
    
    const current = sorted[0];
    const previous = sorted[1];
    
    const appChange = previous.totalApplications > 0 
      ? ((current.totalApplications - previous.totalApplications) / previous.totalApplications) * 100 
      : 0;
    const rateChange = current.successRate - previous.successRate;
    
    return {
      applications: Math.round(appChange * 10) / 10,
      successRate: Math.round(rateChange * 10) / 10
    };
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Analytics</h2>
          <p className="text-slate-600 mb-6">{error || 'An unexpected error occurred.'}</p>
          <button 
            onClick={fetchAnalytics}
            className="btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const yoyChange = calculateYoYChange();
  const topCollege = data.collegeStats.reduce((max, c) => 
    c.successRate > (max?.successRate || 0) ? c : max, data.collegeStats[0]
  );
  const topGWARange = data.gwaStats.reduce((max, g) => 
    g.successRate > (max?.successRate || 0) ? g : max, data.gwaStats[0]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700">
        <div className="container-app py-8 md:py-12">
          <div className="flex items-center gap-3 text-gold-400 mb-2">
            <BarChart2 className="w-6 h-6" />
            <span className="text-sm font-medium uppercase tracking-wider">Analytics</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Platform Statistics
          </h1>
          <p className="text-slate-300 max-w-2xl">
            Real-time analytics and trends from ISKOlarship scholarship applications, 
            success rates, and funding distribution at UPLB.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Last updated: {new Date(data.lastUpdated).toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="container-app -mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Applications */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              {yoyChange.applications !== 0 && (
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  yoyChange.applications > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {yoyChange.applications > 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(yoyChange.applications)}%
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {data.platformStatistics.totalApplications.toLocaleString()}
            </div>
            <div className="text-sm text-slate-500">Total Applications</div>
          </div>

          {/* Success Rate */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              {yoyChange.successRate !== 0 && (
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  yoyChange.successRate > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {yoyChange.successRate > 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(yoyChange.successRate)}%
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {(data.platformStatistics.overallSuccessRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-slate-500">Success Rate</div>
          </div>

          {/* Unique Scholars */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-gold-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {data.platformStatistics.uniqueScholars.toLocaleString()}
            </div>
            <div className="text-sm text-slate-500">Unique Scholars</div>
          </div>

          {/* Total Funding */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(data.platformStatistics.totalFunding)}
            </div>
            <div className="text-sm text-slate-500">Total Available Funding</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="container-app py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Application Trends by Year */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              Application Trends by Year
            </h3>
            <div className="space-y-4">
              {data.yearlyTrends.map((year) => (
                <div key={year.academicYear} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-slate-700">
                    {year.academicYear}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-slate-100 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${(year.approvedApplications / Math.max(year.totalApplications, 1)) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-red-400 transition-all duration-500"
                        style={{ width: `${(year.rejectedApplications / Math.max(year.totalApplications, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm font-semibold text-slate-900">
                      {year.totalApplications}
                    </span>
                    <span className="text-xs text-slate-500 block">
                      {year.successRate.toFixed(0)}% success
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-green-500 rounded" /> Approved
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-400 rounded" /> Rejected
                </span>
              </div>
            </div>
          </div>

          {/* Scholarship Types */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary-600" />
              Scholarships by Type
            </h3>
            <div className="space-y-3">
              {data.typeStats.map((type, idx) => {
                const colors = ['bg-primary-500', 'bg-gold-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'];
                const totalCount = data.typeStats.reduce((sum, t) => sum + t.count, 0);
                return (
                  <div key={type.type} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${colors[idx % colors.length]}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-700">{type.type}</div>
                      <div className="text-xs text-slate-500">{type.totalSlots} slots available</div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">{type.count}</span>
                      <span className="text-xs text-slate-500 block">
                        {((type.count / totalCount) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Success Rate by GWA */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-600" />
              Success Rate by GWA
            </h3>
            <div className="space-y-3">
              {data.gwaStats.map((gwa) => (
                <div key={gwa.range} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium text-slate-700">
                    {gwa.range}
                  </div>
                  <div className="flex-1">
                    <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                        style={{ width: `${gwa.successRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold text-slate-900">
                    {gwa.successRate.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Success Rate by Income */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-600" />
              Success Rate by Income Bracket
            </h3>
            <div className="space-y-3">
              {data.incomeStats.map((income) => (
                <div key={income.bracket} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium text-slate-700 truncate" title={income.bracket}>
                    {income.bracket}
                  </div>
                  <div className="flex-1">
                    <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-gold-500 to-gold-600 transition-all duration-500"
                        style={{ width: `${income.successRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold text-slate-900">
                    {income.successRate.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Success Rate by College - Full Width */}
          <div className="lg:col-span-2 card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary-600" />
              Success Rate by College
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {data.collegeStats.map((college) => (
                <div key={college.college} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700 truncate" title={college.college}>
                      {college.college.replace('College of ', '')}
                    </div>
                    <div className="text-xs text-slate-500">
                      {college.approved}/{college.totalApplications} approved
                    </div>
                  </div>
                  <div className="w-24">
                    <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 transition-all duration-500"
                        style={{ width: `${college.successRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm font-bold text-slate-900">
                    {college.successRate.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Model Performance Section */}
      {data.modelMetrics && (
        <div className="container-app pb-8">
          <div className="card p-6 bg-gradient-to-br from-slate-50 to-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-600" />
              Prediction Model Performance
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Our logistic regression model helps predict scholarship approval likelihood based on historical data.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-green-600">{data.modelMetrics.accuracy}%</div>
                <div className="text-sm text-slate-500">Accuracy</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{data.modelMetrics.precision}%</div>
                <div className="text-sm text-slate-500">Precision</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-purple-600">{data.modelMetrics.recall}%</div>
                <div className="text-sm text-slate-500">Recall</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-gold-600">{data.modelMetrics.f1Score}%</div>
                <div className="text-sm text-slate-500">F1 Score</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights Section */}
      <div className="container-app pb-12">
        <div className="card p-8 bg-gradient-to-br from-primary-50 to-gold-50 border-primary-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-600" />
            Key Insights
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Insight 1 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">Highest Success</span>
              </div>
              <p className="text-sm text-slate-600">
                Students with GWA {topGWARange?.range} have the highest success rate at{' '}
                <strong className="text-slate-900">
                  {topGWARange?.successRate.toFixed(0)}%
                </strong>
              </p>
            </div>

            {/* Insight 2 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-primary-600 mb-2">
                <Award className="w-5 h-5" />
                <span className="font-semibold">Most Programs</span>
              </div>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">{data.typeStats[0]?.type}</strong>{' '}
                scholarships have the most programs with{' '}
                {data.typeStats[0]?.count} active offerings
              </p>
            </div>

            {/* Insight 3 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-gold-600 mb-2">
                <Target className="w-5 h-5" />
                <span className="font-semibold">Top College</span>
              </div>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">
                  {topCollege?.college.replace('College of ', '')}
                </strong>{' '}
                students have the highest success rate at{' '}
                {topCollege?.successRate.toFixed(0)}%
              </p>
            </div>

            {/* Insight 4 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Calendar className="w-5 h-5" />
                <span className="font-semibold">Total Scholars</span>
              </div>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">{data.platformStatistics.totalApprovedAllTime}</strong> applications
                have been approved out of {data.platformStatistics.totalApplications} total applications
              </p>
            </div>

            {/* Insight 5 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <PieChart className="w-5 h-5" />
                <span className="font-semibold">Active Scholarships</span>
              </div>
              <p className="text-sm text-slate-600">
                There are currently{' '}
                <strong className="text-slate-900">{data.platformStatistics.activeScholarships}</strong>{' '}
                active scholarship programs available
              </p>
            </div>

            {/* Insight 6 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <BarChart2 className="w-5 h-5" />
                <span className="font-semibold">Platform Growth</span>
              </div>
              <p className="text-sm text-slate-600">
                {yoyChange.applications > 0 ? (
                  <>
                    Applications have increased by{' '}
                    <strong className="text-slate-900">{yoyChange.applications}%</strong>{' '}
                    year-over-year
                  </>
                ) : yoyChange.applications < 0 ? (
                  <>
                    Applications decreased by{' '}
                    <strong className="text-slate-900">{Math.abs(yoyChange.applications)}%</strong>{' '}
                    compared to last year
                  </>
                ) : (
                  'Application volume remained stable compared to last year'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
