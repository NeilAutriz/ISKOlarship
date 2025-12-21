// ============================================================================
// ISKOlarship - Home Page
// Homepage with hero, features, process steps, and scholarship preview
// Based on research paper Figures 3-6
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Filter,
  Brain,
  CheckCircle,
  ArrowRight,
  Users,
  Award,
  TrendingUp,
  Clock,
  ChevronRight,
  Sparkles,
  Target,
  BarChart3,
  Shield,
  Zap
} from 'lucide-react';
import { scholarships, getScholarshipStats, getUpcomingDeadlines } from '../data/scholarships';
import { platformStatistics } from '../data/mockHistoricalData';
import { Scholarship } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [upcomingScholarships, setUpcomingScholarships] = useState<Scholarship[]>([]);
  const stats = getScholarshipStats();

  useEffect(() => {
    // Get scholarships with upcoming deadlines
    const upcoming = getUpcomingDeadlines(5);
    setUpcomingScholarships(upcoming);
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

  // Format date
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  // Calculate days until deadline
  const getDaysUntil = (date: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(date);
    deadline.setHours(0, 0, 0, 0);
    return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Hero Section ===== */}
      <section className="relative bg-gradient-to-br from-uplb-900 via-uplb-800 to-uplb-900 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold-400 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-uplb-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="container-app relative z-10 py-20 md:py-28 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <span className="text-sm font-medium">UPLB Scholarship Discovery Platform</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Find Your Perfect{' '}
              <span className="text-gold-400">Scholarship</span>{' '}
              Match
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              ISKOlarship uses intelligent rule-based filtering and machine learning 
              to match you with scholarships you're eligible for at UPLB.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                to="/scholarships"
                className="btn-primary flex items-center gap-2 px-8 py-4 text-lg"
              >
                <Search className="w-5 h-5" />
                Browse Scholarships
              </Link>
              <Link
                to="/dashboard"
                className="btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 flex items-center gap-2 px-8 py-4 text-lg"
              >
                Get Matched
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gold-400">
                  {stats.totalScholarships}
                </div>
                <div className="text-sm text-slate-400 mt-1">Scholarships</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gold-400">
                  {platformStatistics.totalApplicationsAllTime.toLocaleString()}+
                </div>
                <div className="text-sm text-slate-400 mt-1">Applications</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gold-400">
                  {platformStatistics.overallSuccessRate.toFixed(0)}%
                </div>
                <div className="text-sm text-slate-400 mt-1">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gold-400">
                  {formatCurrency(stats.totalFunding)}
                </div>
                <div className="text-sm text-slate-400 mt-1">Total Funding</div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f8fafc"/>
          </svg>
        </div>
      </section>

      {/* ===== Features Section ===== */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container-app">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
              How ISKOlarship Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Our intelligent matching system uses advanced algorithms to find 
              scholarships that fit your unique profile.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1: Rule-Based Filtering */}
            <div className="card p-8 text-center group hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-uplb-100 to-uplb-200 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Filter className="w-8 h-8 text-uplb-700" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Rule-Based Filtering
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Our system applies strict eligibility criteria including GWA requirements, 
                year level, college, income brackets, and more to filter scholarships.
              </p>
            </div>

            {/* Feature 2: ML Prediction */}
            <div className="card p-8 text-center group hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-8 h-8 text-gold-700" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Success Prediction
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Logistic regression analyzes historical data to predict your probability 
                of success for each scholarship based on your profile.
              </p>
            </div>

            {/* Feature 3: Smart Matching */}
            <div className="card p-8 text-center group hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-8 h-8 text-green-700" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Personalized Matching
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Get personalized recommendations based on your academic profile, 
                financial situation, and specific scholarship requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Process Steps Section ===== */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-app">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
              Get Started in 3 Easy Steps
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Finding the right scholarship has never been easier. Follow these 
              simple steps to discover opportunities tailored for you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-uplb-200 via-uplb-400 to-uplb-200"></div>

            {/* Step 1 */}
            <div className="relative">
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-uplb-100 to-uplb-200 flex items-center justify-center mx-auto mb-6 relative z-10">
                  <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-uplb-700 text-white font-bold flex items-center justify-center text-lg">
                    1
                  </div>
                  <Users className="w-14 h-14 text-uplb-700" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Create Your Profile
                </h3>
                <p className="text-slate-600">
                  Sign up and fill in your academic details, financial information, 
                  and other relevant criteria.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center mx-auto mb-6 relative z-10">
                  <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gold-600 text-white font-bold flex items-center justify-center text-lg">
                    2
                  </div>
                  <Search className="w-14 h-14 text-gold-700" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Browse & Filter
                </h3>
                <p className="text-slate-600">
                  Our system automatically matches you with scholarships based on 
                  your eligibility criteria.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mx-auto mb-6 relative z-10">
                  <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-green-600 text-white font-bold flex items-center justify-center text-lg">
                    3
                  </div>
                  <CheckCircle className="w-14 h-14 text-green-700" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Apply with Confidence
                </h3>
                <p className="text-slate-600">
                  View your success probability and apply to scholarships where 
                  you have the best chances.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link
              to="/dashboard"
              className="btn-primary inline-flex items-center gap-2 px-8 py-4"
            >
              Start Finding Scholarships
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Available Scholarships Preview ===== */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container-app">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">
                Available Scholarships
              </h2>
              <p className="text-lg text-slate-600 max-w-xl">
                Explore scholarships offered through the UPLB Office of Scholarships 
                and Grants (OSG).
              </p>
            </div>
            <Link
              to="/scholarships"
              className="mt-4 md:mt-0 text-uplb-700 font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all"
            >
              View All Scholarships
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Scholarship Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scholarships.slice(0, 6).map((scholarship) => (
              <div
                key={scholarship.id}
                className="card p-6 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/scholarships/${scholarship.id}`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <span className={`badge ${
                      scholarship.type === 'Financial Assistance' 
                        ? 'badge-warning' 
                        : scholarship.type === 'Thesis/Research Grant'
                        ? 'badge-info'
                        : 'badge-success'
                    } mb-2`}>
                      {scholarship.type}
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-uplb-700 transition-colors line-clamp-2">
                      {scholarship.name}
                    </h3>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-gold-600" />
                  <span className="text-lg font-semibold text-gold-700">
                    {formatCurrency(scholarship.awardAmount || 0)}
                  </span>
                </div>

                {/* Key Requirements */}
                <div className="space-y-2 mb-4">
                  {scholarship.eligibilityCriteria?.minGWA && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <TrendingUp className="w-4 h-4 text-slate-400" />
                      <span>Min GWA: {scholarship.eligibilityCriteria.minGWA.toFixed(2)}</span>
                    </div>
                  )}
                  {scholarship.eligibilityCriteria?.eligibleColleges && scholarship.eligibilityCriteria.eligibleColleges.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <GraduationCap className="w-4 h-4 text-slate-400" />
                      <span className="truncate">
                        {scholarship.eligibilityCriteria.eligibleColleges.length === 1
                          ? scholarship.eligibilityCriteria.eligibleColleges[0]
                          : `${scholarship.eligibilityCriteria.eligibleColleges.length} colleges`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Deadline */}
                {scholarship.applicationDeadline && (
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span>Deadline: {formatDate(scholarship.applicationDeadline)}</span>
                      </div>
                      {getDaysUntil(scholarship.applicationDeadline) > 0 && getDaysUntil(scholarship.applicationDeadline) <= 14 && (
                        <span className="text-orange-600 font-medium">
                          {getDaysUntil(scholarship.applicationDeadline)} days left
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Why Choose ISKOlarship ===== */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-app">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-6">
                Why Choose ISKOlarship?
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Traditional scholarship searches are time-consuming and often lead to 
                applying for opportunities you don't qualify for. ISKOlarship solves 
                this with intelligent matching technology.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-uplb-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-uplb-700" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Save Time</h4>
                    <p className="text-slate-600">
                      No more manually checking eligibility requirements. Get instantly 
                      matched with scholarships you qualify for.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gold-100 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-6 h-6 text-gold-700" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Data-Driven Insights</h4>
                    <p className="text-slate-600">
                      View your success probability based on historical application data 
                      and machine learning analysis.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-green-700" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Official UPLB Data</h4>
                    <p className="text-slate-600">
                      All scholarship information comes directly from the UPLB Office of 
                      Scholarships and Grants (OSG).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Stats Card */}
            <div className="bg-gradient-to-br from-uplb-800 to-uplb-900 rounded-3xl p-8 md:p-12 text-white">
              <h3 className="text-2xl font-bold mb-8">Platform Statistics</h3>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-4xl font-bold text-gold-400 mb-2">
                    {stats.totalScholarships}
                  </div>
                  <div className="text-slate-300">Active Scholarships</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-gold-400 mb-2">
                    {Object.keys(stats.byType).length}
                  </div>
                  <div className="text-slate-300">Scholarship Types</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-gold-400 mb-2">
                    {platformStatistics.totalApprovedAllTime.toLocaleString()}+
                  </div>
                  <div className="text-slate-300">Students Helped</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-gold-400 mb-2">
                    {stats.totalSlots}
                  </div>
                  <div className="text-slate-300">Available Slots</div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/20">
                <div className="text-sm text-slate-300 mb-2">Average Success Rate</div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full"
                    style={{ width: `${platformStatistics.overallSuccessRate}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-gold-400 font-semibold">
                  {platformStatistics.overallSuccessRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA Section ===== */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-uplb-800 to-uplb-900 text-white">
        <div className="container-app text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Ready to Find Your Scholarship?
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              Create your profile and let ISKOlarship match you with scholarships 
              you're eligible for. It only takes a few minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="btn bg-gold-500 hover:bg-gold-600 text-uplb-900 font-semibold px-8 py-4 text-lg"
              >
                Create Free Account
              </Link>
              <Link
                to="/scholarships"
                className="btn bg-white/10 border border-white/20 text-white hover:bg-white/20 px-8 py-4 text-lg"
              >
                Browse as Guest
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;