/**
 * Multilingual phrase tables for cookie-consent banner detection.
 *
 * Covers 30 languages: English, Russian, Ukrainian, Belarusian, German,
 * French, Spanish, Catalan, Galician, Italian, Portuguese, Dutch, Swedish,
 * Norwegian, Danish, Finnish, Polish, Czech, Slovak, Slovene, Croatian,
 * Serbian, Hungarian, Romanian, Bulgarian, Greek, Turkish, Lithuanian,
 * Latvian, Estonian, Hebrew, Arabic, Persian, Japanese, Chinese (Simplified
 * and Traditional), Korean, Indonesian, Vietnamese, Thai, and Hindi.
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
  'accept tracking', 'yes im happy', 'im ok with that', 'allow all cookies',
  "i'm okay with cookies", 'continue', 'confirm my choices', 'i am okay with this',
  // Russian
  'принять все', 'принять все куки', 'принять всё', 'принять', 'принимаю', 'я принимаю',
  'разрешить все', 'разрешить всё', 'разрешить', 'согласен', 'я согласен', 'согласиться',
  'соглашаюсь', 'хорошо', 'понятно', 'ок', 'да', 'подтвердить', 'подтвердить все',
  'принять cookies', 'разрешить cookies', 'согласие', 'я даю согласие', 'продолжить',
  'продолжить с принятием', 'все разрешить', 'все принять',
  // Ukrainian
  'прийняти все', 'прийняти всі', 'прийняти', 'погоджуюсь', 'дозволити все',
  'прийняти кукі', 'я погоджуюсь', 'прийняти cookies', 'погодитися', 'так', 'добре',
  'згоден', 'прийняти всі файли cookie', 'дозволити всі',
  // Belarusian
  'прыняць усе', 'прыняць', 'прыняць усе кікі', 'згаджаюся', 'дазволіць усё', 'так', 'добра',
  // German
  'alle akzeptieren', 'alle cookies akzeptieren', 'akzeptieren', 'ich akzeptiere',
  'alle zulassen', 'alle erlauben', 'zustimmen', 'allen zustimmen', 'einverstanden',
  'ich stimme zu', 'verstanden', 'annehmen', 'alles akzeptieren', 'auswahl bestatigen',
  'akzeptieren und weiter', 'alle annehmen', 'alle cookies zulassen', 'ich bin einverstanden',
  'ja', 'weiter', 'alle erlauben', 'cookies akzeptieren', 'datenschutz akzeptieren',
  // French
  'tout accepter', 'accepter tout', 'accepter tous les cookies', 'accepter', "j'accepte",
  'je suis d accord', 'd accord', 'autoriser tout', 'tout autoriser', 'accepter et fermer',
  'ok pour moi', 'continuer et accepter', "j'accepte tout", 'accepter les cookies',
  'donner mon accord', 'oui', 'continuer', 'tout autoriser', 'accepter la politique',
  'je consens',
  // Spanish
  'aceptar todo', 'aceptar todas', 'aceptar todas las cookies', 'aceptar', 'acepto',
  'permitir todo', 'permitir todas', 'estoy de acuerdo', 'de acuerdo', 'entendido',
  'acepto todo', 'aceptar e continuar', 'aceptar cookies', 'si', 'continuar',
  'permitir cookies', 'dar mi consentimiento', 'aceptar la politica',
  'estoy de acuerdo con las cookies',
  // Catalan
  'acceptar tot', 'acceptar', "estic d'acord", 'permetre tot', 'si', 'entès', 'acceptar galetes',
  // Galician
  'aceptar todo', 'aceptar', 'estou de acordo', 'permitir todo', 'si',
  // Italian
  'accetta tutto', 'accetta tutti', 'accetta tutti i cookie', 'accetta', 'accetto',
  'consenti tutto', 'consenti tutti', 'ho capito', 'sono d accordo', 'acconsento',
  'accetta i cookie', 'accetta cookies', 'si', 'continua', 'permetti tutto',
  'acconsento a tutto', 'accetta le preferenze',
  // Portuguese
  'aceitar todos', 'aceitar todas', 'aceitar tudo', 'aceitar', 'aceito', 'concordo',
  'permitir todos', 'permitir tudo', 'estou de acordo', 'aceitar cookies', 'sim', 'continuar',
  'autorizar tudo', 'aceito todos os cookies', 'dar consentimento', 'aceitar a politica',
  // Dutch
  'alles accepteren', 'alle cookies accepteren', 'accepteren', 'akkoord', 'ga akkoord',
  'ik ga akkoord', 'alles toestaan', 'alle cookies toestaan', 'toestaan', 'begrepen',
  'ja', 'accepteren alle', 'ik accepteer', 'alle cookies toestaan', 'doorgaan',
  'alles toestaan', 'instemmen',
  // Swedish
  'acceptera alla', 'godkann alla', 'jag godkanner', 'godkann', 'tillat alla', 'ja',
  'forstod', 'acceptera cookies', 'acceptera alla cookies', 'tillat alla cookies',
  'godkanna', 'acceptera', 'fortsatt',
  // Norwegian
  'accepter alle', 'godkjenn alle', 'jeg godkjenner', 'godkjenn', 'tillat alle', 'ja',
  'forstod', 'accepter cookies', 'godkjenn cookies', 'tillat cookies', 'godkjenne', 'akseptere',
  // Danish
  'accepter alle', 'godkend alle', 'jeg godkender', 'godkend', 'tillad alle', 'ja',
  'forstod', 'accepter cookies', 'godkend cookies', 'tillad cookies', 'acceptere',
  // Finnish
  'hyvaksy kaikki', 'hyvaksy', 'salli kaikki', 'kylla', 'ymmarrettu', 'hyvaksy evasteet',
  'salli evasteet', 'hyvaksy kaikki evasteet', 'salli', 'jatka',
  // Polish
  'zaakceptuj wszystkie', 'akceptuje wszystkie', 'akceptuj', 'akceptuje', 'zgadzam sie',
  'zgoda', 'wyrazam zgode', 'przejdz do serwisu', 'zezwol na wszystkie', 'tak', 'rozumiem',
  'akceptuj cookies', 'zaakceptuj', 'akceptuje wszystkie cookies', 'pozwol wszystkie',
  'przejdz dalej', 'zgadzam sie na wszystko', 'akceptuje',
  // Czech
  'prijmout vse', 'prijmout vsechny', 'souhlasim', 'rozumim', 'povolit vse', 'ano',
  'prijmout cookies', 'prijmout', 'povolit vsechny', 'souhlasim se vsim', 'prijmi',
  'povolit', 'jit dal', 'potvrdit',
  // Slovak
  'prijat vsetko', 'suhlasim', 'povolit vsetko', 'ano', 'rozumiem', 'prijat cookies',
  'prijmi', 'povolit', 'suhlasim so vsim', 'ist dalej',
  // Slovene
  'sprejmi vse', 'strinjam se', 'dovoli vse', 'da', 'razumem', 'sprejmi cookies',
  'sprejmi', 'dovoli', 'strinjam se z vsem', 'nadaljuj',
  // Croatian
  'prihvati sve', 'prihvacam', 'prihvati', 'slažem se', 'pristajem na sve', 'dozvoli sve',
  'da', 'razumijem', 'prihvati cookies', 'dozvoli', 'pristajem', 'nastavi',
  // Serbian
  'прихвати све', 'прихватам', 'прихвати', 'слажем се', 'пристајем на све', 'дозволи све',
  'да', 'прихвати колачиће', 'дозволи', 'пристајем',
  // Hungarian
  'osszes elfogadasa', 'elfogadom', 'mindet elfogadom', 'rendben', 'elfogadom az osszeset',
  'igen', 'ertem', 'elfogadom a cookiekat', 'engedelyez mindent', 'elfogad', 'elfogadas',
  // Romanian
  'accepta toate', 'accept toate', 'sunt de acord', 'de acord', 'accept',
  'accepta toate cookie-urile', 'da', 'inteleg', 'accepta cookie-urile', 'autorizeaza tot',
  'accepta setarile', 'continua',
  // Bulgarian
  'приемам всички', 'приемам', 'съгласен съм', 'приеми всички', 'да', 'разбирам',
  'приеми cookies', 'разреши всички', 'приеми', 'съгласен', 'продължи',
  // Greek
  'αποδοχη ολων', 'αποδοχη', 'συμφωνω', 'ενταξει', 'αποδεχομαι ολα', 'ναι',
  'καταλαβαινω', 'αποδεχομαι τα cookies', 'επιτρεπω ολα', 'αποδεχομαι', 'συνεχιστε',
  // Turkish
  'tumunu kabul et', 'hepsini kabul et', 'kabul et', 'kabul ediyorum', 'tamam', 'kabul',
  'evet', 'anladim', 'tumunu onayla', 'hepsini onayla', 'kabul et ve devam et',
  'izin ver tumunu', 'onayla',
  // Lithuanian
  'priimti visus', 'sutinku', 'pieklaut visiem', 'piekritu', 'noustun', 'noustu koigiga',
  'taip', 'suprantu', 'priimti cookies', 'leisti visus', 'sutinku su viskuo', 'teskti',
  // Latvian
  'pieklaut visiem', 'piekritu', 'noustun', 'noustu koigiga', 'ja', 'saprotu',
  'piekrist visiem', 'atļaut visus', 'piekrītu', 'turpināt',
  // Estonian
  'noustun', 'noustu koigiga', 'ja', 'moistan', 'noustu koikiga', 'lubada koik',
  'noustun koikiga', 'olen nous', 'jatka',
  // Hebrew
  'אני מסכים', 'קבל הכל', 'אישור', 'לקבל הכל', 'מאשר', 'מסכים', 'אוקיי', 'לאשר',
  'קבל את כל העוגיות', 'אני מאשר', 'להסכים',
  // Arabic
  'قبول الكل', 'قبول جميع', 'اوافق', 'موافق', 'قبول', 'اقبل الكل', 'اقبل', 'نعم',
  'موافق على الكل', 'اقبل جميع', 'الموافقة', 'موافق على جميع ملفات تعريف الارتباط',
  // Persian (Farsi)
  'پذیرفتن همه', 'موافقم', 'پذیرفتن', 'قبول همه', 'قبول', 'بله', 'موافق', 'تایید',
  'پذیرش تمام کوکی‌ها', 'قبول کردن',
  // Japanese
  '同意する', 'すべて同意', 'すべて許可', '同意して閉じる', '許可する', '同意',
  'すべてを受け入れる', '承認する', 'オーケー', '承知しました', '同意します', '全て同意する', '許可',
  // Chinese (Simplified)
  '接受全部', '全部接受', '接受所有', '接受所有cookie', '允许全部', '全部允许', '同意并继续',
  '我同意', '接受全部cookie', '接受', '確定', '确定', '同意', '好的', '接受所有cookie',
  '允许所有', '我同意所有', '确认',
  // Chinese (Traditional)
  '全部接受', '接受所有', '允許全部', '全部允許', '同意並繼續', '我同意', '接受', '確定', '同意', '接受全部',
  // Korean
  '모두 동의', '모두 허용', '동의합니다', '동의', '모두 동의합니다', '허용', '네',
  '모두 허용합니다', '동의해요', '확인', '모두 수락',
  // Indonesian
  'terima semua', 'setuju', 'saya setuju', 'izinkan semua', 'terima', 'ya', 'saya terima',
  'setuju semua', 'terima semua cookie', 'izinkan', 'mengizinkan', 'setuju untuk semua',
  // Vietnamese
  'chap nhan tat ca', 'dong y', 'chap nhan', 'dong y voi tat ca', 'dong y',
  'toi dong y', 'cho phep tat ca', 'dong y', 'vang', 'chap nhan tat ca cookie', 'cho phep',
  // Thai
  'ยอมรับทั้งหมด', 'ยอมรับ', 'ตกลง', 'ยินยอมทั้งหมด', 'ยินยอม', 'ใช่', 'ยอมรับคุกกี้ทั้งหมด',
  'อนุญาตทั้งหมด', 'ตกลงทั้งหมด', 'ยอมรับทุกอย่าง',
  // Hindi
  'सभी स्वीकार करें', 'स्वीकार करें', 'सहमत', 'मैं सहमत हूँ', 'सभी को स्वीकार करें', 'हाँ',
  'सभी कुकीज़ स्वीकार करें', 'अनुमति दें सभी', 'स्वीकार', 'सहमत हूँ', 'ठीक है',
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
  'only strictly necessary', 'reject non-essential', 'decline non-essential', 'only functional',
  'only required',
  // Russian
  'отклонить все', 'отклонить всё', 'отклонить', 'отказаться от всех', 'отказаться',
  'отказ', 'не принимать', 'не согласен', 'нет спасибо', 'запретить все', 'запретить',
  'только необходимые', 'только необходимые куки', 'только обязательные',
  'только технические', 'использовать только необходимые', 'продолжить без согласия',
  'отклонить необязательные', 'отказ от всех', 'не разрешать', 'нет',
  'только строго необходимые', 'только нужные', 'только функциональные', 'только основные',
  'запретить необязательные', 'отклонить дополнительные',
  // Ukrainian
  'відхилити все', 'відхилити', 'відмовитись', 'лише необхідні', 'тільки необхідні',
  'відмовитися від всіх', 'не приймати', 'не погоджуюсь', 'ні дякую', 'заборонити все',
  'заборонити', "тільки обов'язкові", 'тільки технічні', 'продовжити без згоди',
  "відхилити необов'язкові",
  // Belarusian
  'адхіліць усе', 'адхіліць', 'адмовіцца', 'толькі неабходныя', 'не прымаць',
  // German
  'alle ablehnen', 'alles ablehnen', 'ablehnen', 'ich lehne ab', 'alle cookies ablehnen',
  'nur notwendige', 'nur notwendige cookies', 'nur essenzielle', 'nur essenzielle cookies',
  'nur erforderliche', 'nur erforderliche cookies', 'nur technisch notwendige',
  'nicht einverstanden', 'weiter ohne einwilligung', 'ohne einwilligung fortfahren',
  'nicht zustimmen', 'auswahl ablehnen', 'notwendige cookies', 'nur notwendige zulassen',
  'ablehnen alle', 'ich stimme nicht zu', 'nein danke', 'nur funktionale',
  'nur grundlegende', 'nur erforderliche zulassen', 'nicht akzeptieren', 'alle optionalen ablehnen',
  // French
  'tout refuser', 'refuser tout', 'refuser tous les cookies', 'refuser', 'je refuse',
  'continuer sans accepter', 'poursuivre sans accepter', 'continuer sans consentement',
  'uniquement les cookies necessaires', 'cookies necessaires uniquement',
  'seulement les necessaires', 'non merci', 'je ne suis pas d accord', 'tout desactiver',
  'refuser tout', 'je ne consens pas', 'refuser les cookies', 'seulement les essentiels',
  'uniquement necessaire', 'refuser les optionnels', 'desactiver tout', 'je refuse tout',
  'non', 'continuer sans accepter les cookies',
  // Spanish
  'rechazar todo', 'rechazar todas', 'rechazar todas las cookies', 'rechazar',
  'no acepto', 'solo las necesarias', 'solo cookies necesarias', 'solo necesarias',
  'solo esenciales', 'continuar sin aceptar', 'no estoy de acuerdo', 'denegar todo',
  'rechazar', 'no', 'solo las requeridas', 'solo las basicas', 'rechazar cookies',
  'desactivar todo', 'no consentir', 'continuar sin aceptar cookies', 'solo obligatorias',
  // Catalan
  'rebutjar tot', 'rebutjar', 'nomes les necessaries', 'no accepto', 'continuar sense acceptar',
  "no estic d'acord",
  // Galician
  'rexeitar todo', 'rexeitar', 'soamente as necesarias', 'non acepto',
  // Italian
  'rifiuta tutto', 'rifiuta tutti', 'rifiuta', 'non accetto', 'continua senza accettare',
  'solo necessari', 'solo i necessari', 'solo cookie necessari', 'solo essenziali',
  'nega tutto', 'non sono d accordo', 'rifiuta i cookie', 'solo quelli necessari', 'non',
  'solo essenziali', 'rifiuta cookies', 'disattiva tutto', 'continua senza consenso', 'solo obbligatori',
  // Portuguese
  'rejeitar todos', 'rejeitar tudo', 'rejeitar', 'recusar todos', 'recusar', 'nao aceito',
  'apenas os necessarios', 'apenas necessarios', 'somente necessarios', 'apenas essenciais',
  'continuar sem aceitar', 'nao concordo', 'rejeitar cookies', 'so os necessarios', 'nao',
  'apenas os essenciais', 'recusar tudo', 'desativar tudo', 'continuar sem consentimento',
  'apenas obrigatorios',
  // Dutch
  'alles weigeren', 'alle cookies weigeren', 'weigeren', 'afwijzen', 'alles afwijzen',
  'alleen noodzakelijke', 'alleen noodzakelijke cookies', 'alleen essentiele',
  'niet akkoord', 'doorgaan zonder accepteren', 'nee bedankt', 'alleen noodzakelijke accepteren',
  'weiger alles', 'ik ga niet akkoord', 'neen', 'alleen functionele', 'alleen verplichte',
  'weiger cookies', 'alleen basis', 'doorgaan zonder instemmen',
  // Swedish
  'avvisa alla', 'neka alla', 'endast nodvandiga', 'bara nodvandiga', 'nej tack', 'avvisa',
  'godkann ej', 'endast nodvandiga cookies', 'bar nodvandiga', 'fortsatt utan samtycke',
  'neka', 'jag godkanner inte', 'nej', 'avvisa cookies', 'endast nodvandiga', 'inaktivera alla',
  // Norwegian
  'avvis alle', 'kun nodvendige', 'bare nodvendige', 'nei takk', 'avvis', 'godkjenn ikke',
  'kun nodvendige cookies', 'bare nodvendige', 'fortsett uten samtykke', 'nekta',
  'jeg godkjenner ikke', 'nei', 'avslaa', 'bare nodvendige', 'deaktiver alle',
  // Danish
  'afvis alle', 'kun nodvendige', 'bare nodvendige', 'nej tak', 'afvis', 'godkend ikke',
  'kun nodvendige cookies', 'bare nodvendige', 'fortsat uden samtykke', 'jeg godkender ikke',
  'nej', 'afslaa', 'deaktiver alle', 'kun nodvendige',
  // Finnish
  'hylkaa kaikki', 'hylkaa', 'vain valttamattomat', 'vain valttamattomat evasteet',
  'hylkaa evasteet', 'en hyvaksy', 'kiitos ei', 'jatka ilman suostumusta', 'kieltaa kaikki',
  'en', 'vain valttamattomat', 'esta evasteet', 'vain vaaditut',
  // Polish
  'odrzuc wszystkie', 'odrzucam', 'odrzuc', 'nie zgadzam sie', 'tylko niezbedne',
  'tylko konieczne', 'tylko wymagane', 'kontynuuj bez zgody', 'odrzucam wszystkie', 'nie',
  'tylko niezbedne cookies', 'tylko wymagane cookies', 'odrzuc cookies', 'wylacz wszystko',
  'kontynuuj bez zgody', 'tylko funkcjonalne', 'tylko podstawowe', 'nie akceptuje', 'odrzuc',
  // Czech
  'odmitnout vse', 'odmitnout', 'nesouhlasim', 'jen nezbytne', 'pouze nezbytne',
  'odmitnout vsechny', 'ne', 'jen nezbytne cookies', 'pouze nezbytne cookies',
  'pokracovat bez souhlasu', 'odmitam', 'vypnout vse', 'odmitnout cookies', 'pouze funkcni',
  'jen nutne', 'ne souhlasim',
  // Slovak
  'odmietnut vsetko', 'odmietnut', 'nesuhlasim', 'iba nevyhnutne', 'odmietnut vsetko', 'ne',
  'iba nevyhnutne cookies', 'pokracovat bez suhlasu', 'odmietam', 'vypnut vsetko', 'len potrebne',
  // Slovene
  'zavrni vse', 'zavrni', 'se ne strinjam', 'samo nujno potrebne', 'zavrni vse', 'ne',
  'samo nujno potrebne cookies', 'nadaljuj brez soglasja', 'zavrnem', 'izklopi vse', 'le nujne',
  // Croatian
  'odbij sve', 'odbaci sve', 'odbij', 'ne slažem se', 'samo nuzni', 'odbij sve', 'ne',
  'samo nuzni cookies', 'nastavi bez pristanka', 'odbijam', 'iskljuci sve', 'samo neophodne',
  // Serbian
  'одбиј све', 'одбаци све', 'одбиј', 'не слажем се', 'само неопходни', 'одбиј све', 'не',
  'само неопходни колачићи', 'настави без пристанка', 'одбијам',
  // Hungarian
  'osszes elutasitasa', 'elutasitom', 'csak a szukseges', 'csak szukseges',
  'elutasitom az osszeset', 'nem', 'csak a szukseges cookiekat', 'csak a szuksegesek',
  'folytatas hozzaferes nelkul', 'elutasitas', 'kikapcsol mindent', 'csak a feltetelek',
  'nem fogadom el',
  // Romanian
  'respinge toate', 'refuz', 'doar cele necesare', 'doar necesare', 'nu sunt de acord',
  'respinge', 'nu', 'doar cookie-urile necesare', 'continua fara acceptare', 'refuz tot',
  'dezactiveaza tot', 'doar cele esentiale', 'nu accept',
  // Bulgarian
  'отхвърляне на всички', 'отхвърли всички', 'само необходимите', 'не приемам', 'отхвърлям',
  'не', 'само необходимите cookies', 'продължи без съгласие', 'отхвърли', 'изключи всички',
  'само задължителте',
  // Greek
  'απορριψη ολων', 'απορριψη', 'μονο απαραιτητα', 'δεν συμφωνω', 'απορριπτω ολα', 'όχι',
  'μονο απαραιτητα cookies', 'συνεχιστε χωρις συγκαταθεση', 'απορριπτω',
  'απενεργοποιηση ολων', 'μονο τα απαιτουμενα',
  // Turkish
  'tumunu reddet', 'hepsini reddet', 'reddet', 'sadece gerekli', 'kabul etmiyorum',
  'reddet tumunu', 'hayir', 'sadece gerekli olanlar', 'devam et kabul etmeden', 'reddet',
  'tumunu reddet', 'devam etmeden', 'sadece zorunlu olanlar', 'kapati tumunu',
  // Lithuanian
  'atmesti visus', 'tik butinieji', 'nesutinku', 'atmesti', 'ne', 'tik butinieji cookies',
  'teskti be sutikimo', 'atmesiu', 'isjungti visus', 'tik reikalingieji',
  // Latvian
  'noraidit visus', 'tikai nepieciesamas', 'nesutinku', 'noraidit', 'ne',
  'tikai nepieciesamas cookies', 'turpināt bez piekrišanas', 'noraidīt', 'izslēgt visus',
  // Estonian
  'keeldu koigist', 'ainult vajalikud', 'ei ole nous', 'keeldu', 'ei', 'ainult vajalikud cookies',
  'jata ilma noustumiseta', 'keelun', 'lulita koik valja',
  // Hebrew
  'דחה הכל', 'אני לא מסכים', 'רק הכרחיים', 'דחה', 'לא מסכים', 'לא', 'רק עוגיות הכרחיות',
  'להמשיך בלי להסכים', 'לדחות', 'לא מאשר', 'רק נחוצים',
  // Arabic
  'رفض الكل', 'رفض جميع', 'الضرورية فقط', 'لا اوافق', 'رفض', 'لا',
  'رفض جميع ملفات تعريف الارتباط', 'الاستمرار بدون موافقة', 'ارفض', 'الضروري فقط',
  'رفض الكل', 'فقط الضروري',
  // Persian (Farsi)
  'رد کردن همه', 'رد کردن', 'فقط ضروری', 'موافق نیستم', 'نه', 'رد تمام کوکی‌ها',
  'ادامه بدون پذیرش', 'نپذیرفتن', 'فقط لازم', 'مخالفم',
  // Japanese
  'すべて拒否', '拒否する', '同意しない', '必要なもののみ', '必須のみ', '拒否',
  'すべてを拒否する', '同意しません', '必須のもののみ', '拒否します', 'オプトアウト', '同意しない',
  // Chinese (Simplified)
  '全部拒绝', '拒绝全部', '拒绝所有', '拒绝', '仅必要', '仅必需cookie', '不同意', '仅需要',
  '仅必需', '拒绝cookie', '仅必要cookie', '不需要', '仅保留必要', '拒绝所有cookie',
  // Chinese (Traditional)
  '全部拒絕', '拒絕', '僅必要', '不同意', '僅必需', '拒絕所有', '僅需要',
  // Korean
  '모두 거부', '거부', '필수만 허용', '동의하지 않음', '동의하지 않습니다', '아니요',
  '필수만', '거부합니다', '거부해요', '동의 안 함', '거부',
  // Indonesian
  'tolak semua', 'tolak', 'hanya yang diperlukan', 'tidak setuju', 'menolak', 'tidak',
  'tolak semua cookie', 'terima hanya yang diperlukan', 'menolak semua', 'hanya yang perlu',
  'lanjutkan tanpa menyetujui',
  // Vietnamese
  'tu choi tat ca', 'tu choi', 'khong dong y', 'chi can thiet', 'toi khong dong y', 'khong',
  'tu choi tat ca cookie', 'chi cho phep can thiet', 'chi can thiet cookie',
  'tiep tuc ma khong dong y',
  // Thai
  'ปฏิเสธทั้งหมด', 'ปฏิเสธ', 'เฉพาะที่จำเป็น', 'ไม่ยอมรับ', 'ไม่ตกลง', 'ไม่',
  'ปฏิเสธคุกกี้ทั้งหมด', 'เฉพาะที่จำเป็นเท่านั้น', 'ดำเนินการต่อโดยไม่ยอมรับ', 'ไม่ยินยอม',
  // Hindi
  'सभी अस्वीकार करें', 'अस्वीकार करें', 'केवल आवश्यक', 'मैं सहमत नहीं', 'नहीं',
  'केवल आवश्यक कुकीज़', 'अस्वीकार', 'केवल जरूरी', 'जारी रखें बिना सहमति के', 'मना करें',
];

/** "Show me the toggles" — used to reach a reject button one level deeper. */
export const SETTINGS_PHRASES: readonly string[] = [
  'cookie settings', 'cookie preferences', 'manage cookies', 'manage settings',
  'manage preferences', 'manage options', 'manage choices', 'more options', 'options',
  'customize', 'customise', 'customize settings', 'customise settings', 'preferences',
  'settings', 'configure', 'let me choose', 'more information', 'purposes',
  'настройки', 'настроить', 'настройки cookie', 'управление файлами cookie', 'подробнее',
  'налаштування', 'налаштувати',
  'einstellungen', 'cookie einstellungen', 'einstellungen verwalten', 'anpassen', 'mehr optionen',
  'parametrer', 'personnaliser', 'gerer les cookies', 'plus d options', 'parametres',
  'configuracion', 'personalizar', 'gestionar cookies', 'mas opciones', 'ajustes',
  'configuracio', 'personalitzar',
  'impostazioni', 'personalizza', 'gestisci cookie', 'altre opzioni',
  'definicoes', 'personalizar cookies', 'gerir cookies',
  'instellingen', 'voorkeuren', 'beheer cookies', 'aanpassen',
  'inställningar', 'hantera cookies', 'anpassa',
  'innstillinger', 'administrer cookies',
  'indstillinger', 'administrer cookies',
 'asetukset', 'hallitse evasteita',
  'ustawienia', 'dostosuj', 'zarzadzaj', 'nastaveni', 'prizpusobit', 'spravovat',
  'nastavenia', 'prispôsobiť',
  'nastavit', 'upravit',
  'beallitasok', 'kezeli a cookie-kat',
  'setari', 'gestionati cookie-urile',
  'настройки на бисквитките', 'управление на бисквитките',
  'ρυθμισεις', 'διαχειριστε τα cookies',
  'ayarlar', 'ozellestir', 'yonet',
  'nustatymai', 'tvarkyti slapukus',
  'iestatijumi', 'pārvaldīt sīkfailus',
  'seaded', 'halda küpsiseid',
  'הגדרות', 'נהל עוגיות',
  'إعدادات', 'إدارة ملفات تعريف الارتباط',
  'تنظیمات', 'مدیریت کوکی‌ها',
  '設定', 'クッキー設定', '詳細設定', '設定を管理',
  '设置', 'cookie设置', '管理', '管理cookie', '偏好设置',
  '設置', 'cookie設置',
  '설정', '쿠키 설정', '쿠키 관리',
  'pengaturan', 'kelola cookie',
  'cai dat', 'quan ly cookie',
  'การตั้งค่า', 'จัดการคุกกี้',
  'सेटिंग्स', 'कुकीज़ प्रबंधित करें',
];

