// ============================================================================
// ISKOlarship - Model Training Admin Page
// Manage and train logistic regression models per scholarship
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  BarChart3,
  Target,
  TrendingUp,
  Database,
  Loader2,
  Play,
  Trash2,
  Star,
  Globe,
  Info,
  Shield,
  Bot,
  Clock,
  SkipForward
} from 'lucide-react';
import { trainingApi } from '../../services/apiClient';

interface TrainedModel {
  _id: string;
  name: string;
  modelType: string;
  scholarshipId: { name: string; scholarshipType: string } | null;
  isActive: boolean;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  trainingStats: {
    totalSamples: number;
    approvedCount: number;
    rejectedCount: number;
  };
  featureImportance: Record<string, number>;
  trainedAt: string;
  triggerType?: 'manual' | 'auto_status_change' | 'auto_global_refresh';
}

interface TrainingStats {
  totalApplications: number;
  approvedCount: number;
  rejectedCount: number;
  totalModels: number;
  activeModels: number;
  scholarshipsWithData: number;
  scholarshipsWithEnoughData: number;
  minSamplesRequired: number;
}

interface TrainableScholarship {
  _id: string;
  name: string;
  scholarshipType: string;
  applicationCount: number;
  isTrainable: boolean;
}

interface AutoTrainingStatus {
  enabled: boolean;
  globalDecisionCounter: number;
  decisionsUntilGlobalRetrain: number;
  activeLocks: string[];
  todaySummary: {
    totalAutoTrains: number;
    scholarshipTrains: number;
    globalTrains: number;
  };
  lastEvent: {
    timestamp: string;
    type: string;
    scope?: string;
    scholarshipName?: string;
    accuracy?: number;
    error?: string;
  } | null;
}

interface AutoTrainingLogEntry {
  timestamp: string;
  type: string;
  scope?: string;
  scholarshipId?: string;
  scholarshipName?: string;
  accuracy?: number;
  elapsed?: number;
  error?: string;
  reason?: string;
}

