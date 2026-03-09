# MedGemma 1.5 4B Integration Guide

## Overview

Your Doc 0 Clock application now leverages **MedGemma 1.5 4B**, Google DeepMind's state-of-the-art multimodal medical AI model, providing advanced capabilities for:

- 🖼️ **Multimodal Medical Analysis** (text + images)
- 📊 **Longitudinal Imaging** (tracking disease progression)
- 🧠 **3D Volumetric Imaging** (CT/MRI analysis)
- 📄 **Medical Document Understanding** (lab reports, prescriptions)
- 🎯 **Anatomical Localization** (bounding box detection)

## Edge Functions Reference

### 1. `medgemma-chat` - Primary Multimodal AI

**Use Case**: General medical conversations with optional image analysis

**Capabilities**:
- Text-only medical Q&A
- Single or multiple image analysis
- Longitudinal comparison of sequential scans
- Anatomical localization on chest X-rays
- Role-aware responses (doctor, nurse, patient, etc.)

**Request Format**:
```typescript
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase.functions.invoke('medgemma-chat', {
  body: {
    message: string,                    // Required: User's question or prompt
    images?: string[],                  // Optional: Array of base64 encoded images (max 10)
    analysisType?: 'general' | 'longitudinal' | 'anatomical_localization', // Default: 'general'
    userRole?: string,                  // Optional: 'doctor', 'nurse', 'patient', etc.
    conversationHistory?: Array<{       // Optional: Previous messages
      role: 'user' | 'assistant',
      content: string
    }>
  }
});
```

**Response Format**:
```typescript
{
  reply: string,                        // AI-generated response
  timestamp: string,                    // ISO timestamp
  model: 'medgemma-1.5-4b-it',
  analysisType: string,
  imageCount: number,
  capabilities: {
    multimodal: true,
    longitudinal: true,
    document_understanding: true,
    anatomical_localization: true,
    native_3d_imaging: true
  }
}
```

**Example 1: Text-Only Consultation**
```typescript
const { data } = await supabase.functions.invoke('medgemma-chat', {
  body: {
    message: 'What are the early signs of pneumonia?',
    userRole: 'patient'
  }
});
console.log(data.reply);
```

**Example 2: Single Image Analysis**
```typescript
// Convert image to base64
const imageBase64 = await convertImageToBase64(imageFile);

const { data } = await supabase.functions.invoke('medgemma-chat', {
  body: {
    message: 'What abnormalities do you see in this chest X-ray?',
    images: [imageBase64],
    analysisType: 'general',
    userRole: 'doctor'
  }
});
```

**Example 3: Longitudinal Analysis (Compare Scans)**
```typescript
// Multiple scans from different dates
const baselineXray = await convertImageToBase64(baselineFile);
const followUpXray = await convertImageToBase64(followUpFile);

const { data } = await supabase.functions.invoke('medgemma-chat', {
  body: {
    message: 'Compare these two chest X-rays taken 6 weeks apart. Has the pneumonia improved?',
    images: [baselineXray, followUpXray], // Order matters!
    analysisType: 'longitudinal',
    userRole: 'radiologist'
  }
});
```

**Example 4: Anatomical Localization**
```typescript
const { data } = await supabase.functions.invoke('medgemma-chat', {
  body: {
    message: 'Identify and locate any abnormalities in this chest X-ray',
    images: [xrayBase64],
    analysisType: 'anatomical_localization',
    userRole: 'doctor'
  }
});
// Response will include approximate locations of findings
```

---

### 2. `medgemma-document-analysis` - Lab Report & Document Extraction

**Use Case**: Extract structured data from medical documents (scanned PDFs, images of lab reports, prescriptions, etc.)

**Request Format**:
```typescript
const { data, error } = await supabase.functions.invoke('medgemma-document-analysis', {
  body: {
    document: string,                   // Required: Base64 encoded image of document
    documentType: 'lab_report' | 'prescription' | 'radiology_report' | 'pathology_report' | 'discharge_summary',
    extractFields?: string[],           // Optional: Specific fields to extract
    userRole?: string                   // Optional: 'doctor', 'patient', etc.
  }
});
```

**Response Format**:
```typescript
{
  extractedData: string,                // Structured extraction in text format
  documentType: string,
  timestamp: string,
  model: 'medgemma-1.5-4b-it',
  capabilities: {
    document_understanding: true,
    structured_extraction: true
  }
}
```

**Example 1: Lab Report Extraction**
```typescript
const labReportImage = await convertImageToBase64(labReportFile);

const { data } = await supabase.functions.invoke('medgemma-document-analysis', {
  body: {
    document: labReportImage,
    documentType: 'lab_report',
    extractFields: ['CBC', 'Liver Function', 'Kidney Function'], // Optional: focus on specific tests
    userRole: 'doctor'
  }
});

// data.extractedData will contain:
// Test Name | Result | Unit | Reference Range | Status
// WBC       | 8.5    | k/µL | 4.0-11.0       | Normal
// Hemoglobin| 13.2   | g/dL | 12.0-16.0      | Normal
// ...
```

