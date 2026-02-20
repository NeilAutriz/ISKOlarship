// ============================================================================
// ISKOlarship - Auth Modal Component
// Sign In / Sign Up modal with Student and Administrator views
// Includes 2FA OTP verification step
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { X, GraduationCap, User, Settings, Eye, EyeOff, ArrowRight, ArrowLeft, Mail, Lock, CheckCircle, ShieldCheck, RefreshCw } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string, role: 'student' | 'admin') => Promise<{ requiresOTP?: boolean; email?: string; maskedEmail?: string }>;
  onVerifyOTP: (email: string, otp: string, role: 'student' | 'admin') => Promise<void>;
  onResendOTP: (email: string) => Promise<void>;
  onSignUp: (email: string, password: string, role: 'student' | 'admin') => void | Promise<void>;
}

type UserRole = 'student' | 'admin';
type AuthStep = 'credentials' | 'otp';
type AuthTab = 'signin' | 'signup';

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
  onVerifyOTP,
  onResendOTP,
  onSignUp,
}) => {
  const [role, setRole] = useState<UserRole>('student');
  const [tab, setTab] = useState<AuthTab>('signin');
  const [step, setStep] = useState<AuthStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpSuccess, setOtpSuccess] = useState('');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-focus first OTP input when step changes to OTP
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1); // Take only the last digit
    setOtpDigits(newDigits);
    setError('');
    setOtpSuccess('');
    
    // Auto-advance to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);
    
    // Focus the next empty input or the last one
    const nextEmpty = newDigits.findIndex(d => !d);
    otpInputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (tab === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        setError('Password must contain uppercase, lowercase, and a number');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (tab === 'signin') {
        // Step 1: Send credentials — backend returns requiresOTP
        const result = await onSignIn(email, password, role);
        if (result?.requiresOTP) {
          setOtpEmail(result.email || email);
          setMaskedEmail(result.maskedEmail || email);
          setStep('otp');
          setOtpDigits(['', '', '', '', '', '']);
          setResendCooldown(30); // 30 second cooldown before first resend
        }
        // If no OTP required (shouldn't happen with new flow but just in case)
      } else {
        await onSignUp(email, password, role);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await onVerifyOTP(otpEmail, otp, role);
      // If successful, the parent (App.tsx) will close the modal
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      // If too many attempts or expired, go back to credentials
      if (err.tooManyAttempts || err.expired) {
        setStep('credentials');
        setOtpDigits(['', '', '', '', '', '']);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setError('');
    setOtpSuccess('');
    try {
      await onResendOTP(otpEmail);
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(60); // 60 second cooldown after resend
      setOtpSuccess('A new verification code has been sent to your email.');
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setStep('credentials');
    setOtpDigits(['', '', '', '', '', '']);
    setOtpSuccess('');
    setResendCooldown(0);
  };

  const goBackToCredentials = () => {
    setStep('credentials');
    setOtpDigits(['', '', '', '', '', '']);
    setError('');
    setOtpSuccess('');
  };

  // ========== OTP VERIFICATION SCREEN ==========
  if (step === 'otp') {
    return (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-primary-600 px-6 py-4 relative rounded-t-2xl">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Verify Your Identity</h2>
                <p className="text-white/80 text-sm mt-1">Two-Factor Authentication</p>
              </div>
            </div>
          </div>

          {/* OTP Body */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-slate-600 text-sm">
                We've sent a 6-digit verification code to
              </p>
              <p className="text-slate-900 font-semibold mt-1">{maskedEmail}</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            {/* Success */}
            {otpSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm text-center">
                {otpSuccess}
              </div>
            )}

            {/* OTP Input Fields */}
            <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpInputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all hover:border-slate-300"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerifyOTP}
              disabled={isLoading || otpDigits.join('').length !== 6}
              className="w-full py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Verify & Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend & Back */}
            <div className="flex items-center justify-between">
              <button
                onClick={goBackToCredentials}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to login
              </button>
              <button
                onClick={handleResendOTP}
                disabled={resendCooldown > 0}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6">
              Code expires in 10 minutes. Check your spam folder if you don't see the email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========== CREDENTIALS SCREEN (original sign in / sign up) ==========

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary-600 px-6 py-4 relative rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome to ISKOlarship</h2>
              <p className="text-white/80 text-sm mt-1">Your gateway to educational opportunities</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Role Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setRole('student'); resetForm(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                role === 'student'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              Student
            </button>
            <button
              onClick={() => { setRole('admin'); resetForm(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                role === 'admin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              Administrator
            </button>
          </div>

          {/* Auth Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setTab('signin'); resetForm(); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === 'signin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('signup'); resetForm(); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'student' ? 'maria.santos@up.edu.ph' : 'admin@iskolarship.ph'}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all hover:border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all hover:border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {tab === 'signup' && password.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <div className={`flex items-center gap-1.5 text-xs ${password.length >= 8 ? 'text-green-600' : 'text-slate-400'}`}>
                    {password.length >= 8 ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                    {/[A-Z]/.test(password) ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${/[a-z]/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                    {/[a-z]/.test(password) ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${/\d/.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                    {/\d/.test(password) ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                    One number
                  </div>
                </div>
              )}
              {tab === 'signup' && password.length === 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Min 8 characters with uppercase, lowercase, and number
                </p>
              )}
            </div>

            {tab === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all hover:border-slate-300"
                  />
                </div>
              </div>
            )}

            {tab === 'signin' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {tab === 'signin' ? `Sign In to ${role === 'student' ? 'Student' : 'Admin'} Portal` : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 mt-4">
            {tab === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setTab('signup'); resetForm(); }}
                  className="text-primary-600 font-medium hover:underline"
                >
                  Register here
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setTab('signin'); resetForm(); }}
                  className="text-primary-600 font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
