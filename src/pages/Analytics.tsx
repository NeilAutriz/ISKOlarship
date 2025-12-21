// ============================================================================
// ISKOlarship - Analytics Page
// Platform-wide analytics and scholarship statistics
// ============================================================================

import React, { useMemo } from 'react';
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
  ArrowDownRight
} from 'lucide-react';
import DataVisualization from '../components/DataVisualization';
import { scholarshipStatistics, platformStatistics } from '../data/mockHistoricalData';
import { scholarships, getScholarshipStats } from '../data/scholarships';

const Analytics: React.FC = () => {
  const stats = getScholarshipStats();

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate year-over-year change (mock data)
  const yoyChange = {
    applications: 10.8,
    successRate: 2.3,
    scholars: 15.2,
    funding: 8.5
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-uplb-800 to-uplb-900">
        <div className="container-app py-8 md:py-12">
          <div className="flex items-center gap-3 text-gold-400 mb-2">
            <BarChart2 className="w-6 h-6" />
            <span className="text-sm font-medium uppercase tracking-wider">Analytics</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Platform Statistics
          </h1>
          <p className="text-slate-300 max-w-2xl">
            Explore historical data and trends related to scholarship applications, 
            success rates, and funding distribution at UPLB.
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="container-app -mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Applications */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-uplb-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-uplb-600" />
              </div>
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
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {platformStatistics.totalApplications.toLocaleString()}
            </div>
            <div className="text-sm text-slate-500">Total Applications</div>
          </div>

          {/* Success Rate */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
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
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {(platformStatistics.overallSuccessRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-slate-500">Success Rate</div>
          </div>

          {/* Unique Scholars */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-gold-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                yoyChange.scholars > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {yoyChange.scholars > 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {Math.abs(yoyChange.scholars)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {platformStatistics.uniqueScholars.toLocaleString()}
            </div>
            <div className="text-sm text-slate-500">Unique Scholars</div>
          </div>

          {/* Total Funding */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                yoyChange.funding > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {yoyChange.funding > 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {Math.abs(yoyChange.funding)}%
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.totalFunding)}
            </div>
            <div className="text-sm text-slate-500">Total Available Funding</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="container-app py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Application Trends */}
          <DataVisualization
            type="applicationTrend"
            height={350}
          />

          {/* Scholarships by Type */}
          <DataVisualization
            type="scholarshipsByType"
            height={350}
          />

          {/* Success Rate by GWA */}
          <DataVisualization
            type="successByGwa"
            height={300}
          />

          {/* Success Rate by Income */}
          <DataVisualization
            type="successByIncome"
            height={300}
          />

          {/* Success Rate by College */}
          <div className="lg:col-span-2">
            <DataVisualization
              type="successByCollege"
              height={300}
            />
          </div>

          {/* Funding Distribution */}
          <div className="lg:col-span-2">
            <DataVisualization
              type="fundingDistribution"
              height={400}
            />
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="container-app pb-12">
        <div className="card p-8 bg-gradient-to-br from-uplb-50 to-gold-50 border-uplb-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-uplb-600" />
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
                Students with GWA 1.0-1.5 have the highest success rate at{' '}
                <strong className="text-slate-900">
                  {(scholarshipStatistics.successRateByGWA[3]?.rate * 100).toFixed(0)}%
                </strong>
              </p>
            </div>

            {/* Insight 2 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-uplb-600 mb-2">
                <Award className="w-5 h-5" />
                <span className="font-semibold">Most Popular Type</span>
              </div>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">Financial Assistance</strong>{' '}
                scholarships make up the largest category with{' '}
                {stats.typeBreakdown.find(t => t.type === 'Financial Assistance')?.count || 0} active programs
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
                  {scholarshipStatistics.successRateByCollege[0]?.college}
                </strong>{' '}
                students have the highest success rate at{' '}
                {(scholarshipStatistics.successRateByCollege[0]?.rate * 100).toFixed(0)}%
              </p>
            </div>

            {/* Insight 4 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Calendar className="w-5 h-5" />
                <span className="font-semibold">Year Level Trend</span>
              </div>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">Seniors</strong> have the highest 
                success rate, likely due to thesis grants and final-year scholarships
              </p>
            </div>

            {/* Insight 5 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <PieChart className="w-5 h-5" />
                <span className="font-semibold">Income Factor</span>
              </div>
              <p className="text-sm text-slate-600">
                Students in the lowest income bracket have{' '}
                <strong className="text-slate-900">higher approval rates</strong>{' '}
                for need-based scholarships
              </p>
            </div>

            {/* Insight 6 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <BarChart2 className="w-5 h-5" />
                <span className="font-semibold">Growing Platform</span>
              </div>
              <p className="text-sm text-slate-600">
                Applications have increased by{' '}
                <strong className="text-slate-900">{yoyChange.applications}%</strong>{' '}
                year-over-year, showing growing awareness
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;