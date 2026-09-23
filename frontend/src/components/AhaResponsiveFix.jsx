'use client';

export default function AhaResponsiveFix() {
  return (
    <style jsx global>{`
      /* Final responsive layer. This does not change reminder/notification logic. */
      .aha-v3-sidebar[data-aha-navigation="true"] { visibility: visible !important; opacity: 1 !important; }

      /* Login: keep forgot-password separate and put the signup prompt underneath as normal text. */
      .aha-auth-row { display:flex !important; flex-direction:column !important; align-items:center !important; gap:8px !important; margin-top:2px !important; }
      .aha-auth-row .aha-auth-link:first-child { align-self:flex-end !important; }
      .aha-auth-row .aha-auth-link:last-child { align-self:center !important; color:#71858c !important; background:transparent !important; border:0 !important; box-shadow:none !important; padding:2px 0 !important; font-weight:500 !important; }
      .aha-auth-row .aha-auth-link:last-child strong { color:#2085b1 !important; font-weight:900 !important; }

      @media (max-width: 760px) {
        /* Use the same navigation DOM on desktop and mobile. Mobile gets six compact tabs including Profile. */
        .aha-v3-sidebar[data-aha-navigation="true"] {
          display: flex !important;
          flex-direction: column !important;
          visibility: visible !important;
          opacity: 1 !important;
          transform: none !important;
        }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links {
          display: grid !important;
          grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
          width: 100% !important;
        }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button {
          display: flex !important;
          width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
          padding-left: 2px !important;
          padding-right: 2px !important;
        }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button span {
          min-width: 0 !important;
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        .footer-nav,
        .home-footer-nav,
        .aha-v3-mobile-nav,
        .aha-mobile-nav { display: none !important; }
        .aha-v3-page,
        .aha-page { padding-bottom: 94px !important; }
      }

      @media (max-width: 390px) {
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button { padding-left:1px !important; padding-right:1px !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button span { font-size:10px !important; }
        .aha-auth-row .aha-auth-link:last-child { font-size:14px !important; }
      }
    `}</style>
  );
}
