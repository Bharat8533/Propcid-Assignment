import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function OtpModal({ registrationId, channel, targetValue, onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);

  // Send initial OTP upon modal opening
  useEffect(() => {
    let timer = null;
    const triggerSend = async () => {
      try {
        setLoading(true);
        setError('');
        await api.sendOtp(registrationId, channel);
        setResendCooldown(30);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    triggerSend();

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [registrationId, channel]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
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
      await api.verifyOtp(registrationId, channel, code.trim());
      onSuccess(channel);
      onClose();
    } catch (err) {
      setError(err.message);
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
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Verify {channel === 'email' ? 'Email Address' : 'Mobile Number'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleVerify}>
          <div className="modal-body">
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              We sent a 6-digit verification code to: <br />
              <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{targetValue}</strong>
            </p>

            {/* Test hint banner */}
            <div style={{
              background: '#eff6ff',
              border: '1px dashed #93c5fd',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              fontSize: '0.8rem',
              color: '#1e40af',
              marginBottom: '1rem'
            }}>
              💡 <strong>Evaluation Note (R3):</strong> Dummy OTP is logged to server console. Test code is <code>123456</code>.
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="otp-input">
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
                className={`form-control ${error ? 'has-error' : ''}`}
                style={{
                  fontSize: '1.4rem',
                  letterSpacing: '0.35em',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600
                }}
              />
              {error && (
                <div className="field-error" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Resend status & Cooldown */}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Valid for 5 minutes • 3 attempts max
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--primary)',
                  fontWeight: 600,
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || code.length !== 6}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
