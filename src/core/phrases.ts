/**
 * Multilingual phrase tables.
 *
 * Order matters only in that REJECT is always tested before ACCEPT: a lot of
 * reject labels embed an accept word ("continue without accepting",
 * "не принимать"), and testing reject first keeps those out of the accept
 * bucket.
 *
 * Phrases are matched after `normalize()`, so accents/punctuation/case here are
 * cosmetic — they are written naturally for readability.
 */

/** "Yes, take everything." */
export const ACCEPT_PHRASES: readonly string[] = [
  // English
  'accept all', 'accept all cookies', 'accept cookies', 'accept & close', 'accept and close',
  'accept', 'i accept', 'allow all', 'allow all cookies', 'allow cookies', 'allow',
  'agree', 'i agree', 'i understand', 'understood', 'got it', 'ok', 'okay',
  'yes i agree', 'agree and close', 'agree and continue', 'accept and continue',
  'enable all', 'enable all cookies', 'consent', 'i consent', 'that is ok', 'sounds good',
  'accept recommended settings', 'use recommended settings', 'continue with recommended',
  'accept tracking', 'yes im happy', 'im ok with that',
  // Russian / Ukrainian / Belarusian
  'принять все', 'принять все куки', 'принять всё', 'принять', 'принимаю', 'я принимаю',
  'разрешить все', 'разрешить всё', 'разрешить', 'согласен', 'я согласен', 'согласиться',
  'соглашаюсь', 'хорошо', 'понятно', 'ок', 'да', 'подтвердить',
  'прийняти все', 'прийняти всі', 'прийняти', 'погоджуюсь', 'дозволити все',
  'прыняць усе', 'прыняць',
  // German
  'alle akzeptieren', 'alle cookies akzeptieren', 'akzeptieren', 'ich akzeptiere',
  'alle zulassen', 'alle erlauben', 'zustimmen', 'allen zustimmen', 'einverstanden',
  'ich stimme zu', 'verstanden', 'annehmen', 'alles akzeptieren', 'auswahl bestatigen',
  'akzeptieren und weiter', 'alle annehmen',
  // French
  'tout accepter', 'accepter tout', 'accepter tous les cookies', 'accepter', "j'accepte",
  'je suis d accord', 'd accord', 'autoriser tout', 'tout autoriser', 'accepter et fermer',
  'ok pour moi', 'continuer et accepter',
  // Spanish / Catalan / Galician
  'aceptar todo', 'aceptar todas', 'aceptar todas las cookies', 'aceptar', 'acepto',
  'permitir todo', 'permitir todas', 'estoy de acuerdo', 'de acuerdo', 'entendido',
  'acepto todo', 'acceptar tot', 'aceptar e continuar',
  // Italian
  'accetta tutto', 'accetta tutti', 'accetta tutti i cookie', 'accetta', 'accetto',
  'consenti tutto', 'consenti tutti', 'ho capito', 'sono d accordo', 'acconsento',
  // Portuguese
  'aceitar todos', 'aceitar todas', 'aceitar tudo', 'aceitar', 'aceito', 'concordo',
  'permitir todos', 'permitir tudo', 'estou de acordo', 'aceitar cookies',
  // Dutch
  'alles accepteren', 'alle cookies accepteren', 'accepteren', 'akkoord', 'ga akkoord',
  'ik ga akkoord', 'alles toestaan', 'alle cookies toestaan', 'toestaan', 'begrepen',
  // Nordic
  'acceptera alla', 'godkann alla', 'jag godkanner', 'godkann', 'tillat alla',
  'accepter alle', 'tillad alle', 'godta alle', 'aksepter alle', 'godkjenn alle',
  'hyvaksy kaikki', 'hyvaksy', 'salli kaikki', 'samthykkja ollum',
  // Polish / Czech / Slovak / Slovene / Croatian / Serbian
  'zaakceptuj wszystkie', 'akceptuje wszystkie', 'akceptuj', 'akceptuje', 'zgadzam sie',
  'zgoda', 'wyrazam zgode', 'przejdz do serwisu', 'zezwol na wszystkie',
  'prijmout vse', 'prijmout vsechny', 'souhlasim', 'rozumim', 'povolit vse',
  'prijat vsetko', 'suhlasim', 'sprejmi vse', 'strinjam se',
  'prihvati sve', 'prihvacam', 'прихвати све',
  // Hungarian / Romanian / Bulgarian / Greek / Turkish
  'osszes elfogadasa', 'elfogadom', 'mindet elfogadom', 'rendben',
  'accepta toate', 'accept toate', 'sunt de acord', 'de acord',
  'приемам всички', 'приемам', 'съгласен съм',
  'αποδοχη ολων', 'αποδοχη', 'συμφωνω', 'ενταξει',
  'tumunu kabul et', 'hepsini kabul et', 'kabul et', 'kabul ediyorum', 'tamam',
  // Baltic
  'priimti visus', 'sutinku', 'pieklaut visiem', 'piekritu', 'noustun', 'noustu koigiga',
  // Hebrew / Arabic / Persian
  'אני מסכים', 'קבל הכל', 'אישור',
  'قبول الكل', 'قبول جميع', 'اوافق', 'موافق', 'قبول',
  'پذیرفتن همه', 'موافقم',
  // CJK
  '同意する', 'すべて同意', 'すべて許可', '同意して閉じる', '許可する', '同意',
  '接受全部', '全部接受', '接受所有', '接受所有cookie', '允许全部', '全部允许', '同意并继续', '我同意',
  '接受全部cookie', '接受', '確定', '确定',
  '모두 동의', '모두 허용', '동의합니다', '동의',
  // SE Asia / India
  'terima semua', 'setuju', 'saya setuju', 'izinkan semua',
  'chap nhan tat ca', 'dong y', 'ยอมรับทั้งหมด', 'ยอมรับ',
  'सभी स्वीकार करें', 'स्वीकार करें', 'सहमत',
];

