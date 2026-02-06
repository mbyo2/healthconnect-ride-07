// Zambia-specific configuration for Doc' O Clock
// This centralizes all Zambian localization for the MVP

export const ZAMBIA_CONFIG = {
  country: {
    name: 'Zambia',
    code: 'ZM',
    dialCode: '+260',
    currency: {
      code: 'ZMW',
      symbol: 'K',
      name: 'Zambian Kwacha',
    },
    timezone: 'Africa/Lusaka',
  },

  // Emergency numbers for Zambia
  emergencyNumbers: {
    police: '999',
    fire: '993',
    ambulance: '991',
    trafficAccidents: '991',
    generalEmergency: '112',
  },

  // Major hospitals and clinics
  healthcareInstitutions: [
    {
      id: 'uth-lusaka',
      name: 'University Teaching Hospital (UTH)',
      phone: '+260-211-252481',
      address: 'Nationalist Road, Lusaka',
      city: 'Lusaka',
      type: 'hospital' as const,
      available24h: true,
      description: "Zambia's largest public hospital with comprehensive emergency care",
      coordinates: { lat: -15.4067, lng: 28.2871 },
    },
    {
      id: 'levy-mwanawasa',
      name: 'Levy Mwanawasa University Teaching Hospital',
      phone: '+260-211-256067',
      address: 'Off Kasama Road, Lusaka',
      city: 'Lusaka',
      type: 'hospital' as const,
      available24h: true,
      description: 'Modern specialist hospital with advanced medical facilities',
      coordinates: { lat: -15.3875, lng: 28.3228 },
    },
    {
      id: 'fairview',
      name: 'Fairview Hospital',
      phone: '+260-211-236932',
      address: 'Burma Road, Lusaka',
      city: 'Lusaka',
      type: 'hospital' as const,
      available24h: true,
      description: 'Private hospital offering quality healthcare services',
      coordinates: { lat: -15.4195, lng: 28.2855 },
    },
    {
      id: 'cfb',
      name: 'Children\'s Hospital (CFB)',
      phone: '+260-211-252870',
      address: 'Nationalist Road, Lusaka',
      city: 'Lusaka',
      type: 'hospital' as const,
      available24h: true,
      description: 'Specialized pediatric care facility',
      coordinates: { lat: -15.4070, lng: 28.2880 },
    },
    {
      id: 'coptic',
      name: 'Coptic Hospital',
      phone: '+260-211-232686',
      address: 'Lumumba Road, Lusaka',
      city: 'Lusaka',
      type: 'hospital' as const,
      available24h: true,
      description: 'Mission hospital providing affordable healthcare',
      coordinates: { lat: -15.4133, lng: 28.2897 },
    },
    {
      id: 'medland',
      name: 'Medland Hospital',
      phone: '+260-211-290960',
      address: 'Kabulonga, Lusaka',
      city: 'Lusaka',
      type: 'clinic' as const,
      available24h: true,
      description: 'Modern private medical facility',
      coordinates: { lat: -15.4200, lng: 28.3100 },
    },
    {
      id: 'ndola-central',
      name: 'Ndola Central Hospital',
      phone: '+260-212-612556',
      address: 'Buteko Avenue, Ndola',
      city: 'Ndola',
      type: 'hospital' as const,
      available24h: true,
      description: 'Major public hospital in the Copperbelt',
      coordinates: { lat: -12.9687, lng: 28.6366 },
    },
    {
      id: 'kitwe-central',
      name: 'Kitwe Central Hospital',
      phone: '+260-212-221456',
      address: 'Kantanta Street, Kitwe',
      city: 'Kitwe',
      type: 'hospital' as const,
      available24h: true,
      description: 'Central hospital serving Kitwe and surrounding areas',
      coordinates: { lat: -12.8166, lng: 28.2133 },
    },
    {
      id: 'livingstone-general',
      name: 'Livingstone General Hospital',
      phone: '+260-213-320606',
      address: 'Hospital Road, Livingstone',
      city: 'Livingstone',
      type: 'hospital' as const,
      available24h: true,
      description: 'Main hospital in the Southern Province tourist hub',
      coordinates: { lat: -17.8519, lng: 25.8601 },
    },
  ],

  // Ambulance services
  ambulanceServices: [
    {
      id: 'ems-zambia',
      name: 'Emergency Medical Services Zambia',
      phone: '991',
      description: 'National ambulance emergency line',
      available24h: true,
    },
    {
      id: 'eres',
      name: 'ERES (Emergency Rescue Services)',
      phone: '+260-977-770302',
      description: 'Private emergency medical response',
      available24h: true,
    },
    {
      id: 'medrescue',
      name: 'Med Rescue Zambia',
      phone: '+260-955-770302',
      description: 'Private ambulance and medical evacuation',
      available24h: true,
    },
  ],

  // Mobile money providers
  mobileMoneyProviders: [
    {
      id: 'mtn',
      name: 'MTN Mobile Money',
      prefixes: ['097', '096'],
      ussdCode: '*115#',
      color: '#FFCC00',
      logo: '/payment-icons/mtn.svg',
    },
    {
      id: 'airtel',
      name: 'Airtel Money',
      prefixes: ['095', '077'],
      ussdCode: '*778#',
      color: '#FF0000',
      logo: '/payment-icons/airtel.svg',
    },
    {
      id: 'zamtel',
      name: 'Zamtel Kwacha',
      prefixes: ['095'],
      ussdCode: '*422#',
      color: '#00A651',
      logo: '/payment-icons/zamtel.svg',
    },
  ],

  // Insurance providers popular in Zambia
  insuranceProviders: [
    { id: 'nhima', name: 'NHIMA', description: 'National Health Insurance Management Authority' },
    { id: 'hollard', name: 'Hollard Health', description: 'Private health insurance' },
    { id: 'madison', name: 'Madison General Insurance', description: 'Comprehensive coverage' },
    { id: 'professional', name: 'Professional Insurance Corporation', description: 'PICZ insurance' },
    { id: 'sanlam', name: 'Sanlam Life Insurance', description: 'Life and health coverage' },
    { id: 'prudential', name: 'Prudential Life Assurance', description: 'Health insurance solutions' },
    { id: 'ses', name: 'SES International Health', description: 'International health coverage' },
  ],

  // Major cities
  cities: [
    'Lusaka',
    'Ndola',
    'Kitwe',
    'Kabwe',
    'Chingola',
    'Mufulira',
    'Livingstone',
    'Luanshya',
    'Kasama',
    'Chipata',
  ],

  // Phone number formatting
  formatPhoneNumber: (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('260')) {
      return '+' + digits;
    } else if (digits.startsWith('0')) {
      return '+260' + digits.substring(1);
    } else if (digits.length === 9) {
      return '+260' + digits;
    }
    return '+260' + digits;
  },

  // Validate Zambian phone number
  isValidPhone: (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    // Zambian numbers: 260 + 9 digits, or 0 + 9 digits
    return (
      (digits.startsWith('260') && digits.length === 12) ||
      (digits.startsWith('0') && digits.length === 10) ||
      digits.length === 9
    );
  },

  // Get provider from phone number
  getMobileProvider: (phone: string): string | null => {
    const digits = phone.replace(/\D/g, '');
    let prefix = '';
    
    if (digits.startsWith('260')) {
      prefix = '0' + digits.substring(3, 5);
    } else if (digits.startsWith('0')) {
      prefix = digits.substring(0, 3);
    } else {
      prefix = '0' + digits.substring(0, 2);
    }
    
    if (['097', '096', '076'].includes(prefix)) return 'mtn';
    if (['095', '077', '075'].includes(prefix)) return 'airtel';
    if (['094', '095'].includes(prefix)) return 'zamtel';
    return null;
  },
};

