import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ZoomIn, ZoomOut, RotateCw, Move, Maximize2, Minimize2, 
  Crosshair, Ruler, Pencil, Eraser, Download, Share2
} from 'lucide-react';

interface DigitalSlideViewerProps {
  slideUrl?: string;
  slideName?: string;
  patientName?: string;
  testName?: string;
  magnification?: number;
  onAnnotationSave?: (annotations: Annotation[]) => void;
}

interface Annotation {
  id: string;
  type: 'marker' | 'measurement' | 'region';
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  color: string;
}

const ZOOM_LEVELS = [1, 2, 4, 10, 20, 40, 100];
const STAIN_FILTERS = [
  { value: 'none', label: 'Original' },
  { value: 'h_e', label: 'H&E Enhanced' },
  { value: 'immunohistochemistry', label: 'IHC' },
  { value: 'pas', label: 'PAS' },
  { value: 'gram', label: 'Gram Stain' },
];

export const DigitalSlideViewer: React.FC<DigitalSlideViewerProps> = ({
  slideUrl = '/placeholder.svg',
  slideName = 'Tissue Sample',
  patientName,
  testName,
  magnification = 10,
  onAnnotationSave,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(magnification);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTool, setActiveTool] = useState<'pan' | 'marker' | 'measure' | 'region'>('pan');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [stainFilter, setStainFilter] = useState('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  const handleZoomIn = () => {
    const currentIdx = ZOOM_LEVELS.findIndex(z => z >= zoom);
    if (currentIdx < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[currentIdx + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIdx = ZOOM_LEVELS.findIndex(z => z >= zoom);
    if (currentIdx > 0) {
      setZoom(ZOOM_LEVELS[currentIdx - 1]);
    }
  };

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
  };

  const handleReset = () => {
    setZoom(magnification);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setStainFilter('none');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan') {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    } else if (activeTool === 'marker') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const newAnnotation: Annotation = {
          id: `ann-${Date.now()}`,
          type: 'marker',
          x: ((e.clientX - rect.left - pan.x) / zoom) * 100,
          y: ((e.clientY - rect.top - pan.y) / zoom) * 100,
          color: '#dc2626',
          label: `Marker ${annotations.length + 1}`,
        };
        setAnnotations([...annotations, newAnnotation]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && activeTool === 'pan') {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setPan({ x: pan.x + deltaX, y: pan.y + deltaY });
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      canvasRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const clearAnnotations = () => {
    setAnnotations([]);
  };

  const exportAnnotations = () => {
    const data = JSON.stringify(annotations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slideName.replace(/\s+/g, '_')}_annotations.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilterStyle = () => {
    let filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    
    switch (stainFilter) {
      case 'h_e':
        filter += ' saturate(120%) hue-rotate(-10deg)';
        break;
      case 'immunohistochemistry':
        filter += ' saturate(150%) sepia(20%)';
        break;
      case 'pas':
        filter += ' saturate(130%) hue-rotate(330deg)';
        break;
      case 'gram':
        filter += ' saturate(140%) hue-rotate(240deg)';
        break;
    }
    
    return filter;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {slideName}
              {patientName && <Badge variant="outline">{patientName}</Badge>}
            </CardTitle>
            {testName && <p className="text-sm text-muted-foreground">{testName}</p>}
          </div>
          <Badge className="bg-primary/10 text-primary">{zoom}x</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 border-b flex-wrap">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-r pr-2">
            <Button size="icon" variant="ghost" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Select value={String(zoom)} onValueChange={v => setZoom(Number(v))}>
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZOOM_LEVELS.map(z => (
                  <SelectItem key={z} value={String(z)}>{z}x</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation Tools */}
          <div className="flex items-center gap-1 border-r pr-2">
            <Button
              size="icon"
              variant={activeTool === 'pan' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTool('pan')}
              title="Pan"
            >
              <Move className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleRotate} title="Rotate 90°">
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={toggleFullscreen} title="Fullscreen">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>

          {/* Annotation Tools */}
          <div className="flex items-center gap-1 border-r pr-2">
            <Button
              size="icon"
              variant={activeTool === 'marker' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTool('marker')}
              title="Add Marker"
            >
              <Crosshair className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={activeTool === 'measure' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTool('measure')}
              title="Measure"
            >
              <Ruler className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={activeTool === 'region' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTool('region')}
              title="Draw Region"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={clearAnnotations} title="Clear Annotations">
              <Eraser className="h-4 w-4" />
            </Button>
          </div>

          {/* Image Adjustments */}
          <div className="flex items-center gap-2 border-r pr-2">
            <Select value={stainFilter} onValueChange={setStainFilter}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                {STAIN_FILTERS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export */}
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={exportAnnotations} title="Export Annotations">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleReset}>Reset</Button>
          </div>
        </div>

        {/* Brightness/Contrast sliders */}
        <div className="flex items-center gap-4 p-2 bg-muted/30 text-xs">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-muted-foreground w-16">Brightness</span>
            <Slider
              value={[brightness]}
              onValueChange={([v]) => setBrightness(v)}
              min={50}
              max={150}
              step={5}
              className="flex-1"
            />
            <span className="w-10 text-right">{brightness}%</span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-muted-foreground w-14">Contrast</span>
            <Slider
              value={[contrast]}
              onValueChange={([v]) => setContrast(v)}
              min={50}
              max={150}
              step={5}
              className="flex-1"
            />
            <span className="w-10 text-right">{contrast}%</span>
          </div>
        </div>

        {/* Slide Viewer Canvas */}
        <div
          ref={canvasRef}
          className="relative overflow-hidden bg-black cursor-crosshair"
          style={{ height: isFullscreen ? '100vh' : '500px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-100"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 10}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src={slideUrl}
              alt={slideName}
              className="max-w-none select-none"
              style={{
                filter: getFilterStyle(),
                width: '100%',
                height: 'auto',
              }}
              draggable={false}
            />
          </div>

          {/* Annotations Overlay */}
          {annotations.map(ann => (
            <div
              key={ann.id}
              className="absolute pointer-events-none"
              style={{
                left: `${(ann.x * zoom / 100) + pan.x}px`,
                top: `${(ann.y * zoom / 100) + pan.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {ann.type === 'marker' && (
                <div className="flex flex-col items-center">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                    style={{ backgroundColor: ann.color }}
                  />
                  {ann.label && (
                    <span className="text-[10px] bg-black/70 text-white px-1 rounded mt-1 whitespace-nowrap">
                      {ann.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Scale Bar */}
          <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs">
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5 bg-white" />
              <span>{(100 / zoom).toFixed(1)} µm</span>
            </div>
          </div>

          {/* Mini Map */}
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-black/50 border border-white/30 rounded overflow-hidden">
            <img
              src={slideUrl}
              alt="Overview"
              className="w-full h-full object-cover opacity-70"
            />
            <div
              className="absolute border border-primary bg-primary/20"
              style={{
                width: `${100 / zoom * 10}%`,
                height: `${100 / zoom * 10}%`,
                left: `${50 - (pan.x / 5)}%`,
                top: `${50 - (pan.y / 5)}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
        </div>

        {/* Annotations Panel */}
        {annotations.length > 0 && (
          <div className="p-2 bg-muted/30 border-t">
            <p className="text-xs text-muted-foreground mb-1">Annotations ({annotations.length})</p>
            <div className="flex flex-wrap gap-1">
              {annotations.map(ann => (
                <Badge key={ann.id} variant="outline" className="text-xs">
                  {ann.label || ann.type}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