/** "No, only what you strictly need." */
export const REJECT_PHRASES: readonly string[] = [
  // English
  'reject all', 'reject all cookies', 'reject cookies', 'reject non essential', 'reject',
  'decline all', 'decline all cookies', 'decline optional', 'decline', 'deny all', 'deny',
  'refuse all', 'refuse', 'disagree', 'i do not agree', 'do not accept', 'do not consent',
  'no thanks', 'no thank you', 'not now', 'only necessary', 'necessary only',
  'necessary cookies only', 'only necessary cookies', 'use necessary cookies only',
  'only essential', 'essential only', 'essential cookies only', 'only essential cookies',
  'only required cookies', 'required only', 'strictly necessary only',
  'continue without accepting', 'continue without agreeing', 'continue without consent',
  'reject optional cookies', 'opt out', 'opt out of all', 'do not sell my personal information',
  'do not sell or share my personal information', 'save without accepting', 'disable all',
  'allow essential only', 'allow necessary only', 'accept only necessary',
  'accept only essential', 'accept necessary only', 'accept essential cookies only',
  // Russian / Ukrainian
  'отклонить все', 'отклонить всё', 'отклонить', 'отказаться от всех', 'отказаться',
  'отказ', 'не принимать', 'не согласен', 'нет спасибо', 'запретить все', 'запретить',
  'только необходимые', 'только необходимые куки', 'только обязательные',
  'только технические', 'использовать только необходимые', 'продолжить без согласия',
  'відхилити все', 'відхилити', 'відмовитись', 'лише необхідні', 'тільки необхідні',
  // German
  'alle ablehnen', 'alles ablehnen', 'ablehnen', 'ich lehne ab', 'alle cookies ablehnen',
  'nur notwendige', 'nur notwendige cookies', 'nur essenzielle', 'nur essenzielle cookies',
  'nur erforderliche', 'nur erforderliche cookies', 'nur technisch notwendige',
  'nicht einverstanden', 'weiter ohne einwilligung', 'ohne einwilligung fortfahren',
  'nicht zustimmen', 'auswahl ablehnen', 'notwendige cookies',
  // French
  'tout refuser', 'refuser tout', 'refuser tous les cookies', 'refuser', 'je refuse',
  'continuer sans accepter', 'poursuivre sans accepter', 'continuer sans consentement',
  'uniquement les cookies necessaires', 'cookies necessaires uniquement',
  'seulement les necessaires', 'non merci', 'je ne suis pas d accord', 'tout desactiver',
  // Spanish / Catalan
  'rechazar todo', 'rechazar todas', 'rechazar todas las cookies', 'rechazar',
  'no acepto', 'solo las necesarias', 'solo cookies necesarias', 'solo necesarias',
  'solo esenciales', 'continuar sin aceptar', 'no estoy de acuerdo', 'denegar todo',
  'rebutjar tot', 'nomes les necessaries',
  // Italian
  'rifiuta tutto', 'rifiuta tutti', 'rifiuta', 'non accetto', 'continua senza accettare',
  'solo necessari', 'solo i necessari', 'solo cookie necessari', 'solo essenziali',
  'nega tutto', 'non sono d accordo',
  // Portuguese
  'rejeitar todos', 'rejeitar tudo', 'rejeitar', 'recusar todos', 'recusar', 'nao aceito',
  'apenas os necessarios', 'apenas necessarios', 'somente necessarios', 'apenas essenciais',
  'continuar sem aceitar', 'nao concordo',
  // Dutch
  'alles weigeren', 'alle cookies weigeren', 'weigeren', 'afwijzen', 'alles afwijzen',
  'alleen noodzakelijke', 'alleen noodzakelijke cookies', 'alleen essentiele',
  'niet akkoord', 'doorgaan zonder accepteren', 'nee bedankt',
  // Nordic
  'avvisa alla', 'neka alla', 'endast nodvandiga', 'bara nodvandiga', 'nej tack',
  'afvis alle', 'kun nodvendige', 'avvis alle', 'bare nodvendige', 'kun naodvendige',
  'hylkaa kaikki', 'vain valttamattomat', 'hylkaa',
  // Polish / Czech / Slovak / Slovene / Croatian
  'odrzuc wszystkie', 'odrzucam', 'odrzuc', 'nie zgadzam sie', 'tylko niezbedne',
  'tylko konieczne', 'tylko wymagane', 'kontynuuj bez zgody',
  'odmitnout vse', 'odmitnout', 'nesouhlasim', 'jen nezbytne', 'pouze nezbytne',
  'odmietnut vsetko', 'iba nevyhnutne', 'zavrni vse', 'samo nujno potrebne',
  'odbij sve', 'samo nuzni', 'odbaci sve',
  // Hungarian / Romanian / Bulgarian / Greek / Turkish
  'osszes elutasitasa', 'elutasitom', 'csak a szukseges', 'csak szukseges',
  'respinge toate', 'refuz', 'doar cele necesare', 'doar necesare', 'nu sunt de acord',
  'отхвърляне на всички', 'отхвърли всички', 'само необходимите', 'не приемам',
  'απορριψη ολων', 'απορριψη', 'μονο απαραιτητα', 'δεν συμφωνω',
  'tumunu reddet', 'hepsini reddet', 'reddet', 'sadece gerekli', 'kabul etmiyorum',
  // Baltic
  'atmesti visus', 'tik butinieji', 'nesutinku', 'noraidit visus', 'tikai nepieciesamas',
  'keeldu koigist', 'ainult vajalikud',
  // Hebrew / Arabic
  'דחה הכל', 'אני לא מסכים', 'רק הכרחיים',
  'رفض الكل', 'رفض جميع', 'الضرورية فقط', 'لا اوافق', 'رفض',
  // CJK
  'すべて拒否', '拒否する', '同意しない', '必要なもののみ', '必須のみ', '拒否',
  '全部拒绝', '拒绝全部', '拒绝所有', '拒绝', '仅必要', '仅必需cookie', '不同意',
  '全部拒絕', '拒絕', '僅必要', '不同意',
  '모두 거부', '거부', '필수만 허용', '동의하지 않음',
  // SE Asia / India
  'tolak semua', 'tolak', 'hanya yang diperlukan', 'tidak setuju',
  'tu choi tat ca', 'tu choi', 'khong dong y',
  'ปฏิเสธทั้งหมด', 'ปฏิเสธ', 'เฉพาะที่จำเป็น',
  'सभी अस्वीकार करें', 'अस्वीकार करें',
];

