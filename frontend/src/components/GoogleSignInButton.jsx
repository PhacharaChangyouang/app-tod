'use client';

import { useEffect, useRef, useState } from 'react';

const SCRIPT_ID = 'aha-google-identity-script';
const GOOGLE_STATE_KEY = '__ahaGoogleIdentityState';

export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const buttonRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [error, setError] = useState('');
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => { callbackRef.current = onCredential; }, [onCredential]);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return undefined;
    let active = true;
    const render = () => {
      if (!active || !window.google?.accounts?.id || !buttonRef.current) return;
      buttonRef.current.replaceChildren();
      const state = window[GOOGLE_STATE_KEY] || { initialized: false, clientId: null, callback: null };
      state.callback = (response) => {
        if (response?.credential) callbackRef.current?.(response.credential);
        else setError('Google ไม่ได้ส่งข้อมูลยืนยันตัวตนกลับมา');
      };
      if (!state.initialized || state.clientId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => window[GOOGLE_STATE_KEY]?.callback?.(response),
          cancel_on_tap_outside: true,
        });
        state.initialized = true;
        state.clientId = clientId;
      }
      window[GOOGLE_STATE_KEY] = state;
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
        shape: 'rectangular', width: Math.min(400, buttonRef.current.clientWidth || 400),
      });
    };
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (window.google?.accounts?.id) render();
      else existing.addEventListener('load', render, { once: true });
    } else {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = render;
      script.onerror = () => setError('โหลดระบบเข้าสู่ระบบ Google ไม่สำเร็จ');
      document.head.appendChild(script);
    }
    return () => { active = false; };
  }, [clientId]);

  if (!clientId) return null;

  return (
    <div className={disabled ? 'aha-google-wrap disabled' : 'aha-google-wrap'}>
      <div ref={buttonRef} className="aha-google-button" aria-label="เข้าสู่ระบบด้วย Google" />
      {error && <small role="alert">{error}</small>}
      <style jsx>{`
        .aha-google-wrap{display:grid;place-items:center;gap:6px;width:100%;min-height:44px}.aha-google-button{width:100%;display:flex;justify-content:center}.aha-google-wrap.disabled{pointer-events:none;opacity:.55}.aha-google-wrap small{color:#8b5151;font-size:12px;text-align:center}
      `}</style>
    </div>
  );
}
