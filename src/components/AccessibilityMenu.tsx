import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Accessibility, 
  Volume2, 
  VolumeX, 
  Plus, 
  Minus, 
  RotateCcw, 
  Eye,
  Palette
} from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTheme } from '@/hooks/use-theme';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const AccessibilityMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    speakContent, 
    isSpeaking, 
    stopSpeaking,
    increaseTextSize,
    decreaseTextSize,
    resetTextSize,
    textSize,
    enableEasyReading,
    disableEasyReading,
    isEasyReadingEnabled,
    isScreenReaderEnabled,
    setScreenReaderEnabled
  } = useAccessibility();
  
  const { theme, setTheme } = useTheme();

  const handleTextToSpeech = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakContent("Welcome to the accessibility menu. Here you can adjust settings to make the app easier to use.");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="fixed bottom-20 right-4 z-40 bg-background/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200"
          aria-label="Open accessibility menu"
        >
          <Accessibility className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl font-semibold">Accessibility Settings</SheetTitle>
          <SheetDescription>
            Adjust these settings to make the app easier to use, especially when you're not feeling well.
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Text Size Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Text Size
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Current size: {Math.round(textSize * 100)}%
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetTextSize}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="touch"
                  onClick={decreaseTextSize}
                  disabled={textSize <= 0.8}
                  className="flex-1"
                >
                  <Minus className="h-4 w-4 mr-1" />
                  Smaller
                </Button>
                <Button
                  variant="outline"
                  size="touch"
                  onClick={increaseTextSize}
                  disabled={textSize >= 1.5}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Larger
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Easy Reading Mode */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Easy Reading Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="easy-reading">Enable easy reading</Label>
                  <p className="text-xs text-muted-foreground">
                    Larger text, more spacing, easier to read when sick
                  </p>
                </div>
                <Switch
                  id="easy-reading"
                  checked={isEasyReadingEnabled}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      enableEasyReading();
                    } else {
                      disableEasyReading();
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Voice Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Voice Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="screen-reader">Screen reader mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Enhanced announcements and keyboard navigation
                  </p>
                </div>
                <Switch
                  id="screen-reader"
                  checked={isScreenReaderEnabled}
                  onCheckedChange={setScreenReaderEnabled}
                />
              </div>
              
              <Button
                variant="outline"
                size="touch"
                onClick={handleTextToSpeech}
                className="w-full"
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="h-4 w-4 mr-2" />
                    Stop Speaking
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 mr-2" />
                    Test Voice
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Theme Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Display Theme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className="text-xs"
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className="text-xs"
                >
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                  className="text-xs"
                >
                  Auto
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Skip to content:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs">Alt + 1</code>
              </div>
              <div className="flex justify-between">
                <span>Help shortcuts:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs">Alt + 2</code>
              </div>
              <div className="flex justify-between">
                <span>Toggle voice:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs">Alt + 3</code>
              </div>
              <div className="flex justify-between">
                <span>Text size +/-:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs">Alt + / -</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};