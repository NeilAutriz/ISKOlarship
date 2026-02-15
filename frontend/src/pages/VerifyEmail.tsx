// ============================================================================
// ISKOlarship - Email Verification Page
// Handles the email verification link from registration emails
// ============================================================================

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import { authApi } from '../services/apiClient';

type VerifyState = 'loading' | 'success' | 'already-verified' | 'error';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerifyState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setState('error');
      setErrorMessage('No verification token found. Please check the link in your email.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await authApi.verifyEmail(token);
        if (response.success) {
          if (response.data?.alreadyVerified) {
            setState('already-verified');
          } else {
            setState('success');
          }
        } else {
          setState('error');
          setErrorMessage(response.message || 'Verification failed');
        }
      } catch (error: any) {
        setState('error');
        setErrorMessage(
          error.response?.data?.message || 
          error.message || 
          'Verification failed. The link may have expired.'
        );
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-primary-600 px-6 py-6 text-center">
          <h1 className="text-2xl font-bold text-white">🎓 ISKOlarship</h1>
          <p className="text-white/80 text-sm mt-1">Email Verification</p>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          {state === 'loading' && (
            <>
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Verifying Your Email</h2>
              <p className="text-slate-500 text-sm">Please wait while we verify your email address...</p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Email Verified!</h2>
              <p className="text-slate-500 text-sm mb-6">
                Your email address has been verified successfully. You can now sign in to your account.
              </p>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all"
              >
                Go to Sign In
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {state === 'already-verified' && (
            <>
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Already Verified</h2>
              <p className="text-slate-500 text-sm mb-6">
                Your email address is already verified. You can sign in to your account.
              </p>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all"
              >
                Go to Sign In
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Verification Failed</h2>
              <p className="text-slate-500 text-sm mb-6">
                {errorMessage}
              </p>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all"
              >
                Go to Homepage
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
