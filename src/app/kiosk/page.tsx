'use client';

import { useState, useRef, useEffect } from 'react';

export default function Kiosk() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        if (data.photoError) {
           msg += ` (Photo Upload Failed: ${data.photoError})`;
        }
        setMessage({ text: msg, type: 'success' });
        setPin(''); // Clear on success
        setTimeout(() => setMessage(null), 4000); // Clear message after 4s
      }
    } catch (err) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100dvh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '1rem',
      backgroundColor: 'var(--background)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      
      <a href="/dashboard" style={{ 
        position: 'absolute', 
        top: '1.5rem', 
        right: '1.5rem', 
        color: 'var(--muted-foreground)', 
        textDecoration: 'none', 
        fontSize: '0.875rem',
        fontWeight: 500,
        opacity: 0.7,
        transition: 'opacity 0.2s',
        zIndex: 10
      }}
      onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
      onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
      >
        Admin Dashboard
      </a>

      <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Hidden Video for Photo Capture */}
        <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {message?.type === 'success' ? (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            textAlign: 'center',
            minHeight: '400px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              marginBottom: '1.5rem'
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.4 }}>{message.text}</h2>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.25rem', textAlign: 'center' }}>Check-in</h1>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
              Enter your 6-digit PIN.
            </p>

            {/* Error Message Banner */}
            <div style={{ height: '24px', marginBottom: '0.5rem', width: '100%', textAlign: 'center' }}>
              {message?.type === 'error' && (
                <span style={{ 
                  color: '#ef4444', 
                  fontWeight: 500,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '99px',
                  fontSize: '0.75rem'
                }}>
                  {message.text}
                </span>
              )}
            </div>

            {/* PIN Display */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div key={index} style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: index < pin.length ? 'var(--foreground)' : 'var(--muted)',
                  transition: 'background-color 0.2s ease, transform 0.2s ease',
                  transform: index < pin.length ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: index < pin.length ? '0 0 10px rgba(0,0,0,0.1)' : 'none'
                }} />
              ))}
            </div>

            {/* Dial Pad Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '1rem',
              width: '100%',
              marginBottom: '1rem'
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button key={num} onClick={() => handleNumberClick(num.toString())} style={{
                  aspectRatio: '1',
                  borderRadius: '50%',
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  fontSize: '2rem',
                  fontWeight: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s ease',
                  padding: 0
                }}
                onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                >
                  {num}
                </button>
              ))}
              <button onClick={handleClear} style={{
                fontSize: '1.125rem', fontWeight: 500, color: 'var(--muted-foreground)'
              }}>Clear</button>
              
              <button onClick={() => handleNumberClick('0')} style={{
                  aspectRatio: '1',
                  borderRadius: '50%',
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  fontSize: '2rem',
                  fontWeight: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s ease',
                  padding: 0
              }}>
                0
              </button>
              
              <button onClick={handleDelete} style={{
                fontSize: '1.125rem', fontWeight: 500, color: 'var(--muted-foreground)'
              }}>Delete</button>
            </div>

            {/* Submit Button */}
            <button 
              className="btn-primary" 
              onClick={handleSubmit} 
              disabled={pin.length !== 6 || loading}
              style={{ 
                width: '100%', 
                padding: '1rem', 
                fontSize: '1.25rem',
                opacity: pin.length === 6 ? 1 : 0.5,
                cursor: pin.length === 6 ? 'pointer' : 'not-allowed',
                borderRadius: '99px',
                marginTop: 'auto'
              }}
            >
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