const ModelTraining: React.FC = () => {
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [trainableScholarships, setTrainableScholarships] = useState<TrainableScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainingTarget, setTrainingTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScopeError, setIsScopeError] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [autoStatus, setAutoStatus] = useState<AutoTrainingStatus | null>(null);
  const [autoLog, setAutoLog] = useState<AutoTrainingLogEntry[]>([]);
  const [showAutoLog, setShowAutoLog] = useState(false);

  // Feature display names
  const featureDisplayNames: Record<string, string> = {
    gwaScore: 'GWA Score',
    yearLevelMatch: 'Year Level Match',
    incomeMatch: 'Income Eligibility',
    stBracketMatch: 'ST Bracket Match',
    collegeMatch: 'College Match',
    courseMatch: 'Course Match',
    citizenshipMatch: 'Citizenship',
    documentCompleteness: 'Documents',
    applicationTiming: 'Timing',
    eligibilityScore: 'Overall Eligibility',
    academicStrength: 'GWA & Year Level Effect',
    financialNeed: 'Income & Bracket Effect',
    programFit: 'College & Course Effect',
    applicationQuality: 'Completeness & Timing Effect',
    overallFit: 'Overall Fit Effect'
  };

  // Load data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [modelsRes, statsRes, scholarshipsRes, autoStatusRes, autoLogRes] = await Promise.all([
        trainingApi.getAllModels(),
        trainingApi.getStats(),
        trainingApi.getTrainableScholarships(),
        trainingApi.getAutoTrainingStatus().catch(() => ({ success: false, data: null })),
        trainingApi.getAutoTrainingLog(20).catch(() => ({ success: false, data: [] })),
      ]);

      if (modelsRes.success) setModels(modelsRes.data as any || []);
      if (statsRes.success) setStats(statsRes.data as TrainingStats);
      if (scholarshipsRes.success) setTrainableScholarships(scholarshipsRes.data as any || []);
      if (autoStatusRes.success && autoStatusRes.data) setAutoStatus(autoStatusRes.data as any);
      if (autoLogRes.success && autoLogRes.data) setAutoLog(autoLogRes.data as any || []);
    } catch (err: any) {
      if (err.isSessionExpired) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setIsScopeError(true);
        setError(err.response?.data?.message || 'You do not have permission to access training data. This may require university-level admin access.');
      } else {
        setError(err.message || 'Failed to load training data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Train global model
  const handleTrainGlobal = async () => {
    setTraining(true);
    setTrainingTarget('global');
    setError(null);
    setIsScopeError(false);
    setSuccessMessage(null);

    try {
      const response = await trainingApi.trainGlobalModel();
      if (response.success) {
        setSuccessMessage(`Global model trained successfully! Accuracy: ${((response.data as any).metrics.accuracy * 100).toFixed(1)}%`);
        await loadData();
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsScopeError(true);
        setError(err.response?.data?.message || 'You do not have permission to train the global model. University-level admin access is required.');
      } else {
        setError(err.code === 'ECONNABORTED'
          ? 'Training request timed out. The model may still be training on the server — try refreshing in a moment.'
          : err.response?.data?.message || 'Failed to train global model');
      }
    } finally {
      setTraining(false);
      setTrainingTarget(null);
    }
  };

  // Train scholarship-specific model
  const handleTrainScholarship = async (scholarshipId: string) => {
    setTraining(true);
    setTrainingTarget(scholarshipId);
    setError(null);
    setIsScopeError(false);
    setSuccessMessage(null);

    try {
      const response = await trainingApi.trainScholarshipModel(scholarshipId);
      if (response.success) {
        setSuccessMessage(`Model trained for ${(response.data as any).scholarshipName}! Accuracy: ${((response.data as any).metrics.accuracy * 100).toFixed(1)}%`);
        await loadData();
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsScopeError(true);
        setError(err.response?.data?.message || 'You do not have permission to train a model for this scholarship. It may be outside your administrative scope.');
      } else {
        setError(err.code === 'ECONNABORTED'
          ? 'Training request timed out. The model may still be training on the server — try refreshing in a moment.'
          : err.response?.data?.message || 'Failed to train model');
      }
    } finally {
      setTraining(false);
      setTrainingTarget(null);
    }
  };

  // Train all models
  const handleTrainAll = async () => {
    setTraining(true);
    setTrainingTarget('all');
    setError(null);
    setIsScopeError(false);
    setSuccessMessage(null);

    try {
      const response = await trainingApi.trainAllModels();
      if (response.success) {
        const { summary } = response.data as any;
        setSuccessMessage(`Trained ${summary.successful} models, ${summary.failed} skipped/failed`);
        await loadData();
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsScopeError(true);
        setError(err.response?.data?.message || 'You do not have permission to train all models. University-level admin access is required.');
      } else {
        setError(err.code === 'ECONNABORTED'
          ? 'Training request timed out. The model may still be training on the server — try refreshing in a moment.'
          : err.response?.data?.message || 'Failed to train models');
      }
    } finally {
      setTraining(false);
      setTrainingTarget(null);
    }
  };

  // Activate model
  const handleActivateModel = async (modelId: string) => {
    try {
      await trainingApi.activateModel(modelId);
      await loadData();
      setSuccessMessage('Model activated successfully');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsScopeError(true);
        setError(err.response?.data?.message || 'You do not have permission to activate this model. It may be outside your administrative scope.');
      } else {
        setError(err.response?.data?.message || 'Failed to activate model');
      }
    }
  };

  // Delete model
  const handleDeleteModel = async (modelId: string) => {
    if (!window.confirm('Are you sure you want to delete this model?')) return;

    try {
      await trainingApi.deleteModel(modelId);
      await loadData();
      setSuccessMessage('Model deleted successfully');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsScopeError(true);
        setError(err.response?.data?.message || 'You do not have permission to delete this model. It may be outside your administrative scope.');
      } else {
        setError(err.response?.data?.message || 'Failed to delete model');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading training data...</p>
        </div>
      </div>
    );
  }

  // Find the active global model for fallback display
  const activeGlobalModel = models.find(m => m.modelType === 'global' && m.isActive);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900" />
        
        <div className="container-app py-8 md:py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-purple-200 text-xs font-semibold rounded-full uppercase tracking-wide flex items-center gap-1.5 border border-white/10">
                  <Brain className="w-3.5 h-3.5" />Machine Learning
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Model Training</h1>
              <p className="text-primary-100">
                Train and manage logistic regression models for scholarship predictions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-xl hover:bg-white/30 hover:border-white/40 transition-all"
                disabled={training}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleTrainAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-lg"
                disabled={training}
              >
                {training && trainingTarget === 'all' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Train All Models
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container-app -mt-6 relative z-20 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Training Data Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">Data</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats?.totalApplications || 0}</div>
            <div className="text-sm text-slate-500">Training Samples</div>
          </div>
          
          {/* Approved Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">Approved</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{stats?.approvedCount || 0}</div>
            <div className="text-sm text-slate-500">Positive Cases</div>
          </div>
          
          {/* Trained Models Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full">Models</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats?.totalModels || 0}</div>
            <div className="text-sm text-slate-500">Trained Models</div>
          </div>
          
          {/* Trainable Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Trainable</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats?.scholarshipsWithEnoughData || 0}</div>
            <div className="text-sm text-slate-500">Ready to Train</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-app pb-12 space-y-6">
        {/* Messages */}
        {error && (
          <div className={`${isScopeError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} border rounded-xl p-4 flex items-start gap-3`}>
            {isScopeError ? <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
            <div>
              <p className={`${isScopeError ? 'text-amber-800' : 'text-red-700'} text-sm font-medium`}>{isScopeError ? 'Access Restricted' : 'Error'}</p>
              <p className={`${isScopeError ? 'text-amber-700' : 'text-red-600'} text-sm mt-1`}>{error}</p>
              {isScopeError && <p className="text-amber-600 text-xs mt-2">Your admin scope may restrict access to certain models. Contact a university-level admin for broader access.</p>}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Auto-Training Status Panel */}
        {autoStatus && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900">Auto-Training</h2>
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Models retrain automatically when you approve or reject applications</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAutoLog(!showAutoLog)}
                  className="text-sm text-emerald-700 hover:text-emerald-800 font-medium px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                >
                  {showAutoLog ? 'Hide Log' : 'View Log'}
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{autoStatus.todaySummary.totalAutoTrains}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Auto-trains today</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{autoStatus.todaySummary.scholarshipTrains}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Scholarship models</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">{autoStatus.todaySummary.globalTrains}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Global retrains</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-slate-700">{autoStatus.decisionsUntilGlobalRetrain}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Until next global</p>
                </div>
              </div>

              {/* Last Event */}
              {autoStatus.lastEvent && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>
                    Last event: {autoStatus.lastEvent.type === 'success' ? '✅' : autoStatus.lastEvent.type === 'skipped' ? '⏭️' : '⚠️'}
                    {' '}{autoStatus.lastEvent.scope === 'global' ? 'Global model' : autoStatus.lastEvent.scholarshipName || 'Scholarship model'}
                    {autoStatus.lastEvent.accuracy != null && ` — ${(autoStatus.lastEvent.accuracy * 100).toFixed(1)}% accuracy`}
                    {' · '}{new Date(autoStatus.lastEvent.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* Expandable Log */}
              {showAutoLog && autoLog.length > 0 && (
                <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-sm font-medium text-slate-700">Recent Auto-Training Activity</h3>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {autoLog.map((entry, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-slate-50">
                        {/* Status icon */}
                        {entry.type === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : entry.type === 'skipped' ? (
                          <SkipForward className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        {/* Description */}
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-800">
                            {entry.scope === 'global' ? 'Global model' : entry.scholarshipName || 'Scholarship model'}
                          </span>
                          {entry.type === 'success' && entry.accuracy != null && (
                            <span className="text-slate-500"> — {(entry.accuracy * 100).toFixed(1)}%</span>
                          )}
                          {entry.type === 'skipped' && (
                            <span className="text-slate-400 ml-1">
                              ({entry.reason === 'insufficient_data' ? 'need more data' : entry.reason === 'concurrent_lock' ? 'already training' : entry.reason})
                            </span>
                          )}
                          {entry.type === 'error' && (
                            <span className="text-red-500 ml-1">— {entry.error}</span>
                          )}
                        </div>
                        {/* Elapsed time */}
                        {entry.elapsed != null && (
                          <span className="text-xs text-slate-400 flex-shrink-0">{(entry.elapsed / 1000).toFixed(1)}s</span>
                        )}
                        {/* Timestamp */}
                        <span className="text-xs text-slate-400 flex-shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showAutoLog && autoLog.length === 0 && (
                <div className="mt-4 text-center py-6 text-sm text-slate-400">
                  No auto-training events yet. Events will appear here as you approve or reject applications.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Model Section */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Global Model</h2>
                  <p className="text-sm text-slate-600">Trained on all scholarship applications</p>
                </div>
              </div>
              <button
                onClick={handleTrainGlobal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
                disabled={training}
              >
                {training && trainingTarget === 'global' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Train Global
              </button>
            </div>
          </div>

          {/* Active Global Model */}
          {models.filter(m => m.modelType === 'global' && m.isActive).map(model => (
            <div key={model._id} className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-amber-500" />
                <span className="font-medium text-slate-900">Active Global Model</span>
                {model.triggerType && model.triggerType !== 'manual' ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    <Bot className="w-3 h-3" />
                    Auto-trained
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">Manual</span>
                )}
                <span className="text-sm text-slate-500">
                  {new Date(model.trainedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Accuracy</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {(model.metrics.accuracy * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Precision</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(model.metrics.precision * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Recall</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(model.metrics.recall * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">F1 Score</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {(model.metrics.f1Score * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Feature Importance */}
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-3">Feature Importance</h3>
                <div className="space-y-2">
                  {Object.entries(model.featureImportance || {})
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 6)
                    .map(([feature, importance]) => (
                      <div key={feature} className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 w-40">
                          {featureDisplayNames[feature] || feature}
                        </span>
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all"
                            style={{ width: `${importance * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-500 w-12 text-right">
                          {(importance * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scholarship-Specific Models */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Scholarship-Specific Models</h2>
                  <p className="text-sm text-slate-600">
                    Train specialized models for individual scholarships (requires 30+ applications)
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-medium">
                  {trainableScholarships.filter(s => s.isTrainable).length} Ready
                </span>
                <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg font-medium">
                  {trainableScholarships.filter(s => !s.isTrainable).length} Need Data
                </span>
              </div>
            </div>
          </div>

          {trainableScholarships.length > 0 ? (
            <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
              {trainableScholarships.map(scholarship => {
                const existingModel = models.find(
                  m => m.modelType === 'scholarship_specific' && 
                       (m.scholarshipId as any)?._id === scholarship._id
                );

                return (
                  <div 
                    key={scholarship._id} 
                    className={`relative rounded-xl border-2 transition-all overflow-hidden ${
                      existingModel?.isActive 
                        ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' 
                        : scholarship.isTrainable
                          ? 'border-slate-200 bg-white hover:border-primary-200 hover:shadow-md'
                          : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    {/* Active Badge */}
                    {existingModel?.isActive && (
                      <div className="absolute top-3 right-3">
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full shadow-sm">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      </div>
                    )}

                    <div className="p-5">
                      {/* Scholarship Info */}
                      <div className="mb-4">
                        <h3 className="font-semibold text-slate-900 pr-16 line-clamp-1">{scholarship.name}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            scholarship.scholarshipType === 'Government Scholarship' 
                              ? 'bg-blue-100 text-blue-700'
                              : scholarship.scholarshipType === 'Private Scholarship'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {scholarship.scholarshipType}
                          </span>
                          <span className="text-xs text-slate-500">
                            {scholarship.applicationCount} applications
                          </span>
                        </div>
                      </div>

                      {/* Model Metrics (if trained) */}
                      {existingModel ? (
                        <div className="space-y-3">
                          {/* Accuracy Display */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Model Accuracy</span>
                            <span className={`text-lg font-bold ${
                              existingModel.metrics.accuracy >= 0.8 ? 'text-green-600' :
                              existingModel.metrics.accuracy >= 0.6 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {(existingModel.metrics.accuracy * 100).toFixed(1)}%
                            </span>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white/70 rounded-lg p-2 text-center">
                              <p className="text-xs text-slate-500">Precision</p>
                              <p className="text-sm font-semibold text-slate-800">
                                {(existingModel.metrics.precision * 100).toFixed(0)}%
                              </p>
                            </div>
                            <div className="bg-white/70 rounded-lg p-2 text-center">
                              <p className="text-xs text-slate-500">Recall</p>
                              <p className="text-sm font-semibold text-slate-800">
                                {(existingModel.metrics.recall * 100).toFixed(0)}%
                              </p>
                            </div>
                            <div className="bg-white/70 rounded-lg p-2 text-center">
                              <p className="text-xs text-slate-500">F1</p>
                              <p className="text-sm font-semibold text-slate-800">
                                {(existingModel.metrics.f1Score * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>

                          {/* Training Info */}
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500">
                              {new Date(existingModel.trainedAt).toLocaleDateString()}
                            </p>
                            {existingModel.triggerType && existingModel.triggerType !== 'manual' ? (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded-full">
                                <Bot className="w-2.5 h-2.5" />Auto
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-full">Manual</span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => handleTrainScholarship(scholarship._id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm"
                              disabled={training}
                            >
                              {training && trainingTarget === scholarship._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                              Retrain
                            </button>
                            {!existingModel.isActive && (
                              <>
                                <button
                                  onClick={() => handleActivateModel(existingModel._id)}
                                  className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors"
                                  title="Activate this model"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteModel(existingModel._id)}
                                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                                  title="Delete model"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* No Model Yet */
                        <div className="space-y-3">
                          {/* Progress to trainable */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm text-slate-600">Training Data Progress</span>
                              <span className="text-xs font-medium text-slate-500">
                                {scholarship.applicationCount}/30
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  scholarship.isTrainable ? 'bg-green-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, (scholarship.applicationCount / 30) * 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Global Model Fallback Info */}
                          {activeGlobalModel && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Globe className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-xs font-semibold text-blue-700">Using Global Model</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 mb-2">
                                <div className="bg-white/70 rounded px-2 py-1 text-center">
                                  <p className="text-[10px] text-slate-500">Accuracy</p>
                                  <p className="text-xs font-bold text-primary-600">
                                    {(activeGlobalModel.metrics.accuracy * 100).toFixed(1)}%
                                  </p>
                                </div>
                                <div className="bg-white/70 rounded px-2 py-1 text-center">
                                  <p className="text-[10px] text-slate-500">F1 Score</p>
                                  <p className="text-xs font-bold text-purple-600">
                                    {(activeGlobalModel.metrics.f1Score * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <Info className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-[11px] text-blue-600 leading-tight">
                                  Predictions for this scholarship currently use the global model trained on all scholarship data.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Action or Status */}
                          {scholarship.isTrainable ? (
                            <button
                              onClick={() => handleTrainScholarship(scholarship._id)}
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors text-sm"
                              disabled={training}
                            >
                              {training && trainingTarget === scholarship._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                              Train Model
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-2 py-2.5 text-slate-400 text-sm">
                              <AlertCircle className="w-4 h-4" />
                              Need {30 - scholarship.applicationCount} more applications
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Scholarships Available</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Scholarships will appear here once they have application data.
                Each scholarship needs at least 30 applications with outcomes to train a model.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelTraining;