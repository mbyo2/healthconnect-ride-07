import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Layers, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

type ImagingType = 'ct' | 'mri' | 'pet_ct';
type BodyPart = 'head' | 'chest' | 'abdomen' | 'pelvis' | 'spine' | 'extremity' | 'whole_body';
type SliceOrientation = 'axial' | 'sagittal' | 'coronal';

export const Imaging3DUploader = () => {
  const [slices, setSlices] = useState<string[]>([]);
  const [imagingType, setImagingType] = useState<ImagingType>('ct');
  const [bodyPart, setBodyPart] = useState<BodyPart>('chest');
  const [sliceOrientation, setSliceOrientation] = useState<SliceOrientation>('axial');
  const [clinicalQuestion, setClinicalQuestion] = useState('');
  const [contrastUsed, setContrastUsed] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSlicesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 50) {
      toast.error('Maximum 50 slices allowed');
      return;
    }

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast.warning('Some non-image files were skipped');
    }

    const oversizedFiles = imageFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Some files exceed 10MB limit');
      return;
    }

    Promise.all(
      imageFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    ).then(base64Slices => {
      setSlices(base64Slices);
      toast.success(`${base64Slices.length} slices uploaded`);
    });
  };

  const analyze3DImaging = async () => {
    if (slices.length === 0) {
      toast.error('Please upload imaging slices first');
      return;
    }

    if (!clinicalQuestion.trim()) {
      toast.error('Please enter a clinical question');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis('');

    try {
      const { data, error } = await supabase.functions.invoke('medgemma-3d-imaging', {
        body: {
          slices,
          imagingType,
          bodyPart,
          clinicalQuestion,
          sliceOrientation,
          contrastUsed,
          userRole: 'doctor'
        }
      });

      if (error) throw error;

      if (!data || !data.analysis) {
        throw new Error('No analysis returned');
      }

      setAnalysis(data.analysis);
      toast.success('3D imaging analyzed successfully');
    } catch (error) {
      console.error('3D imaging analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze imaging');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearSlices = () => {
    setSlices([]);
    setAnalysis('');
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
            <Layers className="h-5 w-5" />
            3D Volumetric Analysis
          </CardTitle>
          <CardDescription>
            Upload CT, MRI, or PET-CT slices for AI-powered volumetric analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Imaging Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Imaging Type</Label>
              <Select value={imagingType} onValueChange={(v: ImagingType) => setImagingType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ct">CT Scan</SelectItem>
                  <SelectItem value="mri">MRI</SelectItem>
                  <SelectItem value="pet_ct">PET-CT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Body Part</Label>
              <Select value={bodyPart} onValueChange={(v: BodyPart) => setBodyPart(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="head">Head/Brain</SelectItem>
                  <SelectItem value="chest">Chest</SelectItem>
                  <SelectItem value="abdomen">Abdomen</SelectItem>
                  <SelectItem value="pelvis">Pelvis</SelectItem>
                  <SelectItem value="spine">Spine</SelectItem>
                  <SelectItem value="extremity">Extremity</SelectItem>
                  <SelectItem value="whole_body">Whole Body</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Orientation & Contrast */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Slice Orientation</Label>
              <Select value={sliceOrientation} onValueChange={(v: SliceOrientation) => setSliceOrientation(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="axial">Axial</SelectItem>
                  <SelectItem value="sagittal">Sagittal</SelectItem>
                  <SelectItem value="coronal">Coronal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="contrast"
                checked={contrastUsed}
                onCheckedChange={(checked) => setContrastUsed(checked === true)}
              />
              <Label htmlFor="contrast" className="text-sm">Contrast Used</Label>
            </div>
          </div>

          {/* Clinical Question */}
          <div className="space-y-2">
            <Label>Clinical Question</Label>
            <Input
              placeholder="e.g., Rule out pulmonary embolism"
              value={clinicalQuestion}
              onChange={(e) => setClinicalQuestion(e.target.value)}
            />
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
            {slices.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {slices.length} slices loaded
                  </Badge>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={clearSlices}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-6 gap-1 max-h-32 overflow-hidden">
                  {slices.slice(0, 12).map((slice, idx) => (
                    <img
                      key={idx}
                      src={slice}
                      alt={`Slice ${idx + 1}`}
                      className="w-full h-12 object-cover rounded border"
                    />
                  ))}
                  {slices.length > 12 && (
                    <div className="w-full h-12 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                      +{slices.length - 12}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center">
                  <Layers className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Upload imaging slices</p>
                  <p className="text-xs text-muted-foreground">
                    Select 1-50 DICOM/image slices (max 10MB each)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSlicesSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select Slices
                </Button>
              </>
            )}
          </div>

          {/* Analyze Button */}
          <Button
            onClick={analyze3DImaging}
            disabled={slices.length === 0 || !clinicalQuestion.trim() || isAnalyzing}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Volumetric Data...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4 mr-2" />
                Analyze 3D Imaging
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Doc' O Clock AI Volumetric Analysis</strong></p>
            <p>• Native 3D understanding across slices</p>
            <p>• Cross-sectional anatomical correlation</p>
            <p>• Pathology detection and measurement</p>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle>Volumetric Analysis</CardTitle>
          <CardDescription>
            AI-generated analysis of your 3D imaging study
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Analyzing {slices.length} slices with MedGemma 1.5 4B...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This may take a moment for volumetric processing
              </p>
            </div>
          ) : analysis ? (
            <ScrollArea className="h-[400px] rounded-lg border bg-muted/30 p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">{analysis}</pre>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Upload imaging slices and provide a clinical question to see analysis
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
