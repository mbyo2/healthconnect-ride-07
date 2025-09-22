import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { testAllRoles, generateAccessReport, validatePermissionsConfig, testLandingPages } from '@/utils/roleAccessTest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react';

export const RoleAccessTester: React.FC = () => {
  const { userRole } = useAuth();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [report, setReport] = useState<string>('');
  const [configIssues, setConfigIssues] = useState<string[]>([]);
  const [landingPageTests, setLandingPageTests] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    
    // Simulate async testing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const results = testAllRoles();
    const reportText = generateAccessReport();
    const issues = validatePermissionsConfig();
    const landingTests = testLandingPages();
    
    setTestResults(results);
    setReport(reportText);
    setConfigIssues(issues);
    setLandingPageTests(landingTests);
    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run tests on component mount
    runTests();
  }, []);

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role-Based Access Control Tester</h1>
          <p className="text-muted-foreground">
            Validate role permissions and route access across the application
          </p>
        </div>
        <Button onClick={runTests} disabled={isRunning}>
          <Play className="h-4 w-4 mr-2" />
          {isRunning ? 'Running Tests...' : 'Run Tests'}
        </Button>
      </div>

      {configIssues.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Configuration Issues Found:</strong>
            <ul className="mt-2 list-disc list-inside">
              {configIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
          <TabsTrigger value="landing">Landing Pages</TabsTrigger>
          <TabsTrigger value="report">Full Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testResults.map((suite) => (
              <Card key={suite.role}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {suite.role.toUpperCase()}
                    <Badge variant={suite.failedTests === 0 ? 'default' : 'destructive'}>
                      {suite.failedTests === 0 ? 'PASS' : 'FAIL'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {suite.passedTests}/{suite.totalTests} tests passed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span className={getSuccessRateColor((suite.passedTests / suite.totalTests) * 100)}>
                        {((suite.passedTests / suite.totalTests) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed Tests:</span>
                      <span className="text-red-600">{suite.failedTests}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {testResults.map((suite) => (
            <Card key={suite.role}>
              <CardHeader>
                <CardTitle>{suite.role.toUpperCase()} Role - Detailed Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {suite.results.map((result: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(result.passed)}
                        <code className="text-sm">{result.route}</code>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={result.hasAccess ? 'default' : 'secondary'}>
                          {result.hasAccess ? 'Allowed' : 'Denied'}
                        </Badge>
                        {!result.passed && (
                          <Badge variant="destructive">
                            Expected: {result.expected ? 'Allow' : 'Deny'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="landing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Landing Page Tests</CardTitle>
              <CardDescription>
                Verify that each role's default landing page is accessible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {landingPageTests.map((test, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(test.isValid)}
                      <span className="font-medium">{test.role.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm">{test.landingPage}</code>
                      <Badge variant={test.isValid ? 'default' : 'destructive'}>
                        {test.isValid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>Full Test Report</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded max-h-96 overflow-y-auto">
                {report}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Current User Context</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Badge variant="outline">Role: {userRole || 'Not authenticated'}</Badge>
            <Badge variant="outline">
              Status: {userRole ? 'Authenticated' : 'Not authenticated'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleAccessTester;
