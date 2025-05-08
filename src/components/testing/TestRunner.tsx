
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, X, AlertCircle, Play } from "lucide-react";

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'auth' | 'appointment' | 'payment' | 'offline' | 'notifications';
  status: 'pending' | 'running' | 'passed' | 'failed';
  errorMessage?: string;
}

export const TestRunner = () => {
  const [tests, setTests] = useState<TestCase[]>([
    {
      id: '1',
      name: 'User Registration',
      description: 'Tests user can register with email and password',
      category: 'auth',
      status: 'pending'
    },
    {
      id: '2',
      name: 'User Login',
      description: 'Tests user can login with valid credentials',
      category: 'auth',
      status: 'pending'
    },
    {
      id: '3',
      name: 'Password Reset Flow',
      description: 'Tests password reset functionality',
      category: 'auth',
      status: 'pending'
    },
    {
      id: '4',
      name: 'Create Appointment',
      description: 'Tests creating a new appointment',
      category: 'appointment',
      status: 'pending'
    },
    {
      id: '5',
      name: 'Edit Appointment',
      description: 'Tests editing an existing appointment',
      category: 'appointment',
      status: 'pending'
    },
    {
      id: '6',
      name: 'Process Payment',
      description: 'Tests payment processing flow',
      category: 'payment',
      status: 'pending'
    },
    {
      id: '7',
      name: 'Offline Data Access',
      description: 'Tests accessing data in offline mode',
      category: 'offline',
      status: 'pending'
    },
    {
      id: '8',
      name: 'Push Notification Permission',
      description: 'Tests requesting notification permission',
      category: 'notifications',
      status: 'pending'
    }
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const runAllTests = () => {
    setIsRunning(true);
    setProgress(0);
    
    // Reset all tests to pending
    setTests(prev => prev.map(test => ({
      ...test,
      status: 'pending',
      errorMessage: undefined
    })));
    
    // Run tests sequentially
    const totalTests = tests.length;
    let currentTestIndex = 0;
    
    const runNextTest = () => {
      if (currentTestIndex >= totalTests) {
        setIsRunning(false);
        setActiveTest(null);
        return;
      }
      
      const testId = tests[currentTestIndex].id;
      setActiveTest(testId);
      
      // Update current test to running
      setTests(prev => prev.map(test => 
        test.id === testId ? { ...test, status: 'running' } : test
      ));
      
      // Simulate test execution time (1-3 seconds)
      const testDuration = Math.floor(Math.random() * 2000) + 1000;
      
      setTimeout(() => {
        // Determine test result (80% pass rate for simulation)
        const passed = Math.random() > 0.2;
        
        // Update test result
        setTests(prev => prev.map(test => 
          test.id === testId ? { 
            ...test, 
            status: passed ? 'passed' : 'failed',
            errorMessage: passed ? undefined : `Error in ${test.name}: Assertion failed`
          } : test
        ));
        
        // Update progress
        currentTestIndex++;
        setProgress(Math.floor((currentTestIndex / totalTests) * 100));
        
        // Run next test
        runNextTest();
      }, testDuration);
    };
    
    runNextTest();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <X className="h-5 w-5 text-red-600" />;
      case 'running':
        return <span className="animate-pulse">⟳</span>;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTestsByCategory = () => {
    const categories = [...new Set(tests.map(test => test.category))];
    return categories.map(category => ({
      category,
      tests: tests.filter(test => test.category === category)
    }));
  };

  const stats = {
    total: tests.length,
    passed: tests.filter(t => t.status === 'passed').length,
    failed: tests.filter(t => t.status === 'failed').length,
    pending: tests.filter(t => t.status === 'pending' || t.status === 'running').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Test Runner</h2>
        
        <div className="flex gap-4">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            variant="default"
          >
            <Play className="mr-2 h-4 w-4" />
            Run All Tests
          </Button>
        </div>
      </div>
      
      {isRunning && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Running tests...</span>
            <span>{progress}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-muted-foreground">Total Tests</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.passed}</p>
              <p className="text-muted-foreground">Passed</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        {getTestsByCategory().map(category => (
          <div key={category.category} className="space-y-2">
            <h3 className="text-lg font-medium capitalize mb-2">
              {category.category} Tests
              <Badge className="ml-2" variant="outline">
                {category.tests.length}
              </Badge>
            </h3>
            
            <div className="space-y-2">
              {category.tests.map(test => (
                <Card key={test.id} className={`
                  ${test.status === 'running' ? 'border-blue-300 bg-blue-50' : ''}
                  ${test.status === 'passed' ? 'border-green-300 bg-green-50' : ''}
                  ${test.status === 'failed' ? 'border-red-300 bg-red-50' : ''}
                `}>
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-base flex items-center justify-between">
                      {test.name}
                      {getStatusIcon(test.status)}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-4 pt-2">
                    <p className="text-sm text-muted-foreground">{test.description}</p>
                  </CardContent>
                  
                  {test.errorMessage && (
                    <CardFooter className="p-4 pt-0">
                      <p className="text-sm text-red-600">{test.errorMessage}</p>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