/** "Persist my (now unchecked) choices." */
export const SAVE_PHRASES: readonly string[] = [
  'save', 'save settings', 'save preferences', 'save and close', 'save choices',
  'save my choices', 'confirm choices', 'confirm my choices', 'confirm', 'confirm selection',
  'apply', 'apply settings', 'submit preferences', 'done',
  'сохранить', 'сохранить настройки', 'подтвердить выбор', 'применити', 'зберегти', 'зберегти налаштування',
  'speichern', 'auswahl speichern', 'einstellungen speichern', 'bestatigen', 'ubernehmen',
  'enregistrer', 'enregistrer mes choix', 'valider', 'confirmer', 'sauvegarder',
  'guardar', 'guardar preferencias', 'confirmar seleccion', 'confirmar', 'guardar e sair',
  'salva', 'salva preferenze', 'conferma', 'guardar e sair',
  'opslaan', 'voorkeuren opslaan', 'bevestigen',
  'spara', 'spara inställningar', 'bekrafta',
  'lagre', 'lagre innstillinger', 'bekreft',
  'gem', 'gem indstillinger', 'bekraft',
  'tallenna', 'tallenna asetukset', 'vahvista',
  'zapisz', 'zapisz ustawienia', 'potwierdz', 'ulozit', 'potvrdit',
  'ulozit', 'ulozit nastavenia',
  'mentés', 'beállítások mentése', 'megerősítés',
  'salveaza', 'salveaza setarile', 'confirma',
  'запази', 'запази настройкиите', 'потвърди',
  'αποθηκευση', 'αποθηκευση ρυθμισεων', 'επιβεβαιωση',
  'kaydet', 'onayla', 'ayarlari kaydet',
  'issaugoti', 'issaugoti nustatymus', 'patvirtinti',
  'saglabāt', 'saglabāt iestatījumus', 'apstiprināt',
  'salvesta', 'salvesta seaded', 'kinnita',
  'לשמור', 'לשמור הגדרות', 'לאשר',
  'حفظ', 'حفظ الإعدادات', 'تأكيد',
  'ذخیره', 'ذخیره تنظیمات', 'تأیید',
  '保存', '設定を保存', '保存设置', '确认', '適用',
  '저장', '설정 저장', '확인', '적용',
  'simpan', 'simpan pengaturan', 'konfirmasi',
  'luu', 'luu cai dat', 'xac nhan',
  'บันทึก', 'บันทึกการตั้งค่า', 'ยืนยัน',
  'सहेजें', 'सेटिंग्स सहेजें', 'पुष्टि करें',
];

