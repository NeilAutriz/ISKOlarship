// ============================================================================
// ISKOlarship - Prediction Explanation Modal
// User-friendly explanation of how the ML prediction works
// ============================================================================

import React from 'react';
import {
  X,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  BarChart2,
  Lightbulb,
  Brain,
  BookOpen,
  CheckCircle,
  ArrowRight,
  HelpCircle,
  GraduationCap,
  DollarSign,
  Building2,
  User,
  Target,
  AlertCircle
} from 'lucide-react';
import { PredictionFactor } from '../types';

interface PredictionExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  probability: number;
  probabilityPercentage: number;
  zScore?: number;
  factors: PredictionFactor[];
  modelVersion?: string;
  confidence?: 'low' | 'medium' | 'high';
  scholarshipName?: string;
}

const PredictionExplanationModal: React.FC<PredictionExplanationModalProps> = ({
  isOpen,
  onClose,
  probability,
  probabilityPercentage,
  zScore,
  factors,
  modelVersion,
  confidence,
  scholarshipName
}) => {
  if (!isOpen) return null;

  // Determine if a factor is positive, negative, or neutral
  // Use multiple criteria to determine: met field, rawContribution, or contribution
  const getFactorImpact = (factor: PredictionFactor): 'positive' | 'negative' | 'neutral' => {
    // First check the 'met' field if available
    if (factor.met !== undefined) {
      return factor.met ? 'positive' : 'negative';
    }
    
    // Then check rawContribution
    const rawContrib = factor.rawContribution || 0;
    if (rawContrib > 0.01) return 'positive';
    if (rawContrib < -0.01) return 'negative';
    
    // Check contribution (normalized)
    const contrib = factor.contribution || 0;
    if (contrib > 0.01) return 'positive';
    if (contrib < -0.01) return 'negative';
    
    // Check value
    const value = factor.value || 0;
    if (value >= 0.5) return 'positive';
    if (value < 0.5 && value > 0) return 'negative';
    
    return 'neutral';
  };

  // Group factors by impact
  const positiveFactors = factors.filter(f => getFactorImpact(f) === 'positive');
  const negativeFactors = factors.filter(f => getFactorImpact(f) === 'negative');
  const neutralFactors = factors.filter(f => getFactorImpact(f) === 'neutral');

  // Get icon for factor based on its name
  const getFactorIcon = (factorName: string) => {
    const name = factorName.toLowerCase();
    if (name.includes('eligibility') || name.includes('overall')) return <Target className="w-4 h-4" />;
    if (name.includes('gwa') || name.includes('academic')) return <GraduationCap className="w-4 h-4" />;
    if (name.includes('year level')) return <BookOpen className="w-4 h-4" />;
    if (name.includes('income') || name.includes('financial') || name.includes('st bracket')) return <DollarSign className="w-4 h-4" />;
    if (name.includes('college') || name.includes('course') || name.includes('major')) return <Building2 className="w-4 h-4" />;
    if (name.includes('citizenship') || name.includes('profile')) return <User className="w-4 h-4" />;
    return <BarChart2 className="w-4 h-4" />;
  };

  // Render impact icon (up, down, or neutral)
  const renderImpactIcon = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  // Get impact colors
  const getImpactColors = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          iconBg: 'bg-green-100',
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-700'
        };
      case 'negative':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          iconBg: 'bg-red-100',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-700'
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          iconBg: 'bg-slate-100',
          text: 'text-slate-600',
          badge: 'bg-slate-100 text-slate-600'
        };
    }
  };

  // Render a single factor card
  const renderFactorCard = (factor: PredictionFactor, index: number) => {
    const impact = getFactorImpact(factor);
    const colors = getImpactColors(impact);
    const impactPercent = Math.abs(factor.contribution || 0) * 100;
    
    return (
      <div 
        key={index} 
        className={`p-4 rounded-xl border-l-4 ${colors.bg} ${colors.border}`}
      >
        <div className="flex items-start gap-3">
          {/* Impact Direction Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.iconBg}`}>
            {renderImpactIcon(impact)}
          </div>
          
          {/* Factor Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-500">{getFactorIcon(factor.factor || '')}</span>
              <h4 className="font-semibold text-slate-900 text-sm">{factor.factor}</h4>
            </div>
            
            {factor.description && (
              <p className="text-xs text-slate-600 mb-2 leading-relaxed">{factor.description}</p>
            )}
            
            {/* Visual bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    impact === 'positive' ? 'bg-green-500' :
                    impact === 'negative' ? 'bg-red-500' : 'bg-slate-400'
                  }`}
                  style={{ width: `${Math.min(impactPercent, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                {impact === 'positive' ? '+' : impact === 'negative' ? '-' : ''}
                {impactPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          
          {/* Header */}
          <div className="sticky top-0 bg-primary-600 text-white px-6 py-5 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Understanding Your Prediction</h2>
                  <p className="text-white/80 text-sm">
                    {scholarshipName ? `For: ${scholarshipName}` : 'How we calculated your success probability'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
            <div className="p-6 space-y-6">
              
              {/* =========================== */}
              {/* SECTION 1: Your Result */}
              {/* =========================== */}
              <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
                <div className="flex items-center gap-6">
                  {/* Big Percentage */}
                  <div className={`w-28 h-28 rounded-2xl flex flex-col items-center justify-center ${
                    probability >= 0.7 ? 'bg-green-100' :
                    probability >= 0.4 ? 'bg-amber-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-4xl font-bold ${
                      probability >= 0.7 ? 'text-green-600' :
                      probability >= 0.4 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {probabilityPercentage}%
                    </span>
                    <span className="text-xs text-slate-500 mt-1">Success Rate</span>
                  </div>
                  
                  {/* Description */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {probability >= 0.7 ? '🎉 Great Match!' :
                       probability >= 0.4 ? '👍 Good Potential' : '⚠️ Consider Carefully'}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {probability >= 0.7 
                        ? 'Your profile strongly aligns with this scholarship. Historical data suggests applicants with similar profiles have high approval rates.'
                        : probability >= 0.4 
                        ? 'You have a reasonable chance. Some factors work in your favor while others may need attention.'
                        : 'Your profile has some gaps compared to typical approved applicants. Review the factors below to understand why.'}
                    </p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-primary-200/50">
                  <div className="text-center p-3 bg-white/60 rounded-xl">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-2xl font-bold text-green-600">{positiveFactors.length}</span>
                    </div>
                    <span className="text-xs text-slate-600">Supporting Factors</span>
                  </div>
                  <div className="text-center p-3 bg-white/60 rounded-xl">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-2xl font-bold text-red-600">{negativeFactors.length}</span>
                    </div>
                    <span className="text-xs text-slate-600">Reducing Factors</span>
                  </div>
                  <div className="text-center p-3 bg-white/60 rounded-xl">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Minus className="w-4 h-4 text-slate-500" />
                      <span className="text-2xl font-bold text-slate-600">{neutralFactors.length}</span>
                    </div>
                    <span className="text-xs text-slate-600">Neutral</span>
                  </div>
                </div>
              </div>

              {/* =========================== */}
              {/* SECTION 2: Simple Explanation */}
              {/* =========================== */}
              <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">How Did We Get {probabilityPercentage}%?</h3>
                    <p className="text-sm text-slate-600">Here's a simple breakdown of our prediction process:</p>
                  </div>
                </div>
                
                <div className="space-y-4 ml-2">
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                      <div className="w-0.5 h-full bg-blue-200 my-1"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <h4 className="font-semibold text-slate-800 mb-1">📊 We Looked at Your Profile</h4>
                      <p className="text-sm text-slate-600">
                        We examined {factors.length} different aspects of your profile including your GWA, 
                        financial status, year level, college, and more.
                      </p>
                    </div>
                  </div>
                  
                  {/* Step 2 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                      <div className="w-0.5 h-full bg-blue-200 my-1"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <h4 className="font-semibold text-slate-800 mb-1">⚖️ Each Factor Has Different Importance</h4>
                      <p className="text-sm text-slate-600">
                        Not all factors are equal. For example, GWA and eligibility might be weighted more 
                        heavily than citizenship because they historically predict approval better.
                      </p>
                    </div>
                  </div>
                  
                  {/* Step 3 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">3</div>
                      <div className="w-0.5 h-full bg-blue-200 my-1"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <h4 className="font-semibold text-slate-800 mb-1">🔢 Combined Into a Score</h4>
                      <p className="text-sm text-slate-600">
                        All your factor scores are multiplied by their weights and added together.
                        {zScore !== undefined && (
                          <span className="block mt-1">
                            Your combined score (z-score): <strong className="font-mono bg-white px-2 py-0.5 rounded">{zScore.toFixed(3)}</strong>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Step 4 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">✓</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800 mb-1">📈 Converted to Percentage</h4>
                      <p className="text-sm text-slate-600">
                        The combined score is converted to a probability using a mathematical function. 
                        This gives us your <strong className="text-green-600">{probabilityPercentage}%</strong> success probability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* =========================== */}
              {/* SECTION 3: Important Note */}
              {/* =========================== */}
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900 mb-2">Why Don't the Percentages Add Up to {probabilityPercentage}%?</h3>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      Great question! The percentages shown for each factor (like +27% or +14%) represent 
                      <strong> relative importance</strong> — how much each factor contributed compared to others. 
                      They show the "share" of influence, not direct probability points.
                    </p>
                    <div className="mt-3 p-3 bg-white/60 rounded-lg">
                      <p className="text-xs text-amber-800">
                        <strong>Think of it like a recipe:</strong> If flour is 40% of your ingredients and sugar is 30%, 
                        it doesn't mean your cake is 70% done — it means those are their proportions. Similarly, 
                        our algorithm combines all factor contributions and converts them into the final {probabilityPercentage}%.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* =========================== */}
              {/* SECTION 4: Detailed Factors */}
              {/* =========================== */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-bold text-slate-900">Your Factor Details</h3>
                </div>

                {/* Disclaimer about negative/reducing factors */}
                {negativeFactors.length > 0 && (
                  <div className="bg-white rounded-xl overflow-hidden border border-slate-200 mb-4 shadow-sm">
                    <div className="bg-amber-500 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-white" />
                        <h4 className="font-semibold text-white text-sm">Why Are Some Factors Negative?</h4>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-slate-700 leading-relaxed">
                        A <strong className="text-slate-900">"reducing factor"</strong> means this aspect of your profile is 
                        <strong className="text-slate-900"> less commonly seen among previously approved applicants</strong> for this scholarship. 
                        It does <em>not</em> mean there is anything wrong with your profile.
                      </p>
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          <strong className="text-amber-800">Example:</strong> If most approved applicants had a specific income bracket or college, 
                          different values lower the model's score — but every application is reviewed individually by the committee.
                        </p>
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-primary-500 rounded-full"></span>
                        This prediction is a statistical estimate, not a final decision.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Factors Working For You */}
                {positiveFactors.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-200">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <h4 className="font-semibold text-green-700">
                        Factors That Increase Your Score ({positiveFactors.length})
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {positiveFactors.map((factor, idx) => renderFactorCard(factor, idx))}
                    </div>
                  </div>
                )}
                
                {/* Factors Needing Attention */}
                {negativeFactors.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-200">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <h4 className="font-semibold text-red-700">
                        Factors That Lower Your Score ({negativeFactors.length})
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {negativeFactors.map((factor, idx) => renderFactorCard(factor, idx))}
                    </div>
                  </div>
                )}
                
                {/* Neutral Factors */}
                {neutralFactors.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                      <Minus className="w-4 h-4 text-slate-500" />
                      <h4 className="font-semibold text-slate-600">
                        Neutral Factors ({neutralFactors.length})
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {neutralFactors.map((factor, idx) => renderFactorCard(factor, idx))}
                    </div>
                  </div>
                )}
                
                {/* If no factors */}
                {factors.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No factor details available for this prediction.</p>
                  </div>
                )}
              </div>

              {/* =========================== */}
              {/* SECTION 5: Model Info */}
              {/* =========================== */}
              <div className="bg-slate-100 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary-500" />
                    <span>Model: <strong className="text-slate-900">Logistic Regression</strong></span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <span>Version: <strong className="text-slate-900">{modelVersion || '3.0'}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>Confidence: <strong className={`${
                    confidence === 'high' ? 'text-green-600' :
                    confidence === 'medium' ? 'text-amber-600' : 'text-red-600'
                  }`}>{confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : 'Low'}</strong></span>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="text-center py-3 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  <Info className="w-3.5 h-3.5 inline mr-1" />
                  This prediction is based on historical patterns and is not a guarantee. 
                  Actual results depend on scholarship-specific requirements, available slots, and committee decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionExplanationModal;
