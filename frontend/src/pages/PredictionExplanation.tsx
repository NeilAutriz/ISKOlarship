// ============================================================================
// ISKOlarship - Prediction Explanation Page
// Detailed breakdown of how the ML prediction works with calculations
// ============================================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Brain,
  Calculator,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  GraduationCap,
  DollarSign,
  Building2,
  User,
  Target,
  BookOpen,
  XCircle,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { PredictionFactor, PredictionResult } from '../types';
import { getPredictionForScholarship, getPredictionForApplication } from '../services/api';
import { useAuth } from '../App';

interface LocationState {
  prediction?: PredictionResult;
  scholarshipName?: string;
  scholarshipId?: string;
  applicationId?: string; // For admin viewing applicant's prediction
  fromAdmin?: boolean;
}

const PredictionExplanation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { scholarshipId } = useParams<{ scholarshipId: string }>();
  const { user } = useAuth();
  
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [scholarshipName, setScholarshipName] = useState<string>('');
  const [applicantName, setApplicantName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as LocationState;
    
    // If admin is viewing an application's prediction, fetch fresh data
    if (state?.applicationId && state?.fromAdmin) {
      fetchPredictionForApplication(state.applicationId);
      setScholarshipName(state.scholarshipName || 'Scholarship');
    } else if (state?.prediction) {
      setPrediction(state.prediction);
      setScholarshipName(state.scholarshipName || 'Scholarship');
      setLoading(false);
    } else if (scholarshipId) {
      // Fetch prediction if not passed via state
      fetchPrediction();
    } else {
      setError('No prediction data available');
      setLoading(false);
    }
  }, [location.state, scholarshipId]);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      const result = await getPredictionForScholarship(scholarshipId!);
      setPrediction(result);
      setLoading(false);
    } catch (err) {
      setError('Failed to load prediction data');
      setLoading(false);
    }
  };

  const fetchPredictionForApplication = async (applicationId: string) => {
    try {
      setLoading(true);
      const result = await getPredictionForApplication(applicationId);
      setPrediction(result);
      if (result.applicantName) {
        setApplicantName(result.applicantName);
      }
      if (result.scholarshipName) {
        setScholarshipName(result.scholarshipName);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load prediction data for this application');
      setLoading(false);
    }
  };
  // Determine if a factor is positive, negative, or neutral
  // Based on the actual contribution to the z-score (not just whether criteria was met)
  const getFactorImpact = (factor: PredictionFactor): 'positive' | 'negative' | 'neutral' => {
    // Use rawContribution as the primary indicator - this is what actually affects the prediction
    const rawContrib = factor.rawContribution || 0;
    if (rawContrib > 0.01) return 'positive';
    if (rawContrib < -0.01) return 'negative';
    
    // Fallback to contribution percentage if rawContribution not available
    const contrib = factor.contribution || 0;
    if (contrib > 0.01) return 'positive';
    if (contrib < -0.01) return 'negative';
    
    return 'neutral';
  };

  // Get icon for factor based on its name
  const getFactorIcon = (factorName: string) => {
    const name = factorName.toLowerCase();
    if (name.includes('eligibility') || name.includes('overall')) return <Target className="w-5 h-5" />;
    if (name.includes('gwa') || name.includes('academic')) return <GraduationCap className="w-5 h-5" />;
    if (name.includes('year level')) return <BookOpen className="w-5 h-5" />;
    if (name.includes('income') || name.includes('financial') || name.includes('st bracket')) return <DollarSign className="w-5 h-5" />;
    if (name.includes('college') || name.includes('course') || name.includes('major')) return <Building2 className="w-5 h-5" />;
    if (name.includes('citizenship') || name.includes('profile')) return <User className="w-5 h-5" />;
    return <BarChart2 className="w-5 h-5" />;
  };

  // Render impact icon
  const renderImpactIcon = (impact: 'positive' | 'negative' | 'neutral', size: string = 'w-5 h-5') => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className={`${size} text-green-600`} />;
      case 'negative':
        return <TrendingDown className={`${size} text-red-600`} />;
      default:
        return <Minus className={`${size} text-slate-400`} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading prediction analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Prediction</h2>
          <p className="text-slate-600 mb-6">{error || 'No prediction data available'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const factors = prediction.factors || [];
  const probabilityPercentage = Math.round(prediction.probability * 100);
  const zScore = prediction.zScore;

  // Group factors
  const positiveFactors = factors.filter(f => getFactorImpact(f) === 'positive');
  const negativeFactors = factors.filter(f => getFactorImpact(f) === 'negative');
  const neutralFactors = factors.filter(f => getFactorImpact(f) === 'neutral');

  // Calculate total weighted sum for display
  const totalWeightedSum = factors.reduce((sum, f) => sum + (f.rawContribution || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Prediction Analysis</h1>
              <p className="text-sm text-slate-500">
                {scholarshipName}
                {applicantName && <span className="text-primary-600"> • {applicantName}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section - Your Result */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-primary-600 via-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {applicantName ? `${applicantName}'s Prediction` : 'Your Success Prediction'}
                </h2>
                <p className="text-white/80">Based on machine learning analysis of {applicantName ? 'their' : 'your'} profile</p>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Big Percentage Circle */}
              <div className="relative">
                <div className={`w-40 h-40 rounded-full flex flex-col items-center justify-center border-8 ${
                  prediction.probability >= 0.7 ? 'border-green-200 bg-green-50' :
                  prediction.probability >= 0.4 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
                }`}>
                  <span className={`text-5xl font-bold ${
                    prediction.probability >= 0.7 ? 'text-green-600' :
                    prediction.probability >= 0.4 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {probabilityPercentage}%
                  </span>
                  <span className="text-sm text-slate-500 mt-1">Success Rate</span>
                </div>
              </div>
              
              {/* Description */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  {prediction.probability >= 0.7 ? '🎉 Excellent Match!' :
                   prediction.probability >= 0.4 ? '👍 Good Potential' : '⚠️ Consider Carefully'}
                </h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  {prediction.probability >= 0.7 
                    ? 'Your profile strongly aligns with this scholarship. Historical data suggests applicants with similar profiles have high approval rates.'
                    : prediction.probability >= 0.4 
                    ? 'You have a reasonable chance at this scholarship. Some factors work in your favor while others may need attention.'
                    : 'Your profile has some gaps compared to typical approved applicants. Review the detailed breakdown below to understand why.'}
                </p>
                
                {/* Quick Stats */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">{positiveFactors.length} in your favor</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-100 rounded-full">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">{negativeFactors.length} to improve</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                    <Minus className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-600">{neutralFactors.length} neutral</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">How We Calculated Your Score</h2>
              <p className="text-slate-500">A step-by-step breakdown of the prediction process</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">1</div>
              <div className="pt-2">
                <h4 className="font-bold text-slate-900 mb-2">Profile Analysis</h4>
                <p className="text-sm text-slate-600">We extracted {factors.length} key factors from your profile (GWA, income, year level, etc.)</p>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">2</div>
              <div className="pt-2">
                <h4 className="font-bold text-slate-900 mb-2">Weight Assignment</h4>
                <p className="text-sm text-slate-600">Each factor has a learned weight based on historical approval patterns</p>
              </div>
            </div>
            
            {/* Step 3 */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">3</div>
              <div className="pt-2">
                <h4 className="font-bold text-slate-900 mb-2">Score Calculation</h4>
                <p className="text-sm text-slate-600">Your values × weights are summed to create a combined score</p>
              </div>
            </div>
            
            {/* Step 4 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">4</div>
              <div className="pt-2">
                <h4 className="font-bold text-slate-900 mb-2">Probability</h4>
                <p className="text-sm text-slate-600">The score is converted to {probabilityPercentage}% probability using sigmoid function</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Calculation Table */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 py-6">
            <div className="flex items-center gap-3">
              <Calculator className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Detailed Calculation Breakdown</h2>
            </div>
            <p className="text-slate-300 mt-1">Weight × Your Score = Contribution to final prediction</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Factor</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-slate-600">Your Score</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-slate-600">×</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-slate-600">Weight</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-slate-600">=</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-slate-600">Contribution</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-slate-600">Impact</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((factor, index) => {
                  const impact = getFactorImpact(factor);
                  const value = factor.value || 0;
                  const weight = factor.weight || 0;
                  const contribution = factor.rawContribution || (value * weight);
                  
                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-slate-100 ${
                        impact === 'positive' ? 'bg-green-50/50' :
                        impact === 'negative' ? 'bg-red-50/50' : 'bg-white'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            impact === 'positive' ? 'bg-green-100 text-green-600' :
                            impact === 'negative' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {getFactorIcon(factor.factor || '')}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{factor.factor}</p>
                            {factor.description && (
                              <p className="text-xs text-slate-500 max-w-xs truncate">{factor.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-mono text-lg font-semibold text-slate-900">
                          {value.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-400 font-bold">×</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-mono text-lg font-semibold ${
                          weight > 0 ? 'text-blue-600' : weight < 0 ? 'text-orange-600' : 'text-slate-500'
                        }`}>
                          {weight >= 0 ? '+' : ''}{weight.toFixed(3)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-400 font-bold">=</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-mono text-lg font-bold px-3 py-1 rounded-lg ${
                          contribution > 0 ? 'bg-green-100 text-green-700' :
                          contribution < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {contribution >= 0 ? '+' : ''}{contribution.toFixed(3)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {renderImpactIcon(impact, 'w-6 h-6')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {/* Intercept row */}
                <tr className="bg-slate-100 border-t-2 border-slate-300">
                  <td colSpan={5} className="px-6 py-3 text-right font-medium text-slate-600">
                    Model Intercept (baseline):
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-lg font-semibold text-slate-700">
                      {prediction.intercept !== undefined ? (prediction.intercept >= 0 ? '+' : '') + prediction.intercept.toFixed(3) : '-2.500'}
                    </span>
                  </td>
                  <td></td>
                </tr>
                {/* Sum of contributions row */}
                <tr className="bg-slate-200">
                  <td colSpan={5} className="px-6 py-3 text-right font-medium text-slate-600">
                    + Sum of Contributions:
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-lg font-semibold text-slate-700">
                      {totalWeightedSum >= 0 ? '+' : ''}{totalWeightedSum.toFixed(3)}
                    </span>
                  </td>
                  <td></td>
                </tr>
                {/* Combined z-score row */}
                <tr className="bg-slate-900 text-white">
                  <td colSpan={5} className="px-6 py-4 text-right font-semibold">
                    = Combined Score (z-score):
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-mono text-xl font-bold">
                      {zScore !== undefined ? zScore.toFixed(3) : (totalWeightedSum + (prediction.intercept || -2.5)).toFixed(3)}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Formula Explanation */}
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Final Conversion</h4>
                <p className="text-sm text-slate-600 mb-3">
                  The combined score ({zScore !== undefined ? zScore.toFixed(3) : totalWeightedSum.toFixed(3)}) is converted to a probability using the sigmoid function:
                </p>
                <div className="bg-white rounded-xl p-4 border border-slate-200 font-mono text-center">
                  <span className="text-slate-600">P = 1 / (1 + e</span>
                  <sup className="text-slate-600">-({zScore !== undefined ? zScore.toFixed(3) : 'z'})</sup>
                  <span className="text-slate-600">) = </span>
                  <span className="text-2xl font-bold text-primary-600">{probabilityPercentage}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-slate-600">In Your Favor</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{positiveFactors.length}</p>
            <p className="text-xs text-slate-500 mt-1">factors supporting approval</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-slate-600">To Consider</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{negativeFactors.length}</p>
            <p className="text-xs text-slate-500 mt-1">factors needing attention</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-slate-400">
            <div className="flex items-center gap-3 mb-2">
              <Minus className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">Neutral</span>
            </div>
            <p className="text-3xl font-bold text-slate-600">{neutralFactors.length}</p>
            <p className="text-xs text-slate-500 mt-1">factors with no impact</p>
          </div>
        </div>

        {/* Recommendation */}
        {prediction.recommendation && (
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-6 border border-primary-200 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Recommendation</h3>
                <p className="text-slate-700">{prediction.recommendation}</p>
              </div>
            </div>
          </div>
        )}

        {/* Model Info Footer */}
        <div className="text-center">
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-white rounded-full shadow-sm text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary-500" />
              Logistic Regression Model
            </span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>Version {prediction.modelVersion || '3.0'}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>Confidence: {prediction.confidence || 'Medium'}</span>
          </div>
          
          <p className="text-xs text-slate-400 mt-4 max-w-2xl mx-auto">
            <Info className="w-3.5 h-3.5 inline mr-1" />
            This prediction is based on historical patterns and is not a guarantee. 
            Actual results depend on scholarship-specific requirements, available slots, and committee decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PredictionExplanation;