/** "Show me the toggles" — used to reach a reject button one level deeper. */
export const SETTINGS_PHRASES: readonly string[] = [
  'cookie settings', 'cookie preferences', 'manage cookies', 'manage settings',
  'manage preferences', 'manage options', 'manage choices', 'more options', 'options',
  'customize', 'customise', 'customize settings', 'customise settings', 'preferences',
  'settings', 'configure', 'let me choose', 'more information', 'purposes',
  'настройки', 'настроить', 'настройки cookie', 'управление файлами cookie', 'подробнее',
  'einstellungen', 'cookie einstellungen', 'einstellungen verwalten', 'anpassen', 'mehr optionen',
  'parametrer', 'personnaliser', 'gerer les cookies', 'plus d options', 'parametres',
  'configuracion', 'personalizar', 'gestionar cookies', 'mas opciones', 'ajustes',
  'impostazioni', 'personalizza', 'gestisci cookie', 'altre opzioni',
  'definicoes', 'personalizar cookies', 'gerir cookies',
  'instellingen', 'voorkeuren', 'beheer cookies', 'aanpassen',
  'ustawienia', 'dostosuj', 'zarzadzaj', 'nastaveni', 'prizpusobit', 'spravovat',
  'ayarlar', 'ozellestir', 'yonet', 'ρυθμισεις', 'настройки на бисквитките',
  '設定', 'クッキー設定', '詳細設定', '设置', 'cookie设置', '管理', '설정', '쿠키 설정',
];