/**
 * Vocabulary that is specific to *cookie consent* and essentially never turns
 * up in ordinary application chrome. One of these is enough to trust a block.
 */
export const STRONG_CONSENT_CONTEXT: readonly string[] = [
  'cookie', 'cookies', 'consent', 'gdpr', 'ccpa', 'iab', 'tcf', 'legitimate interest',
  'cookie policy', 'cookie notice', 'cookie settings', 'cookie preferences',
  'куки', 'кукис', 'файлы cookie', 'согласие', 'согласия', 'файли cookie', 'згоду',
  'кукі', 'згода',
  'einwilligung', 'cookie richtlinie', 'zustimmung', 'datenzustimmung',
  'consentement', 'temoins de connexion', 'cookies', 'consentement cookies',
  'consentimiento', 'galletas', 'cookies', 'consentimiento cookies',
  'consenso', 'consenso cookie', 'consentimento cookies',
  'consentimento', 'consentimento cookies',
  'toestemming', 'cookie toestemming',
  'zgode', 'souhlas', 'suhlas', 'soglasje',
  'samtycke', 'samtykke', 'suostumus', 'evasteet', 'evastekaytanto',
  'cerez', 'cerezler', 'çerez', 'çerezler',
  'συγκαταθεση', 'συγκαταθεση cookies',
  'бисквитки', 'бисквитки cookies', 'фișiere cookie', 'consent cookie',
  'クッキー', 'クッキー同意', 'cookie同意',
  '隐私政策', 'cookie 政策', 'cookie政策', 'cookie同意', '隐私政策cookie',
  '隱私政策', 'cookie 政策',
  '쿠키', '쿠키 동의', 'cookie 동의',
  'cookie', 'cookies', 'persetujuan cookie',
  'cookie', 'cookies', 'đồng ý cookie',
  'คุกกี้', 'คุกกี้ยินยอม', 'cookie ยินยอม',
  'कुकी', 'कुकी सहमति', 'cookie सहमति',
  'ملفات تعريف الارتباط', 'موافقة ملفات تعريف الارتباط',
  'עוגיות', 'הסכמה לעוגיות',
  'کوکی', 'رضایت کوکی',
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
  'обработку данных', 'отслеживани', 'конфіденційність', 'персональних даних',
  'datenschutz', 'personenbezogene daten', 'datenschutzerklärung',
  'confidentialite', 'donnees personnelles', 'protection des donnees',
  'privacidad', 'datos personales', 'proteccion de datos',
  'informativa', 'dati personali', 'trattamento dei dati',
  'privacidade', 'dados pessoais', 'protecao de dados',
  'privacybeleid', 'persoonsgegevens', 'gegevensbescherming',
  'integritet', 'personuppgifter', 'dataskydd',
  'personvern', 'personopplysninger', 'databeskyttelse',
  'privatliv', 'personoplysninger', 'databeskyttelse',
  'yksityisyys', 'henkilotietojen suoja',
  'prywatnosc', 'dane osobowe', 'soukromi', 'osobni udaje',
  'soukromi', 'osobne udaje',
  'zasebnost', 'osebni podatki',
  'gizlilik', 'kişisel veriler', 'verilerin korunmasi',
  'απορρητο', 'προσωπικα δεδομενα', 'προστασια δεδομενων',
  'поверителност', 'лични данни', 'защита на данните',
  'confidentialitate', 'date personale', 'protectia datelor',
  'privatumas', 'asmens duomenys', 'duomenu apsauga',
  'privātums', 'personas dati', 'datu aizsardzība',
  'privaatsus', 'isikuandmete kaitse',
  'פרטיות', 'נתונים אישיים', 'הגנת הנתונים',
  'خصوصية', 'بيانات شخصية', 'حماية البيانات',
  'حریم خصوصی', 'داده‌های شخصی', 'حفاظت از داده‌ها',
  'プライバシー', '個人情報', '個人情報保護', 'トラッキング',
  '隐私', '个人信息', '个人信息保护', '跟踪',
  '隱私', '個人信息',
  '개인정보', '개인정보 보호', '추적',
  'privasi', 'data pribadi', 'perlindungan data',
  'quyen rieng tu', 'du lieu ca nhan', 'bao ve du lieu',
  'ความเป็นส่วนตัว', 'ข้อมูลส่วนบุคคล', 'การคุ้มครองข้อมูล',
  'गोपनीयता', 'व्यक्तिगत डेटा', 'डेटा सुरक्षा',
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
  'добре', 'так', 'згоден',
  'verstanden', 'einverstanden', 'weiter', 'zustimmen',
  'd accord', 'compris', 'continuer',
  'entendido', 'de acuerdo', 'aceptar', 'continuar', 'si',
  'ho capito', 'continua',
  'begrepen', 'akkoord', 'doorgaan',
  'rozumim', 'rozumiem', 'kontynuuj',
  'tamam', 'anladim', 'ενταξει',
  'rendben', 'am inteles',
  'forstod', 'fortsett', 'fortsatt',
  'ymmarrettu', 'jatka',
  'razumem', 'nadaljuj',
  'razumiem', 'ist dalej',
  'ertem', 'continua',
  'inteleg', 'continua',
  'разбирам', 'продължи',
  'καταλαβαινω', 'συνεχιστε',
  'suprantu', 'teskti',
  'saprotu', 'turpināt',
  'moistan', 'jatka',
  'אוקיי', 'להמשיך',
  'نعم', 'استمر',
  'بله', 'ادامه',
  '確定', '确定', '同意', '了解', '確認', '適用',
  '확인', '동의', '알겠습니다',
  'ya', 'lanjutkan',
  'vang', 'tiep tuc',
  'ใช่', 'ดำเนินการต่อ',
  'हाँ', 'जारी रखें',
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
  'необходимые', 'обязательные', 'технические', 'всегда активны', 'необхідні', "обов'язкові",
  'notwendig', 'erforderlich', 'essenziell', 'technisch notwendig', 'immer aktiv',
  'necessaires', 'essentiels', 'obligatoires', 'toujours actif',
  'necesarias', 'esenciales', 'obligatorias', 'siempre activas',
  'necessari', 'essenziali', 'obbligatori', 'sempre attivi',
  'necessarios', 'essenciais', 'obrigatorios',
  'noodzakelijk', 'essentieel', 'verplicht',
  'nodvandiga', 'nodvendige', 'valttamattomat', 'obligatoriske',
  'niezbedne', 'wymagane', 'konieczne', 'nezbytne', 'povinne', 'nujno potrebne',
  'szukseges', 'kotelezo', 'felteteles',
  'necesare', 'esentiale', 'obligatorii',
  'необходими', 'задължителни', 'технически',
  'απαραιτητα', 'υποχρεωτικα', 'τεχνικα',
  'gerekli', 'zorunlu', 'teknik', 'her zaman aktif',
  'butinieji', 'būtini', 'techniniai',
  'nepieciesamas', 'obligāti', 'tehniski',
  'vajalikud', 'kohustuslikud', 'tehnilised',
  'הכרחיים', 'חובה', 'טכני', 'תמיד פעיל',
  'ضروري', 'إلزامي', 'تقني', 'نشط دائماً',
  'ضروری', 'اجباری', 'فنی', 'همیشه فعال',
  '必要', '必須', '必需', '技術的', '常に有効',
  '필수', '의무', '기술적', '항상 활성화',
  'diperlukan', 'wajib', 'teknis', 'selalu aktif',
  'can thiet', 'bat buoc', 'ky thuat', 'luon hoat dong',
  'จำเป็น', 'บังคับ', 'เทคนิค', 'ใช้งานตลอดเวลา',
  'आवश्यक', 'अनिवार्य', 'तकनीकी', 'हमेशा सक्रिय',
];
