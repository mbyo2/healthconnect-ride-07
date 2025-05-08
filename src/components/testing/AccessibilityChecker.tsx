
import React, { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, X, Info } from "lucide-react";

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  element: string;
  description: string;
  suggestion: string;
}

export const AccessibilityChecker = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [completed, setCompleted] = useState(false);

  const runAccessibilityCheck = () => {
    setIsChecking(true);
    setIssues([]);
    setCompleted(false);

    // Simulate accessibility checking process
    setTimeout(() => {
      // This would normally be replaced with actual accessibility checking logic
      // For now we're just generating sample issues for demonstration
      const sampleIssues: AccessibilityIssue[] = [
        {
          type: 'error',
          element: 'img',
          description: 'Images missing alt text',
          suggestion: 'Add descriptive alt text to all images'
        },
        {
          type: 'warning',
          element: 'button',
          description: 'Button lacks accessible name',
          suggestion: 'Add aria-label or visible text to button'
        },
        {
          type: 'error',
          element: 'a',
          description: 'Links with generic text like "click here"',
          suggestion: 'Use descriptive link text that explains where the link goes'
        },
        {
          type: 'info',
          element: 'form',
          description: 'Form fields missing labels',
          suggestion: 'Add explicit labels for all form fields'
        },
        {
          type: 'warning',
          element: 'heading',
          description: 'Heading structure is not sequential',
          suggestion: 'Ensure heading levels are properly nested (h1 > h2 > h3)'
        }
      ];
      
      setIssues(sampleIssues);
      setIsChecking(false);
      setCompleted(true);
    }, 2000);
  };

  const getIssueIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const issuesByType = {
    error: issues.filter(issue => issue.type === 'error'),
    warning: issues.filter(issue => issue.type === 'warning'),
    info: issues.filter(issue => issue.type === 'info')
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Accessibility Checker</h2>
        <Button 
          onClick={runAccessibilityCheck} 
          disabled={isChecking}
        >
          {isChecking ? 'Checking...' : 'Run Accessibility Check'}
        </Button>
      </div>

      {isChecking && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <span className="ml-3 text-lg font-medium">Checking accessibility...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {completed && issues.length === 0 && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">All checks passed!</AlertTitle>
          <AlertDescription className="text-green-700">
            No accessibility issues were detected.
          </AlertDescription>
        </Alert>
      )}

      {completed && issues.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 text-red-700 font-medium px-3 py-1 rounded-full text-sm">
              {issuesByType.error.length} Errors
            </div>
            <div className="bg-yellow-100 text-yellow-700 font-medium px-3 py-1 rounded-full text-sm">
              {issuesByType.warning.length} Warnings
            </div>
            <div className="bg-blue-100 text-blue-700 font-medium px-3 py-1 rounded-full text-sm">
              {issuesByType.info.length} Info
            </div>
          </div>
          
          <Accordion type="single" collapsible className="w-full">
            {issues.map((issue, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="hover:bg-muted/50 px-4 py-2 rounded-t-md">
                  <div className="flex items-center text-left">
                    <span className="mr-3">{getIssueIcon(issue.type)}</span>
                    <span>{issue.description}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted/20 px-4 py-3 rounded-b-md">
                  <div className="space-y-2">
                    <p><strong>Element:</strong> {`<${issue.element}>`}</p>
                    <p><strong>Suggestion:</strong> {issue.suggestion}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
};
