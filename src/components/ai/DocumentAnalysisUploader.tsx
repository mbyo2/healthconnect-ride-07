import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

type DocumentType = 'lab_report' | 'prescription' | 'radiology_report' | 'pathology_report' | 'discharge_summary';

export const DocumentAnalysisUploader = () => {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('lab_report');
  const [extractedData, setExtractedData] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (photo or scan of document)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedDocument(base64);
      toast.success('Document uploaded');
    };
    reader.readAsDataURL(file);
  };

  const analyzeDocument = async () => {
    if (!selectedDocument) {
      toast.error('Please upload a document first');
      return;
    }

    setIsAnalyzing(true);
    setExtractedData('');

    try {
      const { data, error } = await supabase.functions.invoke('medgemma-document-analysis', {
        body: {
          document: selectedDocument,
          documentType,
          userRole: 'doctor'
        }
      });

      if (error) throw error;

      if (!data || !data.extractedData) {
        throw new Error('No data extracted from document');
      }

      setExtractedData(data.extractedData);
      toast.success('Document analyzed successfully');
    } catch (error) {
      console.error('Document analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearDocument = () => {
    setSelectedDocument(null);
    setExtractedData('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Medical Document
          </CardTitle>
          <CardDescription>
            Upload a photo or scan of lab reports, prescriptions, or medical documents for AI extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Type</label>
            <Select value={documentType} onValueChange={(value: DocumentType) => setDocumentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lab_report">Lab Report</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="radiology_report">Radiology Report</SelectItem>
                <SelectItem value="pathology_report">Pathology Report</SelectItem>
                <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
            {selectedDocument ? (
              <div className="space-y-3">
                <div className="relative inline-block">
                  <img
                    src={selectedDocument}
                    alt="Document preview"
                    className="max-h-64 rounded-lg border"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                    onClick={clearDocument}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Document uploaded</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Upload a document image</p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 5MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDocumentSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Document
                </Button>
              </>
            )}
          </div>

          {/* Analyze Button */}
          <Button
            onClick={analyzeDocument}
            disabled={!selectedDocument || isAnalyzing}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Document...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Extract Data
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Powered by MedGemma 1.5 4B</strong></p>
            <p>• Extracts test names, values, and units from lab reports</p>
            <p>• Reads prescriptions and medication details</p>
            <p>• Processes radiology and pathology reports</p>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted Data</CardTitle>
          <CardDescription>
            Structured medical information extracted from your document
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Analyzing document with MedGemma 1.5 4B...
              </p>
            </div>
          ) : extractedData ? (
            <ScrollArea className="h-[400px] rounded-lg border bg-muted/30 p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">{extractedData}</pre>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Upload and analyze a document to see extracted data here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
