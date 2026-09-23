'use client';

export default function AhaVisualPolish() {
  return (
    <style jsx global>{`
      /* AHA UI polish — visual/responsive only. Reminder and push logic is untouched. */
      .aha-v3-brand-mark {
        width: 48px !important;
        height: 48px !important;
        border-radius: 14px !important;
        overflow: hidden !important;
        background: #f8fdff url('/icons/aha-icon.svg') center/cover no-repeat !important;
        flex: 0 0 48px !important;
      }
      .aha-v3-brand-mark svg { display: none !important; }

      /* The shared navigation is the only navigation source for desktop + mobile. */
      .aha-v3-sidebar[data-aha-navigation="true"] {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        z-index: 10020 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button {
        position: relative !important;
        flex: 0 0 auto !important;
      }
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice {
        background: #eaf8fe !important;
        color: #167db6 !important;
        border: 1px solid #ccecf8 !important;
        font-weight: 900 !important;
      }
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.danger {
        color: #d94742 !important;
      }

      /* Pages other than Home also reserve space for the same desktop navigation. */
      @media (min-width: 1051px) {
        .aha-v3-page { margin-left: 214px !important; }
        .aha-page,
        .aha-voice-page,
        .aha-emergency-page { margin-left: 214px !important; }
      }
      @media (min-width: 761px) and (max-width: 1050px) {
        .aha-v3-page { margin-left: 180px !important; }
        .aha-page,
        .aha-voice-page,
        .aha-emergency-page { margin-left: 180px !important; }
      }

      /* Do not render the old page-specific bottom menu: the shared menu replaces it. */
      .footer-nav,
      .home-footer-nav,
      .aha-v3-mobile-nav,
      .aha-mobile-nav { display: none !important; }

      /* Home greeting card: smaller and more balanced. */
      .aha-v3-hero {
        height: clamp(205px, 19vw, 238px) !important;
        min-height: 205px !important;
        max-height: 238px !important;
      }
      .aha-v3-hero-copy { padding-top: clamp(22px, 3vw, 30px) !important; }
      .aha-v3-hero-copy h1 { font-size: clamp(34px, 3.6vw, 46px) !important; }
      .aha-v3-hero-photo { width: 50% !important; }
      .aha-v3-hero-photo img {
        object-position: 74% 30% !important;
        transform: scale(1.01) !important;
        transform-origin: center bottom !important;
      }
      .aha-v3-hero-note { z-index: 6 !important; }

      /* Next medicine card: useful sizing instead of oversized numbers. */
      .aha-v3-next-inner { min-height: 118px; align-items: center; }
      .aha-v3-next-inner > div > strong {
        font-size: clamp(32px, 3.5vw, 48px) !important;
        line-height: .98 !important;
      }
      .aha-v3-next-inner > div > span {
        font-size: clamp(17px, 1.7vw, 22px) !important;
        font-weight: 800 !important;
      }
      .aha-v3-next-inner > div > small { font-size: clamp(12px, 1.2vw, 16px) !important; }
      .aha-v3-next .aha-v3-primary-button { min-height: 48px; font-size: 15px; font-weight: 800; }
      .aha-v3-take-button {
        min-height: 48px !important;
        min-width: 112px !important;
        padding: 8px 14px !important;
        border-radius: 12px !important;
        font-size: 17px !important;
        font-weight: 800 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 1 !important;
        visibility: visible !important;
      }

      /* Fluid cards/content: no fixed desktop-sized blocks on phones. */
      .aha-v3-content,
      .aha-page,
      .aha-shell,
      .aha-voice-page,
      .aha-emergency-page { min-width: 0 !important; }
      .aha-v3-card,
      .aha-v3-today-card,
      .aha-v3-action,
      .aha-v3-care-card,
      .aha-v3-wellness,
      .card,
      .reminder-card,
      .notification-item { min-width: 0 !important; }
      .aha-v3-med-row > div,
      .aha-v3-next-inner > div { min-width: 0 !important; }

      /* Notification control: actual 🔔 with green/gray status. */
      button[aria-label*="การแจ้งเตือน AHA"] {
        width: 52px !important;
        height: 52px !important;
        min-width: 52px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(255,255,255,.96) !important;
        border: 1px solid #d8eaf2 !important;
        color: #0f9b76 !important;
        position: fixed !important;
        right: 14px !important;
        top: max(76px, env(safe-area-inset-top) + 62px) !important;
        z-index: 10050 !important;
        overflow: visible !important;
        box-shadow: 0 8px 22px rgba(28,108,148,.16) !important;
        font-size: 29px !important;
        line-height: 1 !important;
      }
      button[aria-label*="การแจ้งเตือน AHA"] .aha-notification-emoji {
        display: block !important;
        font-size: 29px !important;
        line-height: 1 !important;
        transform: translateY(-1px) !important;
        filter: none !important;
      }
      button[aria-label*="การแจ้งเตือน AHA"] .aha-notification-status {
        position: absolute !important;
        right: -1px !important;
        bottom: -1px !important;
        width: 14px !important;
        height: 14px !important;
        border-radius: 50% !important;
        border: 2px solid #fff !important;
        background: #64748b !important;
      }
      button[aria-label="ปิดการแจ้งเตือน AHA"] .aha-notification-status { background: #16a34a !important; }
      button[aria-label="เปิดการแจ้งเตือน AHA"] .aha-notification-status { background: #94a3b8 !important; }

      @media (max-width: 760px) {
        /* Same navigation DOM, now transformed into the five-tab mobile menu. */
        .aha-v3-page,
        .aha-page,
        .aha-voice-page,
        .aha-emergency-page { margin-left: 0 !important; }

        .aha-v3-sidebar[data-aha-navigation="true"] {
          left: max(6px, env(safe-area-inset-left)) !important;
          right: max(6px, env(safe-area-inset-right)) !important;
          top: auto !important;
          bottom: calc(7px + env(safe-area-inset-bottom)) !important;
          width: auto !important;
          height: 72px !important;
          min-height: 72px !important;
          padding: 5px !important;
          border-radius: 21px !important;
          background: rgba(255,255,255,.98) !important;
          border: 1px solid #d9e9f1 !important;
          box-shadow: 0 10px 34px rgba(29,89,118,.20) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
          overflow: visible !important;
        }
        .aha-v3-sidebar[data-aha-navigation="true"] > .aha-v3-brand,
        .aha-v3-sidebar[data-aha-navigation="true"] > .aha-v3-side-spacer,
        .aha-v3-sidebar[data-aha-navigation="true"] > .aha-v3-side-care,
        .aha-v3-sidebar[data-aha-navigation="true"] > .aha-v3-side-wellness { display: none !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          display: grid !important;
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          align-items: stretch !important;
          gap: 2px !important;
        }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button {
          min-width: 0 !important;
          min-height: 0 !important;
          width: 100% !important;
          height: 61px !important;
          margin: 0 !important;
          padding: 4px 2px !important;
          border: 0 !important;
          border-radius: 15px !important;
          background: transparent !important;
          color: #718896 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 3px !important;
          box-shadow: none !important;
          font-weight: 850 !important;
          line-height: 1 !important;
          font-size: clamp(8px, 2.45vw, 11px) !important;
          overflow: hidden !important;
        }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.active {
          background: #eaf8fe !important;
          color: #167db6 !important;
        }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice {
          background: linear-gradient(145deg,#159fe0,#0d83c6) !important;
          color: #fff !important;
          border: 4px solid #fff !important;
          border-radius: 19px !important;
          height: 69px !important;
          margin-top: -10px !important;
          box-shadow: 0 8px 20px rgba(21,159,224,.32) !important;
        }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.danger { color: #d94742 !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button svg {
          width: clamp(20px, 6vw, 27px) !important;
          height: clamp(20px, 6vw, 27px) !important;
          flex: 0 0 auto !important;
        }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button span {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          font-size: inherit !important;
          line-height: 1.1 !important;
          text-align: center !important;
        }

        /* Reserve bottom space everywhere so the five-tab menu never covers content. */
        .aha-v3-page,
        .aha-v3-content,
        .aha-page { padding-bottom: 94px !important; }
        .aha-shell { width: calc(100% - 20px) !important; }
        .aha-v3-content { width: 100% !important; padding-left: 10px !important; padding-right: 10px !important; }

        /* Smaller, proportional greeting card on phones. */
        .aha-v3-hero {
          height: clamp(188px, 54vw, 222px) !important;
          min-height: 188px !important;
          max-height: 222px !important;
          border-radius: 19px !important;
        }
        .aha-v3-hero-copy {
          width: 58% !important;
          padding: 22px 0 16px 18px !important;
        }
        .aha-v3-hero-copy h1 { font-size: clamp(25px, 7.6vw, 33px) !important; line-height: 1.1 !important; }
        .aha-v3-hero-copy p { font-size: clamp(11px, 3.5vw, 14px) !important; line-height: 1.4 !important; }
        .aha-v3-hero-photo { width: 62% !important; height: 74% !important; top: auto !important; bottom: 0 !important; }
        .aha-v3-hero-photo img { object-position: 74% 28% !important; transform: scale(1.01) !important; }
        .aha-v3-hero-note { right: 10px !important; top: 10px !important; font-size: clamp(9px, 2.8vw, 12px) !important; }

        /* Fluid typography for all major Home elements. */
        .aha-v3-next-inner > div > strong { font-size: clamp(28px, 9vw, 39px) !important; }
        .aha-v3-next-inner > div > span { font-size: clamp(12px, 4.3vw, 18px) !important; }
        .aha-v3-next-inner > div > small { font-size: clamp(9px, 3vw, 13px) !important; }
        .aha-v3-take-button { min-width: 96px !important; min-height: 44px !important; font-size: clamp(14px, 4vw, 18px) !important; }

        /* Keep notification control above the content but away from bottom navigation. */
        button[aria-label*="การแจ้งเตือน AHA"] {
          right: 12px !important;
          top: max(70px, env(safe-area-inset-top) + 58px) !important;
          width: clamp(46px, 13vw, 52px) !important;
          height: clamp(46px, 13vw, 52px) !important;
          min-width: 46px !important;
          min-height: 46px !important;
          font-size: clamp(25px, 8vw, 30px) !important;
        }
        button[aria-label*="การแจ้งเตือน AHA"] .aha-notification-emoji { font-size: clamp(25px, 8vw, 30px) !important; }
      }

      @media (max-width: 390px) {
        .aha-v3-sidebar[data-aha-navigation="true"] { left: 4px !important; right: 4px !important; height: 68px !important; min-height: 68px !important; border-radius: 18px !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button { height: 57px !important; padding-left: 1px !important; padding-right: 1px !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.aha-v3-nav-voice { height: 65px !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button span { font-size: 8px !important; }
        .aha-v3-content { padding-left: 8px !important; padding-right: 8px !important; }
      }
    `}</style>
  );
}
