'use client';

export default function AhaResponsiveFix() {
  return (
    <style jsx global>{`
      /* =========================================================
         AHA UX/UI visual layer
         IMPORTANT: visual/layout only. Existing auth, API, reminder,
         notification and database logic is intentionally untouched.
         ========================================================= */

      /* ---------- AUTH / LOGIN ---------- */
      .aha-auth-page { min-height:100svh !important; padding:28px 20px !important; background:#fff !important; color:#202b35 !important; font-family:Arial,"Noto Sans Thai",sans-serif !important; }
      .aha-auth-card { position:relative !important; width:min(920px,100%) !important; grid-template-columns:40% 60% !important; border:1px solid #e1e7ee !important; border-radius:22px !important; background:#fff !important; box-shadow:0 16px 45px rgba(25,54,82,.10) !important; overflow:hidden !important; }
      .aha-auth-brand-panel { position:relative !important; isolation:isolate !important; min-height:570px !important; padding:34px 30px !important; background:#2f6bff !important; border-right:0 !important; overflow:hidden !important; color:#fff !important; }
      .aha-auth-brand-panel::before { content:"" !important; position:absolute !important; z-index:-1 !important; width:390px !important; height:260px !important; left:-135px !important; bottom:-120px !important; border-radius:50% !important; background:#ffb84d !important; opacity:.92 !important; }
      .aha-auth-brand-panel::after { content:"" !important; position:absolute !important; z-index:-1 !important; width:460px !important; height:300px !important; right:-270px !important; top:-155px !important; border-radius:50% !important; background:#fff !important; opacity:.96 !important; }
      .aha-auth-brand,.aha-auth-message,.aha-auth-points { position:relative !important; z-index:2 !important; }
      .aha-auth-brand { color:#fff !important; }
      .aha-auth-brand>div:last-child strong { color:#fff !important; }
      .aha-auth-brand span { color:rgba(255,255,255,.82) !important; }
      .aha-auth-logo { width:44px !important; height:44px !important; border-radius:13px !important; background:rgba(255,255,255,.96) !important; border:0 !important; color:#2f6bff !important; box-shadow:0 5px 18px rgba(0,0,0,.08) !important; }
      .aha-auth-message { margin:105px 0 auto !important; }
      .aha-auth-message small { color:#fff !important; font-size:13px !important; font-weight:600 !important; }
      .aha-auth-message h1 { color:#fff !important; font-size:37px !important; line-height:1.2 !important; margin:9px 0 12px !important; letter-spacing:-.5px !important; }
      .aha-auth-message p { max-width:300px !important; color:rgba(255,255,255,.88) !important; font-size:14px !important; line-height:1.7 !important; }
      .aha-auth-points { gap:9px !important; }
      .aha-auth-points div { color:#fff !important; font-size:12px !important; }
      .aha-auth-points svg { color:#ffcf70 !important; }
      .aha-auth-form-panel { padding:38px 44px 34px !important; background:#fff !important; }
      .aha-auth-heading { margin-bottom:19px !important; }
      .aha-auth-heading .aha-auth-kicker { color:#2f6bff !important; font-size:12px !important; font-weight:700 !important; letter-spacing:.10em !important; }
      .aha-auth-heading h2 { color:#151c24 !important; font-size:29px !important; line-height:1.25 !important; margin:5px 0 !important; letter-spacing:-.35px !important; }
      .aha-auth-heading p { color:#737d88 !important; font-size:13px !important; line-height:1.55 !important; }
      .aha-auth-tabs { display:grid !important; grid-template-columns:repeat(3,1fr) !important; background:#f5f7fa !important; border:1px solid #e2e7ed !important; border-radius:12px !important; padding:3px !important; gap:3px !important; margin-bottom:20px !important; }
      .aha-auth-tabs button { min-height:39px !important; border:0 !important; border-radius:9px !important; background:transparent !important; color:#737d88 !important; font-size:12px !important; font-weight:600 !important; }
      .aha-auth-tabs button.active { background:#fff !important; color:#2f6bff !important; box-shadow:0 2px 7px rgba(28,52,77,.08) !important; }
      .aha-auth-field { margin-bottom:14px !important; }
      .aha-auth-field label { color:#222a33 !important; font-size:13px !important; font-weight:700 !important; margin-bottom:7px !important; }
      .aha-auth-field input { min-height:47px !important; border:1px solid #d6dde5 !important; border-radius:11px !important; background:#fff !important; color:#1d2630 !important; font-size:14px !important; box-shadow:none !important; }
      .aha-auth-field input::placeholder { color:#a4acb5 !important; }
      .aha-auth-field input:focus { border-color:#2f6bff !important; box-shadow:0 0 0 3px rgba(47,107,255,.10) !important; outline:none !important; }

      /* Standard login layout: forgot password under the password field,
         sign-up prompt below the primary login button. */
      .aha-auth-row { display:flex !important; flex-direction:row !important; justify-content:flex-end !important; align-items:center !important; margin:1px 0 18px !important; }
      .aha-auth-row .aha-auth-link { color:#000 !important; background:transparent !important; border:0 !important; box-shadow:none !important; padding:2px 0 !important; font-size:13px !important; font-weight:500 !important; text-decoration:none !important; }
      .aha-auth-row .aha-auth-link:first-child { color:#2f6bff !important; font-weight:600 !important; }
      .aha-auth-row .aha-auth-link:last-child { color:#000 !important; cursor:pointer !important; pointer-events:auto !important; }
      .aha-auth-row .aha-auth-link:last-child strong { color:#2f6bff !important; font-weight:600 !important; }

      /* Only password-login forms contain .aha-auth-row. Reflow that form
         without changing React handlers or authentication logic. */
      .aha-auth-form-panel form:has(.aha-auth-row) { display:flex !important; flex-direction:column !important; }
      .aha-auth-form-panel form:has(.aha-auth-row) .aha-auth-row { display:contents !important; }
      .aha-auth-form-panel form:has(.aha-auth-row) .aha-auth-row .aha-auth-link:first-child { order:2 !important; align-self:flex-end !important; margin:-5px 0 16px !important; }
      .aha-auth-form-panel form:has(.aha-auth-row) .aha-auth-submit { order:3 !important; }
      .aha-auth-form-panel form:has(.aha-auth-row) .aha-auth-row .aha-auth-link:last-child { order:4 !important; align-self:center !important; margin:12px 0 0 !important; }
      .aha-auth-form-panel form:has(.aha-auth-row) .aha-auth-error { order:2 !important; }

      .aha-auth-submit { width:100% !important; min-height:49px !important; border:0 !important; border-radius:11px !important; background:#2f6bff !important; color:#fff !important; font-size:15px !important; font-weight:700 !important; box-shadow:0 7px 16px rgba(47,107,255,.18) !important; }
      .aha-auth-submit:hover:not(:disabled) { background:#245be0 !important; }
      .aha-auth-submit:disabled { opacity:.65 !important; }
      .aha-auth-error { border-radius:10px !important; border:1px solid #f0d0d0 !important; background:#fff7f7 !important; box-shadow:none !important; }
      .aha-auth-error strong { color:#b42318 !important; }
      .aha-auth-error span { color:#6d4040 !important; }

      /* ---------- HOME ---------- */
      .aha-v3-hero,.aha-v3-hero-card,.aha-v3-hero-banner { max-height:205px !important; min-height:155px !important; }
      .aha-v3-hero-photo { align-self:stretch !important; height:100% !important; min-height:100% !important; overflow:hidden !important; position:relative !important; }
      .aha-v3-hero-photo img { display:block !important; width:100% !important; height:100% !important; min-height:100% !important; object-fit:cover !important; object-position:center center !important; }
      .aha-v3-hero-copy h1 { font-size:clamp(24px,3vw,31px) !important; }
      .aha-v3-hero-copy p { font-size:13px !important; }
      .aha-v3-top-actions { display:flex !important; align-items:center !important; justify-content:flex-end !important; gap:8px !important; }
      .aha-v3-top-actions > button:nth-child(1),.aha-v3-top-actions > button:nth-child(3) { display:none !important; }
      .aha-v3-top-actions > button:nth-child(2) { display:grid !important; place-items:center !important; width:44px !important; height:44px !important; padding:0 !important; border:1px solid #d9e2ea !important; background:#fff !important; border-radius:50% !important; cursor:pointer !important; visibility:visible !important; opacity:1 !important; }
      .aha-v3-top-actions > button:nth-child(2) .aha-v3-user-avatar { display:grid !important; place-items:center !important; width:34px !important; height:34px !important; border-radius:50% !important; background:#2f6bff !important; color:#fff !important; font-weight:700 !important; }

      /* ---------- AHA DESIGN SYSTEM / APPEARANCE ---------- */
      :root {
        --aha-bg:#f7f7f5;
        --aha-surface:#ffffff;
        --aha-surface-soft:#f1f2f4;
        --aha-text:#111111;
        --aha-text-secondary:#62666d;
        --aha-border:#e2e3e6;
        --aha-primary:#2f6bff;
        --aha-success:#16856f;
        --aha-warning:#b66b00;
        --aha-danger:#c8323e;
        --aha-radius:20px;
        --aha-shadow:0 7px 24px rgba(15,23,42,.055);
        color-scheme:light;
      }
      html[data-aha-appearance="dark"] {
        --aha-bg:#000000;
        --aha-surface:#171719;
        --aha-surface-soft:#242427;
        --aha-text:#ffffff;
        --aha-text-secondary:#b8b8bd;
        --aha-border:#343438;
        --aha-primary:#6f96ff;
        --aha-success:#54c8aa;
        --aha-warning:#ffbd59;
        --aha-danger:#ff6670;
        --aha-shadow:none;
        color-scheme:dark;
      }
      html[data-aha-appearance="light"] { color-scheme:light; }
      body { background:var(--aha-bg); color:var(--aha-text); }
      .aha-v3-page,.aha-page { background:var(--aha-bg) !important; color:var(--aha-text) !important; }
      .aha-v3-main,.aha-v3-content { color:var(--aha-text) !important; }
      .aha-v3-card,.aha-v3-today-card,.aha-v3-topbar,.aha-shell,.card,.panel {
        background:var(--aha-surface) !important;
        border-color:var(--aha-border) !important;
        color:var(--aha-text) !important;
      }
      html[data-aha-appearance="dark"] .aha-v3-card,
      html[data-aha-appearance="dark"] .aha-v3-today-card,
      html[data-aha-appearance="dark"] .aha-shell,
      html[data-aha-appearance="dark"] .card,
      html[data-aha-appearance="dark"] .panel { box-shadow:none !important; }
      html[data-aha-appearance="dark"] input,
      html[data-aha-appearance="dark"] select,
      html[data-aha-appearance="dark"] textarea {
        background:var(--aha-surface-soft) !important;
        border-color:var(--aha-border) !important;
        color:var(--aha-text) !important;
      }
      html[data-aha-appearance="dark"] input::placeholder,
      html[data-aha-appearance="dark"] textarea::placeholder { color:var(--aha-text-secondary) !important; }

      /* ---------- DARK MODE: HOME + PRIMARY NAV ----------
         Keep semantic accents, but restore readable hierarchy on dark surfaces. */
      html[data-aha-appearance="dark"] .aha-v3-topbar {
        background:#111113 !important; border-color:#303034 !important;
      }
      html[data-aha-appearance="dark"] .aha-v3-brand strong,
      html[data-aha-appearance="dark"] .aha-v3-card-title,
      html[data-aha-appearance="dark"] .aha-v3-section-title h2,
      html[data-aha-appearance="dark"] .aha-v3-next-inner strong,
      html[data-aha-appearance="dark"] .aha-v3-next-inner span,
      html[data-aha-appearance="dark"] .aha-v3-mini-row strong,
      html[data-aha-appearance="dark"] .aha-v3-med-row strong,
      html[data-aha-appearance="dark"] .aha-v3-med-row time {
        color:#fff !important;
      }
      html[data-aha-appearance="dark"] .aha-v3-brand small,
      html[data-aha-appearance="dark"] .aha-v3-next-inner small,
      html[data-aha-appearance="dark"] .aha-v3-mini-row time,
      html[data-aha-appearance="dark"] .aha-v3-med-row small,
      html[data-aha-appearance="dark"] .aha-v3-empty,
      html[data-aha-appearance="dark"] .aha-v3-empty-mini {
        color:#b8b8bd !important;
      }
      html[data-aha-appearance="dark"] .aha-v3-ring:after { background:#171719 !important; }
      html[data-aha-appearance="dark"] .aha-v3-ring b { color:#fff !important; }
      html[data-aha-appearance="dark"] .aha-v3-ring span { color:#b8b8bd !important; }
      html[data-aha-appearance="dark"] .aha-v3-care-card {
        background:#171719 !important; border-color:#343438 !important; color:#fff !important;
      }
      html[data-aha-appearance="dark"] .aha-v3-care-card h2 { color:#fff !important; }
      html[data-aha-appearance="dark"] .aha-v3-care-card p { color:#b8b8bd !important; }
      html[data-aha-appearance="dark"] .aha-v3-wellness {
        background:#171719 !important; border:1px solid #343438 !important; color:#fff !important;
      }
      html[data-aha-appearance="dark"] .aha-v3-wellness h2 { color:#fff !important; }
      html[data-aha-appearance="dark"] .aha-v3-wellness p { color:#b8b8bd !important; }
      html[data-aha-appearance="dark"] .aha-v3-primary-button { background:#2f6bff !important; color:#fff !important; }
      html[data-aha-appearance="dark"] .aha-v3-take-button { background:#14372f !important; border-color:#285c50 !important; color:#8de0ca !important; }
      html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] {
        background:#111113 !important; border-color:#303034 !important;
      }
      html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button {
        color:#b8b8bd !important;
      }
      html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.active {
        color:#fff !important; background:#242427 !important;
      }
      @media (max-width:760px) {
        .aha-v3-sidebar[data-aha-navigation="true"] {
          background:var(--aha-surface,#fff) !important;
          border:1px solid var(--aha-border,#e2e3e6) !important;
          box-shadow:0 8px 28px rgba(0,0,0,.12) !important;
        }
        html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] {
          background:#171719 !important; border-color:#343438 !important; box-shadow:none !important;
        }
      }

      /* ---------- THEME CONTRAST SAFETY ---------- */
      html[data-aha-appearance="dark"] .aha-page .card,
      html[data-aha-appearance="dark"] .aha-page .reminder-card,
      html[data-aha-appearance="dark"] .aha-page .notification-item,
      html[data-aha-appearance="dark"] .aha-page .timeline-item,
      html[data-aha-appearance="dark"] .aha-page .empty,
      html[data-aha-appearance="dark"] .aha-page .location-box,
      html[data-aha-appearance="dark"] .aha-page .switch-row,
      html[data-aha-appearance="dark"] .aha-page .modal-card {
        background:var(--aha-surface) !important; border-color:var(--aha-border) !important; color:var(--aha-text) !important;
      }
      html[data-aha-appearance="dark"] .aha-page .muted,
      html[data-aha-appearance="dark"] .aha-page .small { color:var(--aha-text-secondary) !important; }
      html[data-aha-appearance="dark"] .aha-page .notification-item.unread { background:#20252a !important; }
      html[data-aha-appearance="dark"] .aha-page .notification-icon,
      html[data-aha-appearance="dark"] .aha-page .pill-icon,
      html[data-aha-appearance="dark"] .aha-page .quick-icon {
        background:#252b31 !important; color:#8fcfff !important;
      }
      html[data-aha-appearance="dark"] .aha-page .tag { background:#16362d !important; color:#7ed8bd !important; }
      html[data-aha-appearance="dark"] .aha-page .btn-soft { background:#202b34 !important; color:#9bd9ff !important; border-color:#394752 !important; }
      html[data-aha-appearance="dark"] .aha-emergency-page { color:#fff !important; }
      html[data-aha-appearance="dark"] .aha-emergency-hero { background:#1b1516 !important; border-color:#63353a !important; }
      html[data-aha-appearance="dark"] .aha-emergency-hero h1 { color:#ff7b82 !important; }
      html[data-aha-appearance="dark"] .aha-emergency-hero>p { color:#d2b7b9 !important; }
      html[data-aha-appearance="dark"] .aha-emergency-call { background:#19191b !important; color:#fff !important; }
      html[data-aha-appearance="dark"] .aha-location-card { background:#171d21 !important; color:#fff !important; }
      html[data-aha-appearance="dark"] .aha-location-card>span,
      html[data-aha-appearance="dark"] .aha-emergency-call small { color:#b8b8bd !important; }

      /* Emergency is semantic red in every appearance. */
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.danger,
      html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.danger {
        color:#e5484d !important;
      }
      .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.danger.active,
      html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.danger.active {
        background:#fff0f0 !important; color:#c92731 !important;
      }
      html[data-aha-appearance="dark"] .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button.danger.active {
        background:#3a171a !important; color:#ff7078 !important;
      }

      /* Equal rhythm on Home: same spacing used by Profile. */
      .aha-v3-content { --aha-home-gap:14px; }
      .aha-v3-content > .aha-v3-hero,
      .aha-v3-content > .aha-v3-feature-row,
      .aha-v3-content > .aha-v3-metrics-row,
      .aha-v3-content > .aha-v3-today-card,
      .aha-v3-content > .aha-v3-bottom-grid { margin-top:0 !important; margin-bottom:var(--aha-home-gap) !important; }
      .aha-v3-content > .aha-v3-bottom-grid { margin-bottom:0 !important; }
      .aha-v3-feature-row,
      .aha-v3-metrics-row,
      .aha-v3-bottom-grid { gap:var(--aha-home-gap) !important; }
      .aha-v3-action-stack { gap:var(--aha-home-gap) !important; margin-top:var(--aha-home-gap) !important; }

      /* Keep the three Home action arrows comfortably inside their cards. */
      .aha-v3-action .aha-v3-arrow { flex:0 0 auto; margin-right:6px; }
      @media (max-width:760px) {
        .aha-v3-action .aha-v3-arrow { margin-right:0 !important; margin-bottom:6px !important; }
      }

      /* ---------- MOBILE ---------- */
      .aha-v3-sidebar[data-aha-navigation="true"] { visibility:visible !important; opacity:1 !important; }
      @media (max-width:760px) {
        .aha-v3-sidebar[data-aha-navigation="true"] { display:flex !important; flex-direction:column !important; visibility:visible !important; opacity:1 !important; transform:none !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links { display:grid !important; grid-template-columns:repeat(5,minmax(0,1fr)) !important; width:100% !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button { display:flex !important; width:100% !important; min-width:0 !important; padding:6px 2px !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button span { min-width:0 !important; max-width:100% !important; overflow:hidden !important; text-overflow:ellipsis !important; white-space:nowrap !important; }
        /* Reserve real scroll space above the fixed mobile navigation.
           dvh follows Android browser chrome; safe-area handles gesture/home bars. */
        .aha-v3-page,.aha-page {
          min-height:100dvh !important;
          padding-bottom:calc(118px + env(safe-area-inset-bottom, 0px)) !important;
          box-sizing:border-box !important;
        }
        .aha-page .aha-shell {
          padding-bottom:calc(104px + env(safe-area-inset-bottom, 0px)) !important;
          box-sizing:border-box !important;
        }
        .aha-page .modal-backdrop {
          min-height:100dvh !important;
          padding-bottom:calc(84px + env(safe-area-inset-bottom, 0px)) !important;
          box-sizing:border-box !important;
          overflow-y:auto !important;
          overscroll-behavior:contain !important;
        }
        .aha-page .modal-card {
          max-height:calc(100dvh - 104px - env(safe-area-inset-bottom, 0px)) !important;
          overflow-y:auto !important;
          -webkit-overflow-scrolling:touch !important;
          scroll-padding-bottom:96px !important;
        }
        .aha-v3-hero,.aha-v3-hero-card,.aha-v3-hero-banner { max-height:165px !important; min-height:125px !important; }
        .aha-v3-hero-photo img { height:100% !important; object-fit:cover !important; }
        .aha-v3-hero-copy h1 { font-size:21px !important; }
        .aha-v3-hero-copy p { font-size:11px !important; }
        .aha-v3-top-actions > button:nth-child(2) { display:grid !important; visibility:visible !important; width:40px !important; height:40px !important; }
        .aha-v3-top-actions > button:nth-child(2) .aha-v3-user-avatar { width:32px !important; height:32px !important; }
        .aha-auth-page { display:block !important; padding:12px !important; background:#fff !important; }
        .aha-auth-card { display:block !important; width:100% !important; border-radius:16px !important; box-shadow:0 8px 28px rgba(25,54,82,.09) !important; }
        .aha-auth-brand-panel { min-height:205px !important; padding:22px 21px 18px !important; border:0 !important; }
        .aha-auth-brand-panel::before { width:280px !important; height:150px !important; left:-100px !important; bottom:-90px !important; }
        .aha-auth-brand-panel::after { width:310px !important; height:190px !important; right:-205px !important; top:-120px !important; }
        .aha-auth-message { margin:28px 0 0 !important; }
        .aha-auth-message h1 { font-size:27px !important; margin:5px 0 !important; }
        .aha-auth-message p { max-width:100% !important; font-size:12px !important; line-height:1.5 !important; }
        .aha-auth-points { display:none !important; }
        .aha-auth-form-panel { padding:24px 20px 26px !important; }
        .aha-auth-heading h2 { font-size:25px !important; }
      }
      @media (max-width:390px) {
        .aha-auth-row { justify-content:flex-end !important; }
        .aha-auth-row .aha-auth-link { font-size:12px !important; }
        .aha-v3-sidebar[data-aha-navigation="true"] .aha-v3-side-links button span { font-size:10px !important; }
      }
    `}</style>
  );
}