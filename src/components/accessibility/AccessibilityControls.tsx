import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Volume2,
  Keyboard,
  Mic,
  Palette,
  Type,
  Focus,
  CheckCircle,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { advancedAccessibilityService, AccessibilityPreferences } from '@/utils/advanced-accessibility';
import { useAccessibility } from '@/context/AccessibilityContext';

export const AccessibilityControls: React.FC = () => {
  const { preferences: contextPreferences, updatePreferences: updateContextPreferences } = useAccessibility();
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    advancedAccessibilityService.getPreferences()
  );
  const [voiceControlActive, setVoiceControlActive] = useState(false);
  const [accessibilityReport, setAccessibilityReport] = useState<any>(null);

  useEffect(() => {
    // Generate accessibility report
    const report = advancedAccessibilityService.generateAccessibilityReport();
    setAccessibilityReport(report);
  }, []);

  const handlePreferenceChange = (key: keyof AccessibilityPreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    advancedAccessibilityService.updatePreferences({ [key]: value });

    // Also update context preferences for backward compatibility
    updateContextPreferences({
      highContrast: newPreferences.highContrast,
      largeText: newPreferences.largeText,
      reducedMotion: newPreferences.reducedMotion,
      screenReader: newPreferences.screenReader
    });
  };

  const toggleVoiceControl = () => {
    if (voiceControlActive) {
      advancedAccessibilityService.stopVoiceControl();
      setVoiceControlActive(false);
    } else {
      advancedAccessibilityService.startVoiceControl();
      setVoiceControlActive(true);
    }
  };

  const announceChange = (message: string) => {
    advancedAccessibilityService.announceToScreenReader(message);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>;
  };

  return (
    <div className="space-y-6" role="main" aria-labelledby="accessibility-title">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 id="accessibility-title" className="text-2xl font-bold">
          Accessibility Controls
        </h1>
      </div>

      {/* Accessibility Score */}
      {accessibilityReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Accessibility Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-3xl font-bold ${getScoreColor(accessibilityReport.score)}`}>
                {accessibilityReport.score}/100
              </div>
              {getScoreBadge(accessibilityReport.score)}
            </div>

            {accessibilityReport.issues.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Issues Found:</h3>
                {accessibilityReport.issues.map((issue: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>{issue.description} ({issue.count})</span>
                    <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'}>
                      {issue.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {accessibilityReport.recommendations.length > 0 && (
              <div className="mt-4 space-y-1">
                <h3 className="font-semibold text-sm">Recommendations:</h3>
                {accessibilityReport.recommendations.map((rec: string, index: number) => (
                  <div key={index} className="text-sm text-gray-600">
                    • {rec}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visual Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visual Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="high-contrast" className="text-sm font-medium">
              High Contrast Mode
            </label>
            <Switch
              id="high-contrast"
              checked={preferences.highContrast}
              onCheckedChange={(checked) => {
                handlePreferenceChange('highContrast', checked);
                announceChange(checked ? 'High contrast enabled' : 'High contrast disabled');
                toast.success(`High contrast ${checked ? 'enabled' : 'disabled'}`);
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="large-text" className="text-sm font-medium">
              Large Text
            </label>
            <Switch
              id="large-text"
              checked={preferences.largeText}
              onCheckedChange={(checked) => {
                handlePreferenceChange('largeText', checked);
                announceChange(checked ? 'Large text enabled' : 'Large text disabled');
                toast.success(`Large text ${checked ? 'enabled' : 'disabled'}`);
              }}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="font-size" className="text-sm font-medium">
              Font Size
            </label>
            <Select
              value={preferences.fontSize}
              onValueChange={(value) => {
                handlePreferenceChange('fontSize', value);
                announceChange(`Font size changed to ${value}`);
              }}
            >
              <SelectTrigger id="font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="extra-large">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="color-blindness" className="text-sm font-medium">
              Color Blindness Support
            </label>
            <Select
              value={preferences.colorBlindness}
              onValueChange={(value) => {
                handlePreferenceChange('colorBlindness', value);
                announceChange(`Color blindness filter changed to ${value}`);
              }}
            >
              <SelectTrigger id="color-blindness">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="protanopia">Protanopia (Red-blind)</SelectItem>
                <SelectItem value="deuteranopia">Deuteranopia (Green-blind)</SelectItem>
                <SelectItem value="tritanopia">Tritanopia (Blue-blind)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="focus-indicator" className="text-sm font-medium">
              Focus Indicator Style
            </label>
            <Select
              value={preferences.focusIndicator}
              onValueChange={(value) => {
                handlePreferenceChange('focusIndicator', value);
                announceChange(`Focus indicator changed to ${value}`);
              }}
            >
              <SelectTrigger id="focus-indicator">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="enhanced">Enhanced</SelectItem>
                <SelectItem value="high-contrast">High Contrast</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Motion and Animation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Focus className="h-5 w-5" />
            Motion & Animation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <label htmlFor="reduced-motion" className="text-sm font-medium">
              Reduce Motion
            </label>
            <Switch
              id="reduced-motion"
              checked={preferences.reducedMotion}
              onCheckedChange={(checked) => {
                handlePreferenceChange('reducedMotion', checked);
                announceChange(checked ? 'Motion reduction enabled' : 'Motion reduction disabled');
                toast.success(`Reduced motion ${checked ? 'enabled' : 'disabled'}`);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audio and Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio & Voice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="screen-reader" className="text-sm font-medium">
              Screen Reader Support
            </label>
            <Switch
              id="screen-reader"
              checked={preferences.screenReader}
              onCheckedChange={(checked) => {
                handlePreferenceChange('screenReader', checked);
                announceChange(checked ? 'Screen reader support enabled' : 'Screen reader support disabled');
                toast.success(`Screen reader support ${checked ? 'enabled' : 'disabled'}`);
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="voice-control" className="text-sm font-medium">
                Voice Control
              </label>
              <Button
                id="voice-control"
                variant={voiceControlActive ? "default" : "outline"}
                size="sm"
                onClick={toggleVoiceControl}
                className="flex items-center gap-2"
              >
                <Mic className="h-4 w-4" />
                {voiceControlActive ? 'Stop' : 'Start'}
              </Button>
            </div>
            {voiceControlActive && (
              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                Voice commands: "click", "scroll down", "scroll up", "go back", "search for [term]"
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Navigation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="keyboard-nav" className="text-sm font-medium">
              Enhanced Keyboard Navigation
            </label>
            <Switch
              id="keyboard-nav"
              checked={preferences.keyboardNavigation}
              onCheckedChange={(checked) => {
                handlePreferenceChange('keyboardNavigation', checked);
                announceChange(checked ? 'Enhanced keyboard navigation enabled' : 'Enhanced keyboard navigation disabled');
                toast.success(`Keyboard navigation ${checked ? 'enabled' : 'disabled'}`);
              }}
            />
          </div>

          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>Keyboard Shortcuts:</strong></div>
            <div>• Ctrl+Alt+H: Navigate to next heading</div>
            <div>• Ctrl+Alt+L: Navigate to next landmark</div>
            <div>• Ctrl+Alt+B: Navigate to next button</div>
            <div>• Ctrl+Alt+F: Navigate to next form field</div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              advancedAccessibilityService.announceToScreenReader('Testing screen reader announcement');
            }}
            className="w-full"
          >
            Test Screen Reader
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const report = advancedAccessibilityService.generateAccessibilityReport();
              setAccessibilityReport(report);
              announceChange(`Accessibility scan complete. Score: ${report.score} out of 100`);
            }}
            className="w-full"
          >
            Run Accessibility Scan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
