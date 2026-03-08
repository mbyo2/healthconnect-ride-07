/**
 * Internationalization (i18n) framework for multi-language support
 * Supports: English, Bemba, Nyanja, Tonga (Zambian languages)
 */

export type Locale = 'en' | 'bem' | 'nya' | 'toi';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.appointments': 'Appointments',
    'nav.records': 'Medical Records',
    'nav.pharmacy': 'Pharmacy',
    'nav.emergency': 'Emergency',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.logout': 'Sign Out',

    // Auth
    'auth.signin': 'Sign In',
    'auth.signup': 'Sign Up',
    'auth.phone_login': 'Sign in with Phone',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgot_password': 'Forgot password?',
    'auth.otp_sent': 'OTP sent to your phone',
    'auth.verify': 'Verify',

    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.name': 'Name',
    'common.phone': 'Phone',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.offline': 'You are offline',
    'common.sync_pending': 'Changes pending sync',

    // Medical
    'med.patient': 'Patient',
    'med.doctor': 'Doctor',
    'med.nurse': 'Nurse',
    'med.prescription': 'Prescription',
    'med.diagnosis': 'Diagnosis',
    'med.symptoms': 'Symptoms',
    'med.vitals': 'Vital Signs',
    'med.blood_pressure': 'Blood Pressure',
    'med.temperature': 'Temperature',
    'med.heart_rate': 'Heart Rate',
    'med.weight': 'Weight',

    // Queue
    'queue.token': 'Token',
    'queue.waiting': 'Waiting',
    'queue.serving': 'Serving',
    'queue.completed': 'Completed',
    'queue.emergency': 'Emergency',
    'queue.urgent': 'Urgent',
    'queue.normal': 'Normal',
  },

  bem: {
    'nav.home': 'Kumushi',
    'nav.appointments': 'Amasiku ya kubonana',
    'nav.records': 'Ifipimo fya malwele',
    'nav.pharmacy': 'Pa muti',
    'nav.emergency': 'Ubukaipi',
    'nav.profile': 'Ubumi bwandi',
    'nav.settings': 'Amasettings',
    'nav.logout': 'Fumeni',

    'auth.signin': 'Injileni',
    'auth.signup': 'Ilembeni',
    'auth.phone_login': 'Injileni na foni',
    'auth.email': 'Email',
    'auth.password': 'Icipando',
    'auth.forgot_password': 'Mwalaba icipando?',
    'auth.otp_sent': 'Inambala ya OTP yatumwa ku foni',
    'auth.verify': 'Shimikileni',

    'common.loading': 'Nacilonda...',
    'common.save': 'Sungeni',
    'common.cancel': 'Lekeni',
    'common.delete': 'Fumisheni',
    'common.search': 'Fwayeni',
    'common.offline': 'Tamuli pa intaneti',
    'common.sync_pending': 'Ifishintilwa filalolela',

    'med.patient': 'Uwalwala',
    'med.doctor': 'Dokotala',
    'med.nurse': 'Nasi',
    'med.prescription': 'Imiti',
    'med.vitals': 'Ifipimo fya mubili',
    'med.blood_pressure': 'Amapela ya mulopa',
    'med.temperature': 'Ubushike',

    'queue.token': 'Inambala',
    'queue.waiting': 'Balelolela',
    'queue.serving': 'Balekabila',
    'queue.completed': 'Bapwa',
    'queue.emergency': 'Ubukaipi',
  },

  nya: {
    'nav.home': 'Kunyumba',
    'nav.appointments': 'Nthawi yokuonana',
    'nav.records': 'Zolemba za matenda',
    'nav.pharmacy': 'Ku mankhwala',
    'nav.emergency': 'Zachidzidzi',
    'nav.profile': 'Mbiri yanga',
    'nav.settings': 'Zosintha',
    'nav.logout': 'Tulukani',

    'auth.signin': 'Lowani',
    'auth.signup': 'Lembani',
    'auth.phone_login': 'Lowani ndi foni',
    'auth.email': 'Email',
    'auth.password': 'Chinsinsi',
    'auth.forgot_password': 'Mwayiwala chinsinsi?',
    'auth.otp_sent': 'OTP yatumizidwa ku foni',
    'auth.verify': 'Tsimikizani',

    'common.loading': 'Kukonzekera...',
    'common.save': 'Sungani',
    'common.cancel': 'Siyani',
    'common.search': 'Funani',
    'common.offline': 'Simuli pa intaneti',

    'med.patient': 'Wodwala',
    'med.doctor': 'Dokotala',
    'med.nurse': 'Namwino',
    'med.prescription': 'Mankhwala',
    'med.vitals': 'Kupima thupi',

    'queue.token': 'Nambala',
    'queue.waiting': 'Akudikira',
    'queue.serving': 'Akuthandizidwa',
    'queue.emergency': 'Zachidzidzi',
  },

  toi: {
    'nav.home': 'Kuŋanda',
    'nav.appointments': 'Ciindi cakubonana',
    'nav.records': 'Malwazi',
    'nav.pharmacy': 'Kumisamu',
    'nav.emergency': 'Cipenzi',
    'nav.profile': 'Buumi bwangu',
    'nav.logout': 'Zwa',

    'auth.signin': 'Njila',
    'auth.signup': 'Lemba',
    'auth.phone_login': 'Njila a foni',

    'common.loading': 'Kulibamba...',
    'common.save': 'Bamba',
    'common.cancel': 'Leka',
    'common.search': 'Yanduula',
    'common.offline': 'Tali pa intaneti',

    'med.patient': 'Muciswa',
    'med.doctor': 'Dokotala',
    'med.nurse': 'Naasi',

    'queue.token': 'Nambala',
    'queue.emergency': 'Cipenzi',
  },
};

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale) {
  currentLocale = locale;
  try {
    localStorage.setItem('hc_locale', locale);
  } catch { /* safe */ }
}

export function getLocale(): Locale {
  try {
    return (localStorage.getItem('hc_locale') as Locale) || 'en';
  } catch {
    return 'en';
  }
}

export function t(key: string, fallback?: string): string {
  const locale = currentLocale || getLocale();
  return translations[locale]?.[key] || translations.en[key] || fallback || key;
}

export function getAvailableLocales(): Array<{ code: Locale; name: string; nativeName: string }> {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'bem', name: 'Bemba', nativeName: 'Ichibemba' },
    { code: 'nya', name: 'Nyanja', nativeName: 'Chinyanja' },
    { code: 'toi', name: 'Tonga', nativeName: 'Chitonga' },
  ];
}

// Initialize from storage
currentLocale = getLocale();