**Example 2: Prescription Reading**
```typescript
const prescriptionImage = await convertImageToBase64(prescriptionFile);

const { data } = await supabase.functions.invoke('medgemma-document-analysis', {
  body: {
    document: prescriptionImage,
    documentType: 'prescription',
    userRole: 'pharmacist'
  }
});

// data.extractedData will contain:
// Medication: Amoxicillin 500mg
// Dosage: 1 capsule
// Frequency: Three times daily
// Duration: 7 days
// Special Instructions: Take with food
```

**Example 3: Radiology Report**
```typescript
const radiologyReport = await convertImageToBase64(reportFile);

const { data } = await supabase.functions.invoke('medgemma-document-analysis', {
  body: {
    document: radiologyReport,
    documentType: 'radiology_report',
    userRole: 'radiologist'
  }
});
```

---

### 3. `medgemma-3d-imaging` - 3D CT/MRI Volumetric Analysis

**Use Case**: Native 3D analysis of CT/MRI scans by providing multiple slices

**Request Format**:
```typescript
const { data, error } = await supabase.functions.invoke('medgemma-3d-imaging', {
  body: {
    slices: string[],                   // Required: Array of base64 encoded slices (1-50)
    imagingType: 'ct' | 'mri' | 'pet_ct',
    bodyPart: 'head' | 'chest' | 'abdomen' | 'pelvis' | 'spine' | 'extremity' | 'whole_body',
    clinicalQuestion: string,           // Required: What are you looking for?
    sliceOrientation?: 'axial' | 'sagittal' | 'coronal',
    contrastUsed?: boolean,
    userRole?: string
  }
});
```

**Response Format**:
```typescript
{
  analysis: string,                     // Comprehensive 3D analysis
  imagingType: string,
  bodyPart: string,
  sliceCount: number,
  timestamp: string,
  model: 'medgemma-1.5-4b-it',
  capabilities: {
    native_3d_imaging: true,
    volumetric_analysis: true,
    multi_slice_context: true
  }
}
```

**Example 1: Chest CT Analysis**
```typescript
// Load multiple CT slices
const ctSlices = await Promise.all(
  ctSliceFiles.map(file => convertImageToBase64(file))
);

const { data } = await supabase.functions.invoke('medgemma-3d-imaging', {
  body: {
    slices: ctSlices,                   // e.g., 20-30 axial slices
    imagingType: 'ct',
    bodyPart: 'chest',
    clinicalQuestion: 'Rule out pulmonary embolism',
    sliceOrientation: 'axial',
    contrastUsed: true,
    userRole: 'radiologist'
  }
});

// data.analysis will contain:
// 1. Technical Quality Assessment
// 2. Systematic Anatomical Review
// 3. Abnormality Detection and Characterization
// 4. Volumetric/3D Relationships
// 5. Impression and Recommendations
```

**Example 2: Brain MRI Analysis**
```typescript
const mriSlices = await Promise.all(
  mriSliceFiles.map(file => convertImageToBase64(file))
);

const { data } = await supabase.functions.invoke('medgemma-3d-imaging', {
  body: {
    slices: mriSlices,
    imagingType: 'mri',
    bodyPart: 'head',
    clinicalQuestion: 'Evaluate for stroke',
    sliceOrientation: 'axial',
    contrastUsed: false,
    userRole: 'neurologist'
  }
});
```

---

## Frontend Integration Examples

### React Component: Image Upload for Analysis

```typescript
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MedicalImageAnalyzer = () => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedImages(Array.from(e.target.files));
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const analyzeImages = async () => {
    if (selectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setLoading(true);
    try {
      // Convert all images to base64
      const base64Images = await Promise.all(
        selectedImages.map(file => convertToBase64(file))
      );

      // Call MedGemma
      const { data, error } = await supabase.functions.invoke('medgemma-chat', {
        body: {
          message: 'Analyze these medical images and provide a detailed assessment',
          images: base64Images,
          analysisType: selectedImages.length > 1 ? 'longitudinal' : 'general',
          userRole: 'doctor'
        }
      });

      if (error) throw error;

      setAnalysis(data.reply);
      toast.success('Analysis complete');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze images');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="file-input"
        />
        <p className="text-sm text-muted-foreground mt-2">
          {selectedImages.length} image(s) selected (max 10)
        </p>
      </div>

      <button
        onClick={analyzeImages}
        disabled={loading || selectedImages.length === 0}
        className="btn btn-primary"
      >
        {loading ? 'Analyzing...' : 'Analyze Images'}
      </button>

      {analysis && (
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Analysis Results</h3>
          <p className="whitespace-pre-wrap">{analysis}</p>
        </div>
      )}
    </div>
  );
};
```

### React Component: Lab Report Parser

