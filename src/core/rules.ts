/**
 * Selector rules for widely deployed consent platforms.
 *
 * A rule wins over the generic heuristic because it knows exactly which button
 * means "reject everything" — something text matching cannot always tell (many
 * CMPs label the reject path "Manage options").
 */

export interface CmpRule {
  /** Stable identifier, reported in the popup and in stats. */
  id: string;
  /** Human-readable vendor name. */
  name: string;
  /** The rule applies only when one of these exists and is visible. */
  detect: readonly string[];
  /** Buttons that accept everything, best first. */
  accept: readonly string[];
  /** Buttons that reject everything (or keep only strictly necessary), best first. */
  reject: readonly string[];
  /**
   * Opens the preferences pane. Used only when `reject` is empty on the first
   * pass; the engine clicks it and re-runs so the deeper reject button becomes
   * reachable.
   */
  settings?: readonly string[];
  /** Leftover overlays to hide after acting. */
  cleanup?: readonly string[];
}

export const RULES: readonly CmpRule[] = [
  {
    id: 'onetrust',
    name: 'OneTrust',
    detect: ['#onetrust-banner-sdk', '#onetrust-consent-sdk', '.ot-sdk-container', '#ot-sdk-btn-floating'],
    accept: ['#onetrust-accept-btn-handler', '#accept-recommended-btn-handler', '.ot-pc-refuse-all-handler ~ .save-preference-btn-handler'],
    reject: ['#onetrust-reject-all-handler', '.ot-pc-refuse-all-handler', '#onetrust-pc-btn-handler + button.ot-pc-refuse-all-handler'],
    settings: ['#onetrust-pc-btn-handler'],
    cleanup: ['.onetrust-pc-dark-filter', '#onetrust-consent-sdk'],
  },
  {
    id: 'cookiebot',
    name: 'Cookiebot',
    detect: ['#CybotCookiebotDialog', '#CybotCookiebotDialogBodyUnderlay'],
    accept: [
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
      '#CybotCookiebotDialogBodyButtonAccept',
      '#CybotCookiebotDialogBodyLevelButtonAccept',
    ],
    reject: [
      '#CybotCookiebotDialogBodyButtonDecline',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
      '#CybotCookiebotDialogBodybuttonDecline',
    ],
    cleanup: ['#CybotCookiebotDialogBodyUnderlay', '#CybotCookiebotDialog'],
  },
  {
    id: 'didomi',
    name: 'Didomi',
    detect: ['#didomi-host', '#didomi-notice', '.didomi-popup-container'],
    accept: ['#didomi-notice-agree-button', '.didomi-continue-without-agreeing ~ #didomi-notice-agree-button'],
    reject: ['#didomi-notice-disagree-button', '.didomi-continue-without-agreeing', '.didomi-components-button--secondary'],
    settings: ['#didomi-notice-learn-more-button'],
    cleanup: ['#didomi-host'],
  },
  {
    id: 'usercentrics',
    name: 'Usercentrics',
    detect: ['#usercentrics-root', '#uc-center-container', '[data-testid="uc-container"]'],
    accept: ['[data-testid="uc-accept-all-button"]', '#uc-btn-accept-banner', '[data-action-type="accept"]'],
    reject: ['[data-testid="uc-deny-all-button"]', '#uc-btn-deny-banner', '[data-action-type="deny"]'],
    settings: ['[data-testid="uc-customize-button"]', '#uc-btn-more-information-banner'],
    cleanup: ['#usercentrics-root'],
  },
  {
    id: 'quantcast',
    name: 'Quantcast Choice',
    detect: ['.qc-cmp2-container', '.qc-cmp-ui-container', '#qc-cmp2-ui'],
    accept: ['.qc-cmp2-summary-buttons button[mode="primary"]', '.qc-cmp-button.qc-cmp-save-and-exit'],
    reject: ['.qc-cmp2-summary-buttons button[mode="secondary"]', '.qc-cmp2-summary-buttons button[mode="link"]'],
    cleanup: ['.qc-cmp2-container', '.qc-cmp-cleanslate'],
  },
  {
    id: 'sourcepoint',
    name: 'Sourcepoint',
    detect: ['.sp_message_container', '.sp-message-open', '.message-container [class*="sp_choice"]'],
    accept: ['.sp_choice_type_11', 'button[title="Accept"]', 'button[title="Accept all"]'],
    reject: ['.sp_choice_type_REJECT_ALL', 'button[title="Reject all"]', 'button[title="Reject"]'],
    settings: ['.sp_choice_type_12', 'button[title="Options"]'],
    cleanup: ['.sp_veil', '.sp_message_container'],
  },
  {
    id: 'trustarc',
    name: 'TrustArc',
    detect: ['#truste-consent-track', '.truste_box_overlay', '#truste-consent-content'],
    accept: ['#truste-consent-button', '.call'],
    reject: ['#truste-consent-required', '.rejectAll'],
    cleanup: ['#truste-consent-track', '.truste_overlay'],
  },
  {
    id: 'osano',
    name: 'Osano',
    detect: ['.osano-cm-window', '.osano-cm-dialog'],
    accept: ['.osano-cm-accept-all', '.osano-cm-accept'],
    reject: ['.osano-cm-denyAll', '.osano-cm-deny-all', '.osano-cm-deny'],
    cleanup: ['.osano-cm-window'],
  },
  {
    id: 'termly',
    name: 'Termly',
    detect: ['#termly-code-snippet-support', '.t-consentPrompt'],
    accept: ['.t-acceptAllButton', '#acceptAllButton'],
    reject: ['.t-declineAllButton', '#declineAllButton'],
    cleanup: ['#termly-code-snippet-support'],
  },
  {
    id: 'cookieyes',
    name: 'CookieYes',
    detect: ['.cky-consent-container', '#cookieyes'],
    accept: ['.cky-btn-accept'],
    reject: ['.cky-btn-reject'],
    cleanup: ['.cky-overlay', '.cky-consent-container'],
  },
  {
    id: 'complianz',
    name: 'Complianz',
    detect: ['#cmplz-cookiebanner-container', '.cmplz-cookiebanner'],
    accept: ['.cmplz-accept'],
    reject: ['.cmplz-deny'],
    cleanup: ['#cmplz-cookiebanner-container'],
  },
  {
    id: 'borlabs',
    name: 'Borlabs Cookie',
    detect: ['#BorlabsCookieBox', '#BorlabsCookieBoxWrap'],
    accept: ['a[data-cookie-accept-all]', '#CookieBoxSaveButton', '._brlbs-btn-accept-all'],
    reject: ['a[data-cookie-refuse]', '._brlbs-btn-accept-only-essential'],
    cleanup: ['#BorlabsCookieBoxWrap'],
  },
  {
    id: 'klaro',
    name: 'Klaro',
    detect: ['.klaro .cookie-notice', '#klaro'],
    accept: ['.cm-btn-accept-all', '.cn-buttons .cm-btn-success'],
    reject: ['.cm-btn-decline', '.cn-decline'],
    cleanup: ['#klaro'],
  },
  {
    id: 'cookieconsent',
    name: 'Insites/Osano CookieConsent',
    detect: ['.cc-window', '.cc-banner'],
    accept: ['.cc-allow', '.cc-allow-all', '.cc-btn.cc-dismiss'],
    reject: ['.cc-deny', '.cc-decline'],
    cleanup: ['.cc-window'],
  },
  {
    id: 'cookiescript',
    name: 'CookieScript',
    detect: ['#cookiescript_injected', '#cookiescript_wrapper'],
    accept: ['#cookiescript_accept'],
    reject: ['#cookiescript_reject'],
    cleanup: ['#cookiescript_injected'],
  },
  {
    id: 'iubenda',
    name: 'Iubenda',
    detect: ['#iubenda-cs-banner', '.iubenda-cs-container'],
    accept: ['.iubenda-cs-accept-btn'],
    reject: ['.iubenda-cs-reject-btn', '.iubenda-cs-close-btn'],
    cleanup: ['#iubenda-cs-banner'],
  },
  {
    id: 'axeptio',
    name: 'Axeptio',
    detect: ['#axeptio_overlay', '.axeptio_widget'],
    accept: ['#axeptio_btn_acceptAll', 'button[aria-label="Accepter"]'],
    reject: ['#axeptio_btn_dismiss', 'button[aria-label="Refuser"]'],
    cleanup: ['#axeptio_overlay'],
  },
  {
    id: 'tarteaucitron',
    name: 'tarteaucitron.js',
    detect: ['#tarteaucitronAlertBig', '#tarteaucitronRoot'],
    accept: ['#tarteaucitronPersonalize2', '#tarteaucitronPersonalize'],
    reject: ['#tarteaucitronAllDenied2', '#tarteaucitronAllDenied'],
    cleanup: ['#tarteaucitronAlertBig'],
  },
  {
    id: 'cookiefirst',
    name: 'CookieFirst',
    detect: ['[data-cookiefirst-widget]', '#cookiefirst-root'],
    accept: ['[data-cookiefirst-action="accept"]'],
    reject: ['[data-cookiefirst-action="reject"]'],
    cleanup: ['#cookiefirst-root'],
  },
  {
    id: 'cookiehub',
    name: 'CookieHub',
    detect: ['#ch2-dialog', '.ch2-dialog'],
    accept: ['#ch2-allow-all-btn', '.ch2-allow-all-btn'],
    reject: ['#ch2-deny-all-btn', '.ch2-deny-all-btn'],
    cleanup: ['#ch2-dialog'],
  },
  {
    id: 'fundingchoices',
    name: 'Google Funding Choices',
    detect: ['.fc-consent-root', '.fc-dialog-container'],
    accept: ['.fc-cta-consent', '.fc-primary-button'],
    reject: ['.fc-cta-do-not-consent', '.fc-secondary-button'],
    cleanup: ['.fc-consent-root'],
  },
  {
    id: 'consentmanager',
    name: 'consentmanager.net',
    detect: ['#cmpbox', '#cmpwrapper'],
    accept: ['#cmpwelcomebtnyes', '.cmpboxbtnyes'],
    reject: ['#cmpwelcomebtnno', '.cmpboxbtnno'],
    cleanup: ['#cmpbox', '#cmpwrapper'],
  },
  {
    id: 'cookieinformation',
    name: 'Cookie Information',
    detect: ['#coi-banner-wrapper', '#coiOverlay'],
    accept: ['#declineButton ~ #onetrust-accept-btn-handler', '#coiPage-1 .coi-banner__accept', '#updateButton'],
    reject: ['#declineButton', '.coi-banner__decline'],
    cleanup: ['#coi-banner-wrapper', '#coiOverlay'],
  },
  {
    id: 'securiti',
    name: 'Securiti.ai',
    detect: ['#securiti-cookie-consent-banner', '.securiti-cookie-consent'],
    accept: ['#securiti-accept-all', '.securiti-btn-accept-all'],
    reject: ['#securiti-reject-all', '.securiti-btn-reject-all'],
    cleanup: ['#securiti-cookie-consent-banner'],
  },
  {
    id: 'hs-banner',
    name: 'HubSpot',
    detect: ['#hs-eu-cookie-confirmation'],
    accept: ['#hs-eu-confirmation-button'],
    reject: ['#hs-eu-decline-button'],
    cleanup: ['#hs-eu-cookie-confirmation'],
  },
  {
    id: 'wp-moove',
    name: 'GDPR Cookie Compliance (Moove)',
    detect: ['#moove_gdpr_cookie_info_bar'],
    accept: ['.moove-gdpr-infobar-allow-all', '#moove_gdpr_save_popup_settings_button'],
    reject: ['.moove-gdpr-infobar-reject-btn', '.moove-gdpr-infobar-close'],
    cleanup: ['#moove_gdpr_cookie_info_bar'],
  },
];

/** Looks a rule up by id. */
export function ruleById(id: string): CmpRule | undefined {
  return RULES.find((r) => r.id === id);
}