// Zambian-specific testimonial templates
export const ZAMBIAN_TESTIMONIALS = [
  {
    name: 'Chipo Mwanza',
    role: 'Patient',
    city: 'Lusaka',
    content: 'Doc\' O Clock has made healthcare so much easier for my family. I can book appointments at UTH without queuing for hours!',
  },
  {
    name: 'Dr. Mulenga Banda',
    role: 'Healthcare Provider',
    city: 'Ndola',
    content: 'As a doctor in the Copperbelt, this platform helps me reach more patients and manage my practice efficiently.',
  },
  {
    name: 'Thandiwe Phiri',
    role: 'Mother of Two',
    city: 'Kitwe',
    content: 'The emergency feature saved my child\'s life. I found the nearest hospital and called an ambulance within minutes.',
  },
  {
    name: 'Bwalya Chilufya',
    role: 'Pharmacy Owner',
    city: 'Lusaka',
    content: 'Managing prescriptions and inventory has never been easier. My customers love ordering medicine through the app.',
  },
  {
    name: 'Mwila Tembo',
    role: 'Patient',
    city: 'Livingstone',
    content: 'Living far from major hospitals, this app connects me to doctors via video call. Truly life-changing technology!',
  },
  {
    name: 'Dr. Ngosa Zimba',
    role: 'Specialist',
    city: 'Lusaka',
    content: 'The platform helps me manage referrals and follow up with patients across Zambia. Healthcare is becoming more accessible.',
  },
];

// Hero section stats for Zambia
export const ZAMBIAN_STATS = {
  hospitals: '50+',
  pharmacies: '200+',
  doctors: '500+',
  patients: '10,000+',
  provinces: '10',
};

export default ZAMBIA_CONFIG;
