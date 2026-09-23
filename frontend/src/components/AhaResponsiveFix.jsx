'use client';

export default function AhaResponsiveFix() {
  return (
    <style jsx global>{`
      /* Final responsive layer. This does not change reminder/notification logic. */
      .aha-v3-sidebar[data-aha-navigation="true"] {
        visibility: visible !important;
        opacity: 1 !important;
      }

      @media (max-width: 760px) {
        /* The SAME desktop navigation DOM is visible on mobile as a 5-tab bar. */
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
        }

        /* Keep all five tabs clickable and proportional on narrow phones. */
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button {
          display: flex !important;
          width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }

        /* Five-tab menu is the only bottom navigation. */
        .footer-nav,
        .home-footer-nav,
        .aha-v3-mobile-nav,
        .aha-mobile-nav {
          display: none !important;
        }

        .aha-v3-page,
        .aha-page {
          padding-bottom: 94px !important;
        }
      }

      @media (max-width: 390px) {
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button {
          padding-left: 1px !important;
          padding-right: 1px !important;
        }
      }
    `}</style>
  );
}