```typescript
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const LabReportParser = () => {
  const [reportImage, setReportImage] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const parseLabReport = async () => {
    if (!reportImage) {
      toast.error('Please upload a lab report');
      return;
    }

    setLoading(true);
    try {
      const base64 = await convertToBase64(reportImage);

      const { data, error } = await supabase.functions.invoke('medgemma-document-analysis', {
        body: {
          document: base64,
          documentType: 'lab_report',
          userRole: 'doctor'
        }
      });

      if (error) throw error;

      setExtractedData(data.extractedData);
      toast.success('Lab report parsed successfully');
    } catch (error) {
      console.error('Parsing error:', error);
      toast.error('Failed to parse lab report');
    } finally {
      setLoading(false);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Upload Lab Report (Image or PDF screenshot)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setReportImage(e.target.files?.[0] || null)}
          className="file-input"
        />
      </div>

      <button
        onClick={parseLabReport}
        disabled={loading || !reportImage}
        className="btn btn-primary"
      >
        {loading ? 'Extracting...' : 'Extract Lab Results'}
      </button>

      {extractedData && (
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Extracted Lab Results</h3>
          <pre className="whitespace-pre-wrap text-sm">{extractedData}</pre>
        </div>
      )}
    </div>
  );
};
```

---

## Image Size Recommendations

**HuggingFace Inference API Limits**:
- Maximum request size: ~10MB
- Recommended image size: 896x896 (MedGemma's native resolution)
- Maximum images per request: 10

**Optimization Tips**:
1. Resize images to 896x896 before base64 encoding
2. Use JPEG compression (quality 85-95) for large images
3. For 3D imaging, send 20-30 representative slices rather than all slices

```typescript
// Helper: Resize image to 896x896
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = () => {
      canvas.width = 896;
      canvas.height = 896;
      ctx.drawImage(img, 0, 0, 896, 896);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.src = URL.createObjectURL(file);
  });
};
```

---

## Error Handling

All edge functions return standard error responses:

```typescript
try {
  const { data, error } = await supabase.functions.invoke('medgemma-chat', { body });
  
  if (error) {
    if (error.status === 429) {
      toast.error('Rate limit exceeded. Please try again later.');
    } else if (error.status === 503) {
      toast.error('HF_TOKEN not configured. Contact support.');
    } else {
      toast.error(`Error: ${error.message}`);
    }
    return;
  }

  // Success
  console.log(data);
} catch (err) {
  console.error('Unexpected error:', err);
  toast.error('An unexpected error occurred');
}
```

---

## Best Practices

### 1. Image Quality
- Use high-resolution medical images (at least 512x512)
- Ensure proper contrast and brightness
- Avoid heavily compressed or watermarked images

### 2. Longitudinal Analysis
- Provide images in chronological order
- Include dates/context in the prompt
- Use consistent imaging modality and view

### 3. Clinical Context
- Always provide relevant clinical history
- Specify what you're looking for
- Include patient demographics if relevant

### 4. User Roles
- Use `userRole: 'doctor'` for detailed clinical terminology
- Use `userRole: 'patient'` for simplified explanations
- Use `userRole: 'radiologist'` for imaging specialists

### 5. Rate Limiting
- Cache responses when possible
- Debounce user inputs
- Show loading states
- Handle 429 errors gracefully

---

## Privacy & Security

**MedGemma 1.5 4B Privacy Features**:
- ✅ Can run offline (local deployment option)
- ✅ No data retention by default on HuggingFace
- ✅ Images processed in-request only
- ✅ JWT authentication required (verify_jwt = true)

**HIPAA Compliance Considerations**:
- Always use HTTPS
- Authenticate all requests
- Don't log patient data
- Consider local deployment for maximum privacy
- Review HuggingFace's BAA if needed

---

## Performance Tips

1. **Batch Processing**: For multiple documents, process in parallel
2. **Caching**: Cache common queries (e.g., "What is pneumonia?")
3. **Progressive Loading**: Show analysis incrementally if streaming is available
4. **Fallback Strategy**: Use `doc-chat` or `med-ai` if MedGemma fails

---

## Troubleshooting

### Issue: "HF_TOKEN not configured"
**Solution**: Add your HuggingFace token to Supabase secrets:
```bash
supabase secrets set HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx
```

### Issue: "Rate limit exceeded"
**Solution**: 
- Wait and retry
- Upgrade HuggingFace plan
- Implement request queuing
- Use fallback functions

### Issue: "No response generated"
**Solution**:
- Check image size (< 10MB)
- Verify base64 encoding
- Check HuggingFace model status

### Issue: Images not being analyzed
**Solution**:
- Verify images are base64 encoded with data URI prefix: `data:image/jpeg;base64,...`
- Check that `analysisType` is specified
- Ensure images are in supported format (JPEG, PNG)

---

## Next Steps

1. ✅ Test each edge function with sample data
2. ✅ Integrate into your chat interface
3. ✅ Add image upload capabilities
4. ✅ Implement document scanning
5. ✅ Add 3D imaging viewer for CT/MRI
6. ✅ Monitor usage and performance
7. ✅ Consider local deployment for high-volume use

For more details, see:
- [MedGemma 1.5 Model Card](https://huggingface.co/google/medgemma-1.5-4b-it)
- [AI_SETUP.md](../supabase/AI_SETUP.md)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
