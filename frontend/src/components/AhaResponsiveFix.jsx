'use client';

export default function AhaResponsiveFix() {
  return (
    <style jsx global>{`
      /* Final responsive layer. Visual/navigation only; reminder, notification,
         authentication, API and database logic are untouched. */
      .aha-v3-sidebar[data-aha-navigation="true"] { visibility: visible !important; opacity: 1 !important; }

      /* =========================================================
         LOGIN UX/UI — visual only
         Keep the existing LoginForm state, validation and API flow untouched.
         ========================================================= */
      .aha-auth-page {
        min-height: 100svh !important;
        padding: 28px 20px !important;
        background: #f4f7f8 !important;
        color: #243943 !important;
      }
      .aha-auth-card {
        width: min(900px, 100%) !important;
        grid-template-columns: 35% 65% !important;
        border-radius: 18px !important;
        border: 1px solid #d9e3e6 !important;
        box-shadow: 0 12px 36px rgba(34, 58, 67, .09) !important;
      }
      .aha-auth-brand-panel {
        min-height: 560px !important;
        padding: 30px 28px !important;
        background: #f0f7f8 !important;
        border-right: 1px solid #dce7e9 !important;
      }
      .aha-auth-logo {
        width: 42px !important;
        height: 42px !important;
        border-radius: 12px !important;
        box-shadow: none !important;
      }
      .aha-auth-message {
        margin: 46px 0 auto !important;
      }
      .aha-auth-message small {
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #2788a9 !important;
      }
      .aha-auth-message h1 {
        font-size: 31px !important;
        line-height: 1.25 !important;
        margin: 9px 0 10px !important;
        letter-spacing: -.4px !important;
      }
      .aha-auth-message p {
        max-width: 275px !important;
        font-size: 13px !important;
        line-height: 1.65 !important;
      }
      .aha-auth-points {
        margin-top: 28px !important;
        gap: 7px !important;
      }
      .aha-auth-points div {
        font-size: 12px !important;
      }

      .aha-auth-form-panel {
        padding: 34px 42px 38px !important;
      }
      .aha-auth-heading {
        margin-bottom: 20px !important;
      }
      .aha-auth-heading .aha-auth-kicker {
        font-size: 13px !important;
        letter-spacing: .08em !important;
        font-weight: 700 !important;
        color: #2387aa !important;
      }
      .aha-auth-heading h2 {
        font-size: 30px !important;
        line-height: 1.25 !important;
        margin: 6px 0 5px !important;
        color: #243b44 !important;
        letter-spacing: -.3px !important;
      }
      .aha-auth-heading p {
        font-size: 14px !important;
        line-height: 1.55 !important;
        color: #71858c !important;
      }

      /* Tabs should look like a normal product switcher, not a decorative AI card. */
      .aha-auth-tabs {
        background: #f4f7f7 !important;
        border: 1px solid #dce6e8 !important;
        border-radius: 10px !important;
        padding: 3px !important;
        gap: 2px !important;
        margin-bottom: 22px !important;
      }
      .aha-auth-tabs button {
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #687d84 !important;
        min-height: 40px !important;
      }
      .aha-auth-tabs button.active {
        background: #fff !important;
        color: #2085a9 !important;
        box-shadow: 0 1px 4px rgba(35, 65, 75, .08) !important;
      }

      .aha-auth-field { margin-bottom: 16px !important; }
      .aha-auth-field label {
        font-size: 13px !important;
        font-weight: 700 !important;
        color: #344e58 !important;
        margin-bottom: 7px !important;
      }
      .aha-auth-field input {
        min-height: 48px !important;
        border-radius: 9px !important;
        border: 1px solid #ccdadd !important;
        background: #fff !important;
        box-shadow: none !important;
        font-size: 15px !important;
        color: #243943 !important;
      }
      .aha-auth-field input:focus {
        border-color: #2b9bc2 !important;
        box-shadow: 0 0 0 3px rgba(43, 155, 194, .10) !important;
        outline: none !important;
      }

      /* Forgot password remains a clear action; signup is ordinary supporting text. */
      .aha-auth-row {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 9px !important;
        margin: 2px 0 20px !important;
      }
      .aha-auth-row .aha-auth-link:first-child {
        align-self: flex-end !important;
        color: #2085b1 !important;
        font-size: 13px !important;
        font-weight: 700 !important;
      }
      .aha-auth-row .aha-auth-link:last-child {
        align-self: center !important;
        color: #71858c !important;
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        padding: 2px 0 !important;
        font-size: 14px !important;
        font-weight: 400 !important;
      }
      .aha-auth-row .aha-auth-link:last-child strong {
        color: #2085b1 !important;
        font-weight: 600 !important;
      }

      .aha-auth-submit {
        min-height: 50px !important;
        border-radius: 10px !important;
        background: #238bb1 !important;
        box-shadow: none !important;
        font-size: 16px !important;
        font-weight: 700 !important;
      }
      .aha-auth-submit:hover:not(:disabled) { background: #1d7899 !important; }
      .aha-auth-error {
        border-radius: 9px !important;
        background: #fff6f5 !important;
        border: 1px solid #efd3cf !important;
        box-shadow: none !important;
      }

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

        .aha-v3-hero-photo { min-height: 100% !important; }
        .aha-v3-hero-photo img { height: 100% !important; object-fit: cover !important; }

        /* Login becomes a conventional single-column form on phones. */
        .aha-auth-page {
          display: block !important;
          padding: 16px !important;
          background: #f7f9f9 !important;
        }
        .aha-auth-card {
          display: block !important;
          width: 100% !important;
          border-radius: 14px !important;
          box-shadow: 0 6px 24px rgba(34, 58, 67, .08) !important;
        }
        .aha-auth-brand-panel {
          min-height: auto !important;
          padding: 20px 20px 17px !important;
          border-right: 0 !important;
          border-bottom: 1px solid #dce7e9 !important;
        }
        .aha-auth-message {
          margin: 18px 0 0 !important;
        }
        .aha-auth-message h1 {
          font-size: 25px !important;
          margin: 6px 0 6px !important;
        }
        .aha-auth-message p {
          max-width: none !important;
          font-size: 13px !important;
          line-height: 1.55 !important;
        }
        .aha-auth-points { display: none !important; }
        .aha-auth-form-panel { padding: 24px 20px 26px !important; }
        .aha-auth-heading h2 { font-size: 26px !important; }
        .aha-auth-tabs button { font-size: 12px !important; }
      }

      @media (max-width: 390px) {
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button { padding-left:1px !important; padding-right:1px !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button span { font-size:10px !important; }
        .aha-auth-row .aha-auth-link:last-child { font-size:14px !important; }
      }
    `}</style>
  );
}
