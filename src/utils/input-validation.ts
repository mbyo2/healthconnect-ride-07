import { z } from 'zod';

// Enhanced input validation schemas
export const profileSchema = z.object({
  first_name: z.string()
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  last_name: z.string()
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  phone: z.string()
    .regex(/^\+?[\d\s()-]+$/, 'Please enter a valid phone number')
    .max(20, 'Phone number must be less than 20 characters')
    .optional(),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  specialty: z.string()
    .max(100, 'Specialty must be less than 100 characters')
    .optional(),
});

export const messageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must be less than 2000 characters'),
});

export const appointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  type: z.string().max(100, 'Appointment type must be less than 100 characters'),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
});

export const prescriptionSchema = z.object({
  medication_name: z.string()
    .min(1, 'Medication name is required')
    .max(200, 'Medication name must be less than 200 characters'),
  dosage: z.string()
    .min(1, 'Dosage is required')
    .max(100, 'Dosage must be less than 100 characters'),
  frequency: z.string()
    .min(1, 'Frequency is required')
    .max(100, 'Frequency must be less than 100 characters'),
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
});

// XSS Protection - Sanitize HTML content
export const sanitizeText = (text: string): string => {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// SQL Injection Protection - Basic parameter validation
export const validateSQLParam = (value: any): boolean => {
  if (typeof value === 'string') {
    const suspiciousPatterns = [
      /';/i,
      /--/i,
      /\/\*/i,
      /\*\//i,
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
    ];
    
    return !suspiciousPatterns.some(pattern => pattern.test(value));
  }
  return true;
};

// Validate file uploads
export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
  ];
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size too large (max 10MB)' };
  }
  
  return { valid: true };
};

// Rate limiting helper
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, number[]>();
  
  return (identifier: string): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!requests.has(identifier)) {
      requests.set(identifier, []);
    }
    
    const userRequests = requests.get(identifier)!;
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    requests.set(identifier, validRequests);
    
    return true; // Request allowed
  };
};

// Content validation for rich text
export const validateRichTextContent = (content: string): { valid: boolean; sanitized: string } => {
  // Remove script tags and other dangerous elements
  const sanitized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  
  return {
    valid: sanitized.length <= 5000, // Max content length
    sanitized,
  };
};

export default {
  profileSchema,
  messageSchema,
  appointmentSchema,
  prescriptionSchema,
  sanitizeText,
  validateSQLParam,
  validateFileUpload,
  createRateLimiter,
  validateRichTextContent,
};