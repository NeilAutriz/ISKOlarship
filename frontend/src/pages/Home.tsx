// ============================================================================
// ISKOlarship - Home Page
// Redesigned to match Figma mockup with blue theme
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Shield,
  BarChart3,
  Target,
  Zap,
  BookOpen,
  Users,
  Award,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Star,
  CheckCircle,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Brain
} from 'lucide-react';
import { scholarships, getScholarshipStats } from '../data/scholarships';
import { platformStatistics } from '../data/mockHistoricalData';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const stats = getScholarshipStats();

  // Animated counter hook
  const useCounter = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      let start = 0;
      const increment = end / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }, [end, duration]);
    return count;
  };

  // Featured scholarships (top 6)
  const featuredScholarships = scholarships.slice(0, 6);

  // Color schemes for scholarship cards
  const cardColors = [
    'border-t-primary-600',
    'border-t-purple-500',
    'border-t-success-500',
    'border-t-orange-500',
    'border-t-gold-400',
    'border-t-cyan-500'
  ];

  const iconBgColors = [
    'bg-primary-600',
    'bg-purple-500',
    'bg-success-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ================================================================
          HERO SECTION
          ================================================================ */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/UPLB_Oblation.jpg/1280px-UPLB_Oblation.jpg)'
          }}
        />
        
        {/* Blue Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/90 via-primary-700/85 to-primary-800/90" />
        
        {/* Dotted pattern background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />
        </div>

        <div className="container-app relative z-10 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              {/* AI Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">AI-Powered Matching System</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
                Find Your Perfect<br />
                Scholarship Match
              </h1>

              <p className="text-lg text-white/80 mb-8 max-w-xl">
                Join thousands of UPLB students discovering scholarship opportunities 
                tailored to their unique profile with our intelligent matching algorithm.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 mb-12">
                <Link
                  to="/scholarships"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg"
                >
                  Start Matching Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/50 text-white font-semibold rounded-xl hover:bg-white/10 transition-all"
                >
                  See How It Works
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-white/30 border-2 border-white flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="font-bold text-lg">500+ Students</div>
                  <div className="text-white/70 text-sm">Active Users</div>
                </div>
                <div className="h-10 w-px bg-white/30" />
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 text-gold-400 fill-gold-400" />
                    ))}
                  </div>
                  <span className="text-sm text-white/70">4.9/5 Rating</span>
                </div>
              </div>
            </div>

            {/* Right Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Active Students */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-white">500+</div>
                <div className="text-white/70">Active Students</div>
              </div>

              {/* Scholarships */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-white">{stats.totalScholarships}+</div>
                <div className="text-white/70">Scholarships</div>
              </div>

              {/* Total Awards */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-xl">₱</span>
                </div>
                <div className="text-3xl font-bold text-white">₱15M+</div>
                <div className="text-white/70">Total Awards</div>
              </div>

              {/* Success Rate */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-white">85%</div>
                <div className="text-white/70">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          ABOUT SECTION
          ================================================================ */}
      <section className="py-20 bg-white">
        <div className="container-app">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-600 rounded-full text-sm font-medium mb-6">
                About ISKOlarship
              </div>

              <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4">
                Connecting Dreams to<br />
                <span className="text-primary-600">Opportunities</span>
              </h2>

              <p className="text-lg text-slate-600 mb-8">
                ISKOlarship revolutionizes scholarship discovery for UPLB students. 
                Our intelligent platform analyzes your academic achievements, 
                financial needs, and personal background to match you with the most 
                relevant opportunities.
              </p>

              {/* Features List */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gold-100 rounded-xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-gold-600" />
                  </div>
                  <span className="text-slate-700 font-medium">AI-powered matching algorithm</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-success-600" />
                  </div>
                  <span className="text-slate-700 font-medium">Secure and confidential data handling</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="text-slate-700 font-medium">Instant results and real-time updates</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-8 mb-8">
                <div className="border-2 border-primary-100 rounded-xl p-4">
                  <div className="text-3xl font-bold text-primary-600">12K+</div>
                  <div className="text-slate-500 text-sm">Applications Processed</div>
                </div>
                <div className="border-2 border-primary-100 rounded-xl p-4">
                  <div className="text-3xl font-bold text-primary-600">98%</div>
                  <div className="text-slate-500 text-sm">Satisfaction Rate</div>
                </div>
              </div>

              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all"
              >
                Create Your Profile
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="bg-gradient-to-br from-primary-100 to-primary-200 rounded-3xl p-4 shadow-2xl">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/UPLB_Main_Library_%28SU_Bldg%29.jpg/1280px-UPLB_Main_Library_%28SU_Bldg%29.jpg"
                  alt="UPLB Main Library - University of the Philippines Los Baños"
                  className="rounded-2xl w-full aspect-[4/3] object-cover"
                />
              </div>
              {/* Floating Achievement Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gold-400 rounded-xl flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">85%</div>
                    <div className="text-sm text-slate-500">Match Accuracy</div>
                  </div>
                </div>
              </div>
              {/* Floating Students Badge */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">500+</div>
                    <div className="text-xs text-slate-500">Active Students</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          FEATURES SECTION
          ================================================================ */}
      <section className="py-20 bg-slate-50">
        <div className="container-app">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium mb-6">
              Platform Features
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4">
              Everything You Need to <span className="text-primary-600">Succeed</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful features designed to simplify your scholarship journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Smart Matching */}
            <div className="bg-white rounded-2xl p-8 border-l-4 border-primary-600 shadow-sm hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                <Search className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Matching</h3>
              <p className="text-slate-600">
                Advanced algorithms analyze your profile against hundreds of scholarship 
                criteria to find your perfect matches instantly.
              </p>
            </div>

            {/* Feature 2: Secure Platform */}
            <div className="bg-white rounded-2xl p-8 border-l-4 border-success-500 shadow-sm hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-success-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-success-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Secure Platform</h3>
              <p className="text-slate-600">
                Bank-level encryption protects your personal and academic information 
                throughout your scholarship journey.
              </p>
            </div>

            {/* Feature 3: Eligibility Scores */}
            <div className="bg-white rounded-2xl p-8 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Eligibility Scores</h3>
              <p className="text-slate-600">
                Get detailed percentage-based eligibility ratings to help you prioritize 
                your applications strategically.
              </p>
            </div>

            {/* Feature 4: Application Tracking */}
            <div className="bg-white rounded-2xl p-8 border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Application Tracking</h3>
              <p className="text-slate-600">
                Monitor all your applications in one dashboard with real-time status 
                updates and deadline reminders.
              </p>
            </div>

            {/* Feature 5: Instant Results */}
            <div className="bg-white rounded-2xl p-8 border-l-4 border-pink-500 shadow-sm hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Results</h3>
              <p className="text-slate-600">
                Lightning-fast search and filtering capabilities deliver scholarship 
                matches in seconds, not hours.
              </p>
            </div>

            {/* Feature 6: Resource Center */}
            <div className="bg-white rounded-2xl p-8 border-l-4 border-cyan-500 shadow-sm hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-6">
                <BookOpen className="w-7 h-7 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Resource Center</h3>
              <p className="text-slate-600">
                Access comprehensive guides, application tips, and success stories 
                to maximize your chances.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          HOW IT WORKS SECTION
          ================================================================ */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container-app">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4">
              Your Journey to <span className="text-primary-600">Success</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Four intelligent steps to discover and secure scholarships
            </p>
          </div>

          {/* Timeline */}
          <div className="relative mb-12">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-8 left-1/2 transform -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-purple-500 via-primary-500 to-success-500" />
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4 font-bold">
                    01
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Create Your Profile</h3>
                  <p className="text-slate-600 text-sm mb-4">
                    Build a comprehensive profile with your academic achievements, 
                    financial information, and personal details.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> Academic Records
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> Financial Data
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> Personal Info
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4 font-bold">
                    02
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Get Matched Instantly</h3>
                  <p className="text-slate-600 text-sm mb-4">
                    Our intelligent algorithm analyzes your profile and generates 
                    personalized matches with eligibility scores.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> AI Matching
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> Eligibility Scores
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> Ranked Results
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4 font-bold">
                    03
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">ML Success Projections</h3>
                  <p className="text-slate-600 text-sm mb-4">
                    Advanced logistic regression analyzes historical data from 
                    previous students to predict your scholarship success probability.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> Predictive Analytics
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> Historical Data
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> Success Probability
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-16 h-16 bg-success-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4 font-bold">
                    04
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Apply & Track</h3>
                  <p className="text-slate-600 text-sm mb-4">
                    Submit applications through our platform and receive real-time 
                    updates with automated reminders.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> One-Click Apply
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> Status Tracking
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3" /> Deadline Alerts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-success-500 text-white font-semibold rounded-xl hover:bg-success-600 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Start Your Journey
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
          FEATURED SCHOLARSHIPS SECTION
          ================================================================ */}
      <section className="py-20 bg-white">
        <div className="container-app">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-600 rounded-full text-sm font-medium mb-6">
              Available Programs
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4">
              Featured <span className="text-primary-600">Scholarships</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Browse our most popular scholarship opportunities
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {featuredScholarships.map((scholarship, index) => (
              <div
                key={scholarship.id}
                onClick={() => navigate(`/scholarships/${scholarship.id}`)}
                className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 border-t-4 ${cardColors[index % cardColors.length]} cursor-pointer hover:shadow-md transition-all`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${iconBgColors[index % iconBgColors.length]} rounded-xl flex items-center justify-center`}>
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-600 rounded-full text-xs font-medium">
                    {Math.floor(Math.random() * 30 + 20)} Students
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2">
                  {scholarship.name}
                </h3>
                <p className="text-slate-500 text-sm mb-4">{scholarship.sponsor}</p>

                <div className="text-2xl font-bold text-slate-900 mb-4">
                  ₱{((scholarship.awardAmount || 0) / 1000).toFixed(0)},000 <span className="text-sm font-normal text-slate-500">per semester</span>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {scholarship.eligibilityCriteria?.eligibleColleges?.[0] || 'All Academic Programs'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/scholarships"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all"
            >
              Explore All Scholarships
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
          CTA SECTION
          ================================================================ */}
      <section className="relative py-24 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/UPLB_Carillon.jpg/1280px-UPLB_Carillon.jpg)'
          }}
        />
        
        {/* Blue Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/90 via-primary-700/85 to-primary-800/90" />
        
        {/* Dotted pattern background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />
        </div>

        <div className="container-app relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Join Our Community</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            Ready to Find Your Perfect<br />Scholarship?
          </h2>

          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join hundreds of successful UPLB students who discovered their 
            scholarship opportunities through ISKOlarship
          </p>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-lg"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ================================================================
          CONTACT SECTION
          ================================================================ */}
      <section className="py-20 bg-white">
        <div className="container-app">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-600 rounded-full text-sm font-medium mb-6">
              Get In Touch
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4">
              We're Here to <span className="text-primary-600">Help</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Have questions? Our support team is ready to assist you
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Email */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 border-t-4 border-t-primary-600 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Email Support</h3>
              <a href="mailto:support@iskolarship.ph" className="text-primary-600 font-medium hover:underline">
                support@iskolarship.ph
              </a>
              <p className="text-slate-500 text-sm mt-2">24-hour response time</p>
            </div>

            {/* Phone */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 border-t-4 border-t-success-500 text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8 text-success-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Phone Support</h3>
              <a href="tel:+6328123-4567" className="text-success-600 font-medium hover:underline">
                +63 (2) 8123-4567
              </a>
              <p className="text-slate-500 text-sm mt-2">Mon-Fri, 9AM - 5PM</p>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 border-t-4 border-t-purple-500 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Office Location</h3>
              <span className="text-purple-600 font-medium">
                Metro Manila, PH
              </span>
              <p className="text-slate-500 text-sm mt-2">By appointment</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
