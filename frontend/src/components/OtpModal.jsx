import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function OtpModal({ registrationId, channel, targetValue, onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);
  const hasSentRef = useRef(false);

  useEffect(() => {
    if (!registrationId) {
      setError('Registration record not saved yet. Please save draft first.');
      return;
    }
    if (hasSentRef.current) return;
    hasSentRef.current = true;

    const triggerSend = async () => {
      try {
        setLoading(true);
        setError('');
        await api.sendOtp(registrationId, channel);
        setResendCooldown(30);
      } catch (err) {
        setError(err.message || 'Error sending OTP');
      } finally {
        setLoading(false);
      }
    };
    triggerSend();
  }, [registrationId, channel]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const updated = await api.verifyOtp(registrationId, channel, code.trim());
      onSuccess(channel, updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    try {
      setResending(true);
      setError('');
      setCode('');
      await api.sendOtp(registrationId, channel);
      setResendCooldown(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <ShieldCheck size={20} />
            <span className="font-bold text-slate-900 text-base">
              Verify {channel === 'email' ? 'Email Address' : 'Mobile Number'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleVerify}>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-3">
              We sent a 6-digit verification code to: <br />
              <strong className="text-slate-900 break-all">{targetValue}</strong>
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 mb-4">
              Dummy OTP test code is <code className="font-bold font-mono">123456</code>.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600" htmlFor="otp-input">
                Enter 6-Digit OTP
              </label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className={`w-full min-h-[44px] px-3.5 py-2 rounded-lg border text-slate-900 text-xl font-mono tracking-[0.35em] text-center font-semibold outline-none transition-all ${
                  error
                    ? 'border-red-500 bg-red-50/30'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              {error && (
                <div className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-between items-center text-xs">
              <span className="text-slate-400">Valid for 5 mins • 3 attempts max</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
                className={`font-semibold flex items-center gap-1 transition-colors ${
                  resendCooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </div>

          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
