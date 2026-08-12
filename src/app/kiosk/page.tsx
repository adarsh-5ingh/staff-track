'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './kiosk.module.css';

export default function Kiosk() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Exit passcode state
  const [correctPasscode, setCorrectPasscode] = useState('1234');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Fetch Exit Passcode from Database on mount if logged in
  useEffect(() => {
    const fetchExitPasscode = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
          // Get admin org
          const { data: adminData } = await supabase
            .from('admins')
            .select('organization_id')
            .eq('id', session.user.id)
            .single();

          if (adminData?.organization_id) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('kiosk_passcode')
              .eq('id', adminData.organization_id)
              .single();

            if (orgData?.kiosk_passcode) {
              setCorrectPasscode(orgData.kiosk_passcode);
            }
          }
        } else {
          setHasSession(false);
        }
      } catch (err) {
        console.error('Failed to fetch kiosk exit passcode:', err);
      }
    };
    fetchExitPasscode();
  }, []);

  // Validate exit passcode once 4 digits are entered
  useEffect(() => {
    if (adminPin.length === 4) {
      if (adminPin === correctPasscode) {
        window.location.href = '/dashboard';
      } else {
        setAdminError(true);
        setTimeout(() => {
          setAdminPin('');
          setAdminError(false);
        }, 800); // Shaking animation duration match
      }
    }
  }, [adminPin, correctPasscode]);

  const handleAdminNumberClick = (num: string) => {
    if (adminPin.length < 4 && !adminError) {
      setAdminPin(prev => prev + num);
    }
  };

  const handleAdminDelete = () => {
    if (!adminError) {
      setAdminPin(prev => prev.slice(0, -1));
    }
  };

  // Initialize Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied or unavailable", err);
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setMessage(null);
    }
  };

  const handleClear = () => {
    setPin('');
    setMessage(null);
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setMessage(null);
  };

  const capturePhoto = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        // Set canvas to same dimension as video
        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        return canvasRef.current.toDataURL('image/jpeg', 0.8);
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) return;
    setLoading(true);
    setMessage(null);

    const photoBase64 = capturePhoto();

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, photoBase64 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || 'Failed to verify PIN', type: 'error' });
      } else {
        let msg = data.message || 'Success!';

        // Format the time on the device (so it uses local timezone instead of Vercel's UTC timezone)
        if (data.timestamp) {
          const localTime = new Date(data.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          msg += ` ${localTime}`;
        }

        if (data.photoError) {
          msg += `\n(Photo Upload Failed: ${data.photoError})`;
        }
        setMessage({ text: msg, type: 'success' });
        setPin(''); // Clear on success
        setTimeout(() => setMessage(null), 2000); // Clear message after 2s
      }
    } catch (err) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.kioskContainer}>
      <a 
        href="/dashboard" 
        className={styles.adminLink} 
        title="Admin Dashboard" 
        aria-label="Admin Dashboard"
        onClick={(e) => {
          if (hasSession) {
            e.preventDefault();
            setAdminPin('');
            setShowAdminModal(true);
          }
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: '20px', height: '20px' }}
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </a>

      <div className={styles.kioskCard}>
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {message?.type === 'success' ? (
          <div className={styles.successContainer}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.successTitle}>{message.text}</h2>
          </div>
        ) : (
          <>
            <div className={styles.cameraSection}>
              <div className={styles.cameraFrame}>
                <video ref={videoRef} autoPlay playsInline muted className={styles.videoElement} />
              </div>
              <div className={styles.cameraStatus}>
                <span className={styles.cameraIndicator} />
                <span>Camera Active</span>
              </div>
            </div>

            <div className={styles.entrySection}>
              <h1 className={styles.title}>Check-in</h1>
              <p className={styles.subtitle}>Enter your 6-digit PIN</p>

              {/* Error Message Banner */}
              <div className={styles.errorBanner}>
                {message?.type === 'error' && (
                  <span className={styles.errorMessage}>{message.text}</span>
                )}
              </div>

              {/* PIN Display */}
              <div className={styles.pinDisplay}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    className={`${styles.pinDot} ${index < pin.length ? styles.pinDotActive : ''}`}
                  />
                ))}
              </div>

              {/* Dial Pad Grid */}
              <div className={styles.keypadGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num.toString())}
                    className={styles.keypadBtn}
                  >
                    {num}
                  </button>
                ))}
                <button onClick={handleClear} className={styles.textBtn}>
                  Clear
                </button>
                <button onClick={() => handleNumberClick('0')} className={styles.keypadBtn}>
                  0
                </button>
                <button onClick={handleDelete} className={styles.textBtn}>
                  Delete
                </button>
              </div>

              {/* Submit Button */}
              <button
                className={styles.confirmBtn}
                onClick={handleSubmit}
                disabled={pin.length !== 6 || loading}
              >
                {loading ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </>
        )}
      </div>

      {showAdminModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${adminError ? styles.modalContentShake : ''}`}>
            <h3 className={styles.modalTitle}>Admin Verification</h3>
            <p className={styles.modalSubtitle}>Enter 4-digit passcode to exit kiosk.</p>
            
            <div className={styles.modalPinDisplay}>
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index} 
                  className={`${styles.modalPinDot} ${index < adminPin.length ? styles.modalPinDotActive : ''} ${adminError ? styles.modalPinDotError : ''}`}
                />
              ))}
            </div>

            <div className={styles.modalKeypad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button 
                  key={num} 
                  onClick={() => handleAdminNumberClick(num.toString())} 
                  className={styles.modalKeypadBtn}
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminPin('');
                }} 
                className={styles.modalCloseBtn}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleAdminNumberClick('0')} 
                className={styles.modalKeypadBtn}
              >
                0
              </button>
              <button 
                onClick={handleAdminDelete} 
                className={styles.modalCloseBtn}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
