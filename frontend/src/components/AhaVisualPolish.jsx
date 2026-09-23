'use client';

export default function AhaVisualPolish() {
  return (
    <style jsx global>{`
      /* =========================================================
         AHA visual polish — UI only
         Do not change reminder / notification logic here.
         ========================================================= */

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

      .aha-v3-next-inner {
        min-height: 132px;
        align-items: center;
      }
      .aha-v3-next-inner > div > strong {
        font-size: clamp(38px, 4vw, 54px) !important;
        line-height: .95 !important;
      }
      .aha-v3-next-inner > div > span {
        font-size: clamp(20px, 2vw, 25px) !important;
        font-weight: 800 !important;
      }
      .aha-v3-next-inner > div > small { font-size: 17px !important; }
      .aha-v3-next .aha-v3-primary-button {
        min-height: 52px;
        font-size: 17px;
        font-weight: 800;
      }
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

      /* Greeting / elderly photo */
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

      /* Notification bell */
      button[aria-label*="การแจ้งเตือน AHA"] {
        width: 48px !important;
        height: 48px !important;
        min-width: 48px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: #159fe0 !important;
        border: 0 !important;
        color: #fff !important;
        position: relative !important;
        overflow: visible !important;
        box-shadow: 0 7px 18px rgba(21,159,224,.24) !important;
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
        flex: 0 0 25px;
        background: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9'/%3E%3Cpath d='M10 21h4'/%3E%3C/svg%3E");
      }

      /* IMPORTANT: the home page still contains the legacy 4-item
         mobile nav. The global AHA nav is the single source of truth.
         Hide the legacy one instead of rendering two menus. */
      .aha-v3-mobile-nav {
        display: none !important;
      }

      /* =========================================================
         One mobile navigation — AHA MobileNav only
         ========================================================= */
      .aha-mobile-nav {
        display: none !important;
      }

      @media (max-width: 768px) {
        .aha-v3-brand-mark {
          width: 42px !important;
          height: 42px !important;
          flex-basis: 42px !important;
          border-radius: 12px !important;
        }
        .aha-v3-next-inner { min-height: 154px; }
        .aha-v3-next-inner > div > strong { font-size: 44px !important; }
        .aha-v3-next-inner > div > span { font-size: 22px !important; }
        .aha-v3-next-inner > div > small { font-size: 18px !important; }
        .aha-v3-take-button {
          width: 100% !important;
          min-height: 54px !important;
          font-size: 19px !important;
        }

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
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 10020 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          padding: 7px 10px calc(7px + env(safe-area-inset-bottom)) !important;
          pointer-events: none !important;
        }
        .aha-mobile-nav-inner {
          width: min(560px, 100%) !important;
          margin: 0 auto !important;
          min-height: 72px !important;
          padding: 6px !important;
          display: grid !important;
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          align-items: end !important;
          gap: 3px !important;
          background: rgba(255,255,255,.98) !important;
          border: 1px solid #d9e9f1 !important;
          border-radius: 22px !important;
          box-shadow: 0 10px 34px rgba(29,89,118,.20) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
          pointer-events: auto !important;
        }
        .aha-mobile-nav-item {
          appearance: none !important;
          -webkit-appearance: none !important;
          min-width: 0 !important;
          min-height: 56px !important;
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          color: #718896 !important;
          border-radius: 16px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 3px !important;
          font-weight: 850 !important;
          padding: 3px 2px !important;
          margin: 0 !important;
          line-height: 1 !important;
          box-shadow: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        .aha-mobile-nav-item.active:not(.featured) {
          background: #eaf8fe !important;
          background-color: #eaf8fe !important;
          color: #167db6 !important;
        }
        .aha-mobile-nav-item.danger { color: #d94742 !important; }
        .aha-mobile-nav-item.danger.active {
          background: #fff0ef !important;
          background-color: #fff0ef !important;
        }
        .aha-mobile-nav-item.featured {
          min-height: 66px !important;
          margin-top: -17px !important;
          border-radius: 20px !important;
          background: linear-gradient(145deg,#159fe0,#0d83c6) !important;
          background-color: #159fe0 !important;
          color: #fff !important;
          box-shadow: 0 8px 20px rgba(21,159,224,.32) !important;
          border: 4px solid #fff !important;
        }
        .aha-mobile-nav-item.featured.active {
          background: linear-gradient(145deg,#0f91d2,#0879ba) !important;
          background-color: #0f91d2 !important;
          color: #fff !important;
        }
        .aha-mobile-nav-icon {
          display: grid !important;
          place-items: center !important;
          line-height: 1 !important;
          width: 27px !important;
          height: 27px !important;
          flex: 0 0 27px !important;
        }
        .aha-mobile-nav-label {
          display: block !important;
          color: inherit !important;
          font-size: 10px !important;
          line-height: 1.15 !important;
          white-space: nowrap !important;
          font-weight: 850 !important;
        }
        .aha-mobile-nav-item.featured .aha-mobile-nav-label {
          font-size: 10px !important;
          font-weight: 900 !important;
        }

        /* Give page content room above the fixed nav. */
        .aha-v3-content,
        .aha-v3-page,
        .aha-page,
        .home-page {
          padding-bottom: 104px !important;
        }
      }

      @media (max-width: 380px) {
        .aha-mobile-nav { padding-left: 5px !important; padding-right: 5px !important; }
        .aha-mobile-nav-inner { border-radius: 18px !important; padding: 5px !important; }
        .aha-mobile-nav-item { min-height: 53px !important; }
        .aha-mobile-nav-item.featured { min-height: 62px !important; }
        .aha-mobile-nav-label { font-size: 9px !important; }
      }
    `}</style>
  );
}
