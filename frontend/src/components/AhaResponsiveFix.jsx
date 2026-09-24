'use client';

export default function AhaResponsiveFix() {
  return (
    <style jsx global>{`
      /* Final responsive layer. Visual/navigation only; reminder, notification,
         authentication, API and database logic are untouched. */
      .aha-v3-sidebar[data-aha-navigation="true"] { visibility: visible !important; opacity: 1 !important; }

      /* Login: keep forgot-password separate and put the signup prompt underneath as normal text. */
      .aha-auth-row { display:flex !important; flex-direction:column !important; align-items:center !important; gap:8px !important; margin-top:2px !important; }
      .aha-auth-row .aha-auth-link:first-child { align-self:flex-end !important; }
      .aha-auth-row .aha-auth-link:last-child { align-self:center !important; color:#71858c !important; background:transparent !important; border:0 !important; box-shadow:none !important; padding:2px 0 !important; font-weight:500 !important; }
      .aha-auth-row .aha-auth-link:last-child strong { color:#2085b1 !important; font-weight:900 !important; }

      /* Home hero: keep the elderly photo's visual size, but make the image itself
         fill the complete height of the hero card without stretching the person. */
      .aha-v3-hero-photo {
        align-self: stretch !important;
        min-height: 100% !important;
        height: auto !important;
        overflow: hidden !important;
        position: relative !important;
      }
      .aha-v3-hero-photo img {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        min-height: 100% !important;
        object-fit: cover !important;
        object-position: center center !important;
      }
      .aha-v3-hero-photo .aha-v3-hero-note { position: absolute !important; }

      @media (max-width: 760px) {
        /* Exactly five bottom navigation destinations:
           Home / Medicine / Talk to AHA / Notifications / Emergency. */
        .aha-v3-sidebar[data-aha-navigation="true"] {
          display: flex !important;
          flex-direction: column !important;
          visibility: visible !important;
          opacity: 1 !important;
          transform: none !important;
        }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links {
          display: grid !important;
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
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
        /* Profile is not a bottom-tab. It remains available from the top-right
           account control on Home and other authenticated pages. */
        .aha-v3-page,
        .aha-page { padding-bottom: 94px !important; }

        .aha-v3-hero-photo {
          min-height: 100% !important;
        }
        .aha-v3-hero-photo img {
          height: 100% !important;
          object-fit: cover !important;
        }
      }

      @media (max-width: 390px) {
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button { padding-left:1px !important; padding-right:1px !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button span { font-size:10px !important; }
        .aha-auth-row .aha-auth-link:last-child { font-size:14px !important; }
      }
    `}</style>
  );
}
