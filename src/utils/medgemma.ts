import { supabase } from '@/integrations/supabase/client';

export type AnalysisType = 'general' | 'longitudinal' | 'anatomical_localization' | 'document_understanding';
export type DocumentType = 'lab_report' | 'prescription' | 'radiology_report' | 'pathology_report' | 'discharge_summary';
export type ImagingType = 'ct' | 'mri' | 'pet_ct';
export type BodyPart = 'head' | 'chest' | 'abdomen' | 'pelvis' | 'spine' | 'extremity' | 'whole_body';

interface MedGemmaChatParams {
  message: string;
  images?: string[]; // base64 encoded
  analysisType?: AnalysisType;
  userRole?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface MedGemmaChatResponse {
  reply: string;
  timestamp: string;
  model: string;
  analysisType?: string;
  imageCount?: number;
  capabilities?: Record<string, boolean>;
}

interface DocumentAnalysisParams {
  document: string; // base64 encoded image
  documentType: DocumentType;
  extractFields?: string[];
  userRole?: string;
}

interface DocumentAnalysisResponse {
  extractedData: string;
  documentType: string;
  timestamp: string;
  model: string;
  capabilities?: Record<string, boolean>;
}

interface Imaging3DParams {
  slices: string[]; // base64 encoded images (1-50)
  imagingType: ImagingType;
  bodyPart: BodyPart;
  clinicalQuestion: string;
  sliceOrientation?: 'axial' | 'sagittal' | 'coronal';
  contrastUsed?: boolean;
  userRole?: string;
}

interface Imaging3DResponse {
  analysis: string;
  imagingType: string;
  bodyPart: string;
  sliceCount: number;
  timestamp: string;
  model: string;
  capabilities?: Record<string, boolean>;
}

/**
 * Call MedGemma 1.5 4B multimodal chat
 * 
 * @param params - Chat parameters including message, images, and analysis type
 * @returns AI response with analysis
 * 
 * @example
 * ```typescript
 * const response = await callMedGemmaChat({
 *   message: 'Analyze this chest X-ray',
 *   images: [base64Image],
 *   analysisType: 'general',
 *   userRole: 'doctor'
 * });
 * ```
 */
export const callMedGemmaChat = async (params: MedGemmaChatParams): Promise<MedGemmaChatResponse> => {
  const { data, error } = await supabase.functions.invoke('medgemma-chat', {
    body: params
  });

  if (error) {
    throw new Error(error.message || 'Failed to get response from MedGemma');
  }

  if (!data || !data.reply) {
    throw new Error('Invalid response from MedGemma - no reply received');
  }

  return data;
};

/**
 * Extract structured data from medical documents
 * 
 * @param params - Document analysis parameters
 * @returns Extracted structured data
 * 
 * @example
 * ```typescript
 * const response = await analyzeMedicalDocument({
 *   document: base64ImageOfLabReport,
 *   documentType: 'lab_report',
 *   extractFields: ['CBC', 'Liver Function']
 * });
 * ```
 */
export const analyzeMedicalDocument = async (params: DocumentAnalysisParams): Promise<DocumentAnalysisResponse> => {
  const { data, error } = await supabase.functions.invoke('medgemma-document-analysis', {
    body: params
  });

  if (error) {
    throw new Error(error.message || 'Failed to analyze document');
  }

  if (!data || !data.extractedData) {
    throw new Error('Invalid response - no extracted data received');
  }

  return data;
};

/**
 * Analyze 3D medical imaging (CT/MRI)
 * 
 * @param params - 3D imaging parameters
 * @returns Volumetric analysis
 * 
 * @example
 * ```typescript
 * const response = await analyze3DImaging({
 *   slices: [slice1, slice2, slice3],
 *   imagingType: 'ct',
 *   bodyPart: 'chest',
 *   clinicalQuestion: 'Rule out pulmonary embolism'
 * });
 * ```
 */
export const analyze3DImaging = async (params: Imaging3DParams): Promise<Imaging3DResponse> => {
  const { data, error } = await supabase.functions.invoke('medgemma-3d-imaging', {
    body: params
  });

  if (error) {
    throw new Error(error.message || 'Failed to analyze 3D imaging');
  }

  if (!data || !data.analysis) {
    throw new Error('Invalid response - no analysis received');
  }

  return data;
};

/**
 * Convert File to base64 string
 * 
 * @param file - File object
 * @returns Promise<string> - Base64 encoded data URI
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Resize image to optimal size for MedGemma (896x896)
 * 
 * @param file - Image file
 * @param targetSize - Target size (default: 896)
 * @returns Promise<string> - Resized base64 image
 */
export const resizeImageForMedGemma = (file: File, targetSize: number = 896): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = () => {
      canvas.width = targetSize;
      canvas.height = targetSize;
      ctx.drawImage(img, 0, 0, targetSize, targetSize);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};
