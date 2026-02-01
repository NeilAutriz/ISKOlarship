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
  Star
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

const ModelTraining: React.FC = () => {
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [trainableScholarships, setTrainableScholarships] = useState<TrainableScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainingTarget, setTrainingTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    eligibilityScore: 'Overall Eligibility'
  };

  // Load data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [modelsRes, statsRes, scholarshipsRes] = await Promise.all([
        trainingApi.getAllModels(),
        trainingApi.getStats(),
        trainingApi.getTrainableScholarships()
      ]);

      if (modelsRes.success) setModels(modelsRes.data as any || []);
      if (statsRes.success) setStats(statsRes.data as TrainingStats);
      if (scholarshipsRes.success) setTrainableScholarships(scholarshipsRes.data as any || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load training data');
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
    setSuccessMessage(null);

    try {
      const response = await trainingApi.trainGlobalModel();
      if (response.success) {
        setSuccessMessage(`Global model trained successfully! Accuracy: ${((response.data as any).metrics.accuracy * 100).toFixed(1)}%`);
        await loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to train global model');
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
    setSuccessMessage(null);

    try {
      const response = await trainingApi.trainScholarshipModel(scholarshipId);
      if (response.success) {
        setSuccessMessage(`Model trained for ${(response.data as any).scholarshipName}! Accuracy: ${((response.data as any).metrics.accuracy * 100).toFixed(1)}%`);
        await loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to train model');
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
    setSuccessMessage(null);

    try {
      const response = await trainingApi.trainAllModels();
      if (response.success) {
        const { summary } = response.data as any;
        setSuccessMessage(`Trained ${summary.successful} models, ${summary.failed} skipped/failed`);
        await loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to train models');
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
      setError(err.response?.data?.message || 'Failed to activate model');
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
      setError(err.response?.data?.message || 'Failed to delete model');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Brain className="w-7 h-7 text-primary-600" />
            Model Training
          </h1>
          <p className="text-slate-600 mt-1">
            Train and manage logistic regression models for scholarship predictions
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="btn btn-secondary flex items-center gap-2"
            disabled={training}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleTrainAll}
            className="btn btn-primary flex items-center gap-2"
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

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Training Data</p>
                <p className="text-xl font-bold text-slate-900">{stats.totalApplications}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Approved</p>
                <p className="text-xl font-bold text-green-600">{stats.approvedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Trained Models</p>
                <p className="text-xl font-bold text-slate-900">{stats.totalModels}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Trainable</p>
                <p className="text-xl font-bold text-slate-900">{stats.scholarshipsWithEnoughData}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Model Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Global Model</h2>
                <p className="text-sm text-slate-600">Trained on all scholarship applications</p>
              </div>
            </div>
            <button
              onClick={handleTrainGlobal}
              className="btn btn-primary btn-sm flex items-center gap-2"
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
              <span className="text-sm text-slate-500">
                Trained {new Date(model.trainedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase">Accuracy</p>
                <p className="text-2xl font-bold text-primary-600">
                  {(model.metrics.accuracy * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase">Precision</p>
                <p className="text-2xl font-bold text-green-600">
                  {(model.metrics.precision * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase">Recall</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(model.metrics.recall * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase">F1 Score</p>
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Scholarship-Specific Models</h2>
          <p className="text-sm text-slate-600">
            Train models for individual scholarships (requires 30+ applications)
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {trainableScholarships.map(scholarship => {
            const existingModel = models.find(
              m => m.modelType === 'scholarship_specific' && 
                   (m.scholarshipId as any)?._id === scholarship._id
            );

            return (
              <div key={scholarship._id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">{scholarship.name}</h3>
                      {existingModel?.isActive && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Model Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span>{scholarship.scholarshipType}</span>
                      <span>•</span>
                      <span>{scholarship.applicationCount} applications</span>
                      {existingModel && (
                        <>
                          <span>•</span>
                          <span className="text-primary-600">
                            {(existingModel.metrics.accuracy * 100).toFixed(1)}% accuracy
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {scholarship.isTrainable ? (
                      <button
                        onClick={() => handleTrainScholarship(scholarship._id)}
                        className="btn btn-secondary btn-sm flex items-center gap-2"
                        disabled={training}
                      >
                        {training && trainingTarget === scholarship._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        {existingModel ? 'Retrain' : 'Train'}
                      </button>
                    ) : (
                      <span className="text-sm text-slate-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Need {30 - scholarship.applicationCount} more
                      </span>
                    )}

                    {existingModel && !existingModel.isActive && (
                      <button
                        onClick={() => handleActivateModel(existingModel._id)}
                        className="btn btn-ghost btn-sm"
                        title="Activate this model"
                      >
                        <Star className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {trainableScholarships.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Database className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No scholarships with enough training data</p>
              <p className="text-sm">Each scholarship needs at least 30 applications with outcomes</p>
            </div>
          )}
        </div>
      </div>

      {/* All Models History */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Model History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Accuracy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Trained</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {models.map(model => (
                <tr key={model._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{model.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      model.modelType === 'global' 
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {model.modelType === 'global' ? 'Global' : 'Scholarship'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">
                      {(model.metrics.accuracy * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(model.trainedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {model.isActive ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="text-slate-400">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!model.isActive && (
                        <>
                          <button
                            onClick={() => handleActivateModel(model._id)}
                            className="p-1 hover:bg-slate-100 rounded"
                            title="Activate"
                          >
                            <Star className="w-4 h-4 text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteModel(model._id)}
                            className="p-1 hover:bg-red-100 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModelTraining;