/** "Persist my (now unchecked) choices." */
export const SAVE_PHRASES: readonly string[] = [
  'save', 'save settings', 'save preferences', 'save and close', 'save choices',
  'save my choices', 'confirm choices', 'confirm my choices', 'confirm', 'confirm selection',
  'apply', 'apply settings', 'submit preferences', 'done',
  'сохранить', 'сохранить настройки', 'подтвердить выбор', 'применить',
  'speichern', 'auswahl speichern', 'einstellungen speichern', 'bestatigen', 'ubernehmen',
  'enregistrer', 'enregistrer mes choix', 'valider', 'confirmer', 'sauvegarder',
  'guardar', 'guardar preferencias', 'confirmar seleccion', 'confirmar',
  'salva', 'salva preferenze', 'conferma', 'guardar e sair',
  'opslaan', 'voorkeuren opslaan', 'bevestigen',
  'zapisz', 'zapisz ustawienia', 'potwierdz', 'ulozit', 'potvrdit',
  'kaydet', 'onayla', 'αποθηκευση', 'запази',
  '保存', '設定を保存', '保存设置', '确认', '저장', '확인',
];

/**
 * Vocabulary that is specific to *cookie consent* and essentially never turns
 * up in ordinary application chrome. One of these is enough to trust a block.
 */
export const STRONG_CONSENT_CONTEXT: readonly string[] = [
  'cookie', 'cookies', 'consent', 'gdpr', 'ccpa', 'iab', 'tcf', 'legitimate interest',
  'cookie policy', 'cookie notice', 'cookie settings', 'cookie preferences',
  'куки', 'кукис', 'файлы cookie', 'согласие', 'согласия', 'файли cookie', 'згоду',
  'einwilligung', 'cookie richtlinie', 'zustimmung',
  'consentement', 'temoins de connexion',
  'consentimiento', 'galletas',
  'consenso',
  'consentimento',
  'toestemming',
  'zgode', 'souhlas', 'suhlas',
  'samtycke', 'samtykke', 'suostumus', 'evasteet', 'evastekaytanto',
  'cerez', 'cerezler', 'συγκαταθεση', 'бисквитки', 'фișiere cookie',
  'クッキー', '隐私政策', 'cookie 政策', '쿠키',
  'ملفات تعريف الارتباط', 'עוגיות',
];

/**
 * Privacy-adjacent vocabulary. Real banners use it, but so does the footer of
 * any account-settings modal, so on its own it is not enough to act on — it
 * only contributes to the confidence score.
 */
