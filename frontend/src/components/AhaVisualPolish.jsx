'use client';

export default function AhaVisualPolish() {
  return (
    <style jsx global>{`
      /* AHA visual polish — UI only. Reminder/notification logic is untouched. */
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

      /* Notification switch: always a visible bell, never the AHA logo. */
      button[aria-label*="การแจ้งเตือน AHA"] {
        width: 50px !important;
        height: 50px !important;
        min-width: 50px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: #159fe0 !important;
        border: 0 !important;
        color: #fff !important;
        position: fixed !important;
        right: 14px !important;
        top: max(76px, env(safe-area-inset-top) + 62px) !important;
        z-index: 10050 !important;
        overflow: visible !important;
        box-shadow: 0 7px 18px rgba(21,159,224,.24) !important;
      }
      button[aria-label*="การแจ้งเตือน AHA"] > img,
      button[aria-label*="การแจ้งเตือน AHA"] > span { display: none !important; }
      button[aria-label*="การแจ้งเตือน AHA"]::before {
        content: "";
        width: 27px;
        height: 27px;
        display: block;
        background: center/contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9'/%3E%3Cpath d='M10 21h4'/%3E%3C/svg%3E");
      }
      button[aria-label*="การแจ้งเตือน AHA"]::after {
        content: "";
        position: absolute;
        right: -1px;
        bottom: -1px;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #16a34a;
        border: 2px solid #fff;
      }

      /* One navigation component only: Home SideNav becomes the bottom nav on mobile. */
      .aha-v3-mobile-nav,
      .aha-mobile-nav { display: none !important; }

      .aha-v3-sidebar .aha-v3-side-links {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }
      .aha-v3-sidebar .aha-v3-side-links button {
        position: relative !important;
      }
      .aha-v3-sidebar .aha-v3-side-links button.aha-v3-nav-voice {
        background: #eaf8fe !important;
        color: #167db6 !important;
        border: 1px solid #ccecf8 !important;
        font-weight: 900 !important;
      }
      .aha-v3-sidebar .aha-v3-side-links button.danger {
        color: #d94742 !important;
      }

      @media (max-width: 768px) {
        .aha-v3-brand-mark { width: 42px !important; height: 42px !important; flex-basis: 42px !important; border-radius: 12px !important; }
        .aha-v3-next-inner { min-height: 154px; }
        .aha-v3-next-inner > div > strong { font-size: 44px !important; }
        .aha-v3-next-inner > div > span { font-size: 22px !important; }
        .aha-v3-next-inner > div > small { font-size: 18px !important; }
        .aha-v3-take-button { width: 100% !important; min-height: 54px !important; font-size: 19px !important; }

        .aha-v3-hero-photo { width: 64% !important; height: 80% !important; top: auto !important; bottom: 0 !important; }
        .aha-v3-hero-photo img { object-position: 74% 28% !important; transform: scale(1.03) !important; }

        /* Same SideNav DOM; only layout changes. No second mobile menu. */
        .aha-v3-sidebar {
          position: fixed !important;
          left: 8px !important;
          right: 8px !important;
          bottom: calc(7px + env(safe-area-inset-bottom)) !important;
          top: auto !important;
          width: auto !important;
          height: 78px !important;
          min-height: 0 !important;
          z-index: 10020 !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          padding: 5px !important;
          border-radius: 22px !important;
          background: rgba(255,255,255,.98) !important;
          border: 1px solid #d9e9f1 !important;
          box-shadow: 0 10px 34px rgba(29,89,118,.20) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
        }
        .aha-v3-sidebar > .aha-v3-brand,
        .aha-v3-sidebar > .aha-v3-side-spacer,
        .aha-v3-sidebar > .aha-v3-side-care,
        .aha-v3-sidebar > .aha-v3-side-wellness { display: none !important; }
        .aha-v3-sidebar .aha-v3-side-links {
          width: 100% !important;
          height: 100% !important;
          display: grid !important;
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          align-items: stretch !important;
          gap: 3px !important;
          margin: 0 !important;
        }
        .aha-v3-sidebar .aha-v3-side-links button {
          min-width: 0 !important;
          min-height: 0 !important;
          height: 66px !important;
          margin: 0 !important;
          padding: 4px 2px !important;
          border: 0 !important;
          border-radius: 16px !important;
          background: transparent !important;
          color: #718896 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 4px !important;
          box-shadow: none !important;
          font-weight: 850 !important;
          line-height: 1 !important;
        }
        .aha-v3-sidebar .aha-v3-side-links button.active {
          background: #eaf8fe !important;
          color: #167db6 !important;
        }
        .aha-v3-sidebar .aha-v3-side-links button.aha-v3-nav-voice {
          background: linear-gradient(145deg,#159fe0,#0d83c6) !important;
          color: #fff !important;
          border: 4px solid #fff !important;
          border-radius: 20px !important;
          height: 74px !important;
          margin-top: -15px !important;
          box-shadow: 0 8px 20px rgba(21,159,224,.32) !important;
        }
        .aha-v3-sidebar .aha-v3-side-links button.danger { color: #d94742 !important; }
        .aha-v3-sidebar .aha-v3-side-links button span {
          display: block !important;
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          font-size: 10px !important;
          line-height: 1.15 !important;
        }
        .aha-v3-content,
        .aha-v3-page { padding-bottom: 104px !important; }

        /* Keep notification bell clear of the mobile navigation. */
        button[aria-label*="การแจ้งเตือน AHA"] {
          right: 12px !important;
          top: max(68px, env(safe-area-inset-top) + 58px) !important;
        }
      }

      @media (max-width: 380px) {
        .aha-v3-sidebar { left: 5px !important; right: 5px !important; border-radius: 18px !important; }
        .aha-v3-sidebar .aha-v3-side-links button span { font-size: 9px !important; }
        .aha-v3-sidebar .aha-v3-side-links button.aha-v3-nav-voice { height: 70px !important; }
      }
    `}</style>
  );
}
