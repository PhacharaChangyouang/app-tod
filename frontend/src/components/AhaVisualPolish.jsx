'use client';

export default function AhaVisualPolish() {
  return (
    <style jsx global>{`
      .aha-v3-brand-mark {
        width: 48px !important;
        height: 48px !important;
        border-radius: 14px !important;
        overflow: hidden !important;
        background: #f8fdff url('/icons/aha-icon.svg') center/cover no-repeat !important;
        flex: 0 0 48px !important;
      }
      .aha-v3-brand-mark svg { display: none !important; }
      .aha-v3-next-inner { min-height: 132px; align-items: center; }
      .aha-v3-next-inner > div > strong { font-size: clamp(38px, 4vw, 54px) !important; line-height: .95 !important; }
      .aha-v3-next-inner > div > span { font-size: clamp(20px, 2vw, 25px) !important; font-weight: 800 !important; }
      .aha-v3-next-inner > div > small { font-size: 17px !important; }
      .aha-v3-next .aha-v3-primary-button { min-height: 52px; font-size: 17px; font-weight: 800; }
      .aha-v3-take-button {
        min-height: 48px !important;
        min-width: 132px !important;
        padding: 10px 16px !important;
        border-radius: 12px !important;
        font-size: 18px !important;
        font-weight: 800 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
      @media (max-width: 768px) {
        .aha-v3-brand-mark { width: 42px !important; height: 42px !important; flex-basis: 42px !important; border-radius: 12px !important; }
        .aha-v3-next-inner { min-height: 154px; }
        .aha-v3-next-inner > div > strong { font-size: 44px !important; }
        .aha-v3-next-inner > div > span { font-size: 22px !important; }
        .aha-v3-next-inner > div > small { font-size: 18px !important; }
        .aha-v3-take-button { width: 100% !important; min-height: 54px !important; font-size: 19px !important; }
      }
    `}</style>
  );
}