export const WEAK_CONSENT_CONTEXT: readonly string[] = [
  'privacy', 'privacy policy', 'tracking', 'trackers', 'personal data',
  'data protection', 'personalised ads', 'personalized ads', 'third party',
  'third parties', 'vendors', 'partners',
  'конфиденциальность', 'персональных данных', 'персональные данные',
  'обработку данных', 'отслеживани',
  'datenschutz', 'personenbezogene daten',
  'confidentialite', 'donnees personnelles',
  'privacidad', 'datos personales',
  'informativa', 'dati personali',
  'privacidade', 'dados pessoais',
  'privacybeleid', 'persoonsgegevens',
  'prywatnosc', 'dane osobowe', 'soukromi', 'osobni udaje',
  'integritet', 'personuppgifter', 'persondata', 'yksityisyys',
  'gizlilik', 'απορρητο', 'поверителност', 'confidentialitate',
  'プライバシー', '個人情報', '隐私', '个人信息', '개인정보',
  'kebijakan privasi', 'quyen rieng tu', 'ความเป็นส่วนตัว', 'गोपनीयता',
  'خصوصية', 'פרטיות',
];

/** Everything that marks a block as consent-related, at either strength. */
export const CONSENT_CONTEXT: readonly string[] = [
  ...STRONG_CONSENT_CONTEXT,
  ...WEAK_CONSENT_CONTEXT,
];

/**
 * Accept-shaped labels that are equally at home on a "Welcome to the new
 * dashboard" dialog. They are only treated as consent buttons inside a block
 * with STRONG context — this is what stops the extension from dismissing an
 * ordinary application modal that happens to link to a privacy policy.
 */
export const GENERIC_ACCEPT_PHRASES: readonly string[] = [
  'ok', 'okay', 'got it', 'understood', 'i understand', 'continue', 'done', 'close',
  'confirm', 'agree', 'i agree', 'yes', 'sounds good', 'that is ok', 'dismiss',
  'ок', 'хорошо', 'понятно', 'да', 'подтвердить', 'продолжить', 'согласен',
  'verstanden', 'einverstanden', 'weiter', 'zustimmen',
  'd accord', 'compris', 'continuer',
  'entendido', 'de acuerdo', 'aceptar', 'continuar',
  'ho capito', 'continua',
  'begrepen', 'akkoord', 'doorgaan',
  'rozumim', 'rozumiem', 'kontynuuj',
  'tamam', 'anladim', 'ενταξει',
  'rendben', 'am inteles',
  '確定', '确定', '同意', '了解', '확인', '동의', '알겠습니다',
];

export const CONSENT_ID_HINTS: readonly string[] = [
  'cookie', 'consent', 'gdpr', 'ccpa', 'cmp', 'privacy', 'onetrust', 'didomi',
  'usercentrics', 'cookiebot', 'trustarc', 'osano', 'termly', 'iubenda', 'quantcast',
  'sourcepoint', 'klaro', 'cookieyes', 'complianz', 'borlabs', 'axeptio', 'tarteaucitron',
  'cmplz', 'cky-', 'sp_message', 'truste', 'evidon', 'securiti',
];

/**
 * Labels of the one toggle that must stay on. Used when a "reject all" button
 * is missing and the engine has to switch every optional category off by hand.
 */
export const NECESSARY_PHRASES: readonly string[] = [
  'necessary', 'strictly necessary', 'essential', 'required', 'mandatory', 'functional',
  'technical', 'always active', 'always on', 'cannot be disabled',
  'необходимые', 'обязательные', 'технические', 'всегда активны',
  'notwendig', 'erforderlich', 'essenziell', 'technisch notwendig', 'immer aktiv',
  'necessaires', 'essentiels', 'obligatoires', 'toujours actif',
  'necesarias', 'esenciales', 'obligatorias', 'siempre activas',
  'necessari', 'essenziali', 'obbligatori', 'sempre attivi',
  'necessarios', 'essenciais', 'obrigatorios',
  'noodzakelijk', 'essentieel', 'verplicht',
  'niezbedne', 'wymagane', 'konieczne', 'nezbytne', 'povinne',
  'nodvandiga', 'nodvendige', 'valttamattomat',
  'gerekli', 'zorunlu', 'απαραιτητα', 'необходими',
  '必要', '必須', '必需', '필수',
];
