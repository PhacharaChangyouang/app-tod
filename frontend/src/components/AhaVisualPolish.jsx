'use client';

export default function AhaVisualPolish() {
  return (
    <style jsx global>{`
      /* Brand + next-dose readability */
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

      /* Home greeting card: keep the elderly photo visually inside the same card */
      .aha-v3-hero-photo {
        right: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        width: 51% !important;
        height: 100% !important;
        display: flex !important;
        align-items: flex-end !important;
        justify-content: flex-end !important;
      }
      .aha-v3-hero-photo img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        object-position: 74% 30% !important;
        transform: scale(1.02) !important;
        transform-origin: center bottom !important;
      }
      .aha-v3-hero-note { z-index: 6 !important; }

      /* The app uses one consistent mobile navigation everywhere. */
      .aha-v3-mobile-nav,
      .footer-nav { display: none !important; }

      .aha-mobile-nav {
        display: none;
      }

      /* Restore the notification control as a familiar bell, not the AHA logo. */
      button[aria-label*="การแจ้งเตือน AHA"] {
        width: 50px !important;
        height: 50px !important;
        border-radius: 50% !important;
      }
      button[aria-label*="การแจ้งเตือน AHA"] > img,
      button[aria-label*="การแจ้งเตือน AHA"] > span {
        display: none !important;
      }
      button[aria-label*="การแจ้งเตือน AHA"]::before {
        content: "";
        width: 25px;
        height: 25px;
        display: block;
        background: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9'/%3E%3Cpath d='M10 21h4'/%3E%3C/svg%3E");
      }

      @media (max-width: 768px) {
        .aha-v3-brand-mark { width: 42px !important; height: 42px !important; flex-basis: 42px !important; border-radius: 12px !important; }
        .aha-v3-next-inner { min-height: 154px; }
        .aha-v3-next-inner > div > strong { font-size: 44px !important; }
        .aha-v3-next-inner > div > span { font-size: 22px !important; }
        .aha-v3-next-inner > div > small { font-size: 18px !important; }
        .aha-v3-take-button { width: 100% !important; min-height: 54px !important; font-size: 19px !important; }

        .aha-v3-hero-photo {
          width: 64% !important;
          height: 80% !important;
          top: auto !important;
          bottom: 0 !important;
        }
        .aha-v3-hero-photo img {
          object-position: 74% 28% !important;
          transform: scale(1.03) !important;
        }

        .aha-mobile-nav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10020;
          display: block;
          padding: 7px 10px calc(7px + env(safe-area-inset-bottom));
          pointer-events: none;
        }
        .aha-mobile-nav-inner {
          width: min(560px, 100%);
          margin: 0 auto;
          min-height: 68px;
          padding: 6px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: end;
          gap: 3px;
          background: rgba(255,255,255,.96);
          border: 1px solid #d9e9f1;
          border-radius: 22px;
          box-shadow: 0 10px 34px rgba(29,89,118,.20);
          backdrop-filter: blur(18px);
          pointer-events: auto;
        }
        .aha-mobile-nav-item {
          min-width: 0;
          min-height: 56px;
          border: 0;
          background: transparent;
          color: #718896;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          font-weight: 850;
          padding: 3px 2px;
        }
        .aha-mobile-nav-item.active:not(.featured) {
          background: #eaf8fe;
          color: #167db6;
        }
        .aha-mobile-nav-item.danger { color: #d94742; }
        .aha-mobile-nav-item.danger.active { background: #fff0ef; }
        .aha-mobile-nav-item.featured {
          min-height: 66px;
          margin-top: -17px;
          border-radius: 20px;
          background: linear-gradient(145deg,#159fe0,#0d83c6);
          color: #fff;
          box-shadow: 0 8px 20px rgba(21,159,224,.32);
          border: 4px solid #fff;
        }
        .aha-mobile-nav-item.featured.active {
          background: linear-gradient(145deg,#0f91d2,#0879ba);
        }
        .aha-mobile-nav-icon { display: grid; place-items: center; line-height: 1; }
        .aha-mobile-nav-label { font-size: 10px; line-height: 1.15; white-space: nowrap; }
        .aha-mobile-nav-item.featured .aha-mobile-nav-label { font-size: 10px; font-weight: 900; }

        .aha-v3-content { padding-bottom: 104px !important; }
        .aha-v3-page { padding-bottom: 0 !important; }
      }
    `}</style>
  );
}
