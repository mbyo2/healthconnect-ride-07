import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Supported languages - major world languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

// Translation dictionaries - core UI strings
const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.search': 'Find a Doctor',
    'nav.appointments': 'Appointments',
    'nav.wallet': 'Wallet',
    'nav.map': 'Map',
    'nav.profile': 'Profile',
    'common.book': 'Book',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.viewAll': 'View All',
    'appointments.title': 'My Appointments',
    'appointments.upcoming': 'Upcoming Appointments',
    'appointments.past': 'Past Appointments',
    'appointments.book': 'Book Appointment',
    'wallet.balance': 'Wallet Balance',
    'wallet.topUp': 'Top Up',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.search': 'Trouver un Médecin',
    'nav.appointments': 'Rendez-vous',
    'nav.wallet': 'Portefeuille',
    'nav.map': 'Carte',
    'nav.profile': 'Profil',
    'common.book': 'Réserver',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.search': 'Rechercher',
    'common.loading': 'Chargement...',
    'common.viewAll': 'Voir Tout',
    'appointments.title': 'Mes Rendez-vous',
    'appointments.upcoming': 'Rendez-vous à Venir',
    'appointments.past': 'Rendez-vous Passés',
    'appointments.book': 'Prendre Rendez-vous',
    'wallet.balance': 'Solde du Portefeuille',
    'wallet.topUp': 'Recharger',
  },
  es: {
    'nav.home': 'Inicio',
    'nav.search': 'Buscar un Médico',
    'nav.appointments': 'Citas',
    'nav.wallet': 'Billetera',
    'nav.map': 'Mapa',
    'nav.profile': 'Perfil',
    'common.book': 'Reservar',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.search': 'Buscar',
    'common.loading': 'Cargando...',
    'common.viewAll': 'Ver Todo',
    'appointments.title': 'Mis Citas',
    'appointments.upcoming': 'Próximas Citas',
    'appointments.past': 'Citas Pasadas',
    'appointments.book': 'Reservar Cita',
    'wallet.balance': 'Saldo de Billetera',
    'wallet.topUp': 'Recargar',
  },
  pt: {
    'nav.home': 'Início',
    'nav.search': 'Encontrar um Médico',
    'nav.appointments': 'Consultas',
    'nav.wallet': 'Carteira',
    'nav.map': 'Mapa',
    'nav.profile': 'Perfil',
    'common.book': 'Agendar',
    'common.cancel': 'Cancelar',
    'common.save': 'Salvar',
    'common.search': 'Pesquisar',
    'common.loading': 'Carregando...',
    'common.viewAll': 'Ver Tudo',
    'appointments.title': 'Minhas Consultas',
    'appointments.upcoming': 'Próximas Consultas',
    'appointments.past': 'Consultas Passadas',
    'appointments.book': 'Agendar Consulta',
    'wallet.balance': 'Saldo da Carteira',
    'wallet.topUp': 'Recarregar',
  },
  ar: {
    'nav.home': 'الرئيسية',
    'nav.search': 'ابحث عن طبيب',
    'nav.appointments': 'المواعيد',
    'nav.wallet': 'المحفظة',
    'nav.map': 'الخريطة',
    'nav.profile': 'الملف الشخصي',
    'common.book': 'احجز',
    'common.cancel': 'إلغاء',
    'common.save': 'حفظ',
    'common.search': 'بحث',
    'common.loading': 'جارٍ التحميل...',
    'common.viewAll': 'عرض الكل',
    'appointments.title': 'مواعيدي',
    'appointments.upcoming': 'المواعيد القادمة',
    'appointments.past': 'المواعيد السابقة',
    'appointments.book': 'احجز موعد',
    'wallet.balance': 'رصيد المحفظة',
    'wallet.topUp': 'اشحن',
  },
  sw: {
    'nav.home': 'Nyumbani',
    'nav.search': 'Tafuta Daktari',
    'nav.appointments': 'Miadi',
    'nav.wallet': 'Pochi',
    'nav.map': 'Ramani',
    'nav.profile': 'Wasifu',
    'common.book': 'Weka Nafasi',
    'common.cancel': 'Ghairi',
    'common.save': 'Hifadhi',
    'common.search': 'Tafuta',
    'common.loading': 'Inapakia...',
    'common.viewAll': 'Ona Zote',
    'appointments.title': 'Miadi Yangu',
    'appointments.upcoming': 'Miadi Ijayo',
    'appointments.past': 'Miadi Iliyopita',
    'appointments.book': 'Weka Miadi',
    'wallet.balance': 'Salio la Pochi',
    'wallet.topUp': 'Jaza',
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('doc0clock-language');
    if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
      return saved as LanguageCode;
    }
    // Auto-detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES.some(l => l.code === browserLang)) {
      return browserLang as LanguageCode;
    }
    return 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('doc0clock-language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL: language === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
