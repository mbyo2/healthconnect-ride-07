import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Users, Shield, UserCheck, Building2 } from 'lucide-react';

interface TestAccount {
  email: string;
  password: string;
  role: string;
  name: string;
}

interface SetupResult {
  email: string;
  success: boolean;
  userId?: string;
  role?: string;
  adminLevel?: string;
  error?: string;
}

export const TestAccountSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SetupResult[]>([]);
  const [credentials, setCredentials] = useState<TestAccount[]>([]);

  const setupTestAccounts = async () => {
    setIsLoading(true);
    setResults([]);
    setCredentials([]);

    try {
      toast.info('Setting up test accounts...', {
        description: 'This may take a few moments'
      });

      const { data, error } = await supabase.functions.invoke('setup-test-accounts', {
        body: {}
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setResults(data.results);
        setCredentials(data.loginCredentials);
        
        const successCount = data.results.filter((r: SetupResult) => r.success).length;
        const totalCount = data.results.length;
        
        toast.success('Test accounts created successfully!', {
          description: `${successCount}/${totalCount} accounts created`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error setting up test accounts:', error);
      toast.error('Failed to set up test accounts', {
        description: error.message || 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'health_personnel':
        return <UserCheck className="h-4 w-4" />;
      case 'institution_admin':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'health_personnel':
        return 'bg-blue-100 text-blue-800';
      case 'institution_admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const copyCredentials = (email: string, password: string) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
    toast.success('Credentials copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Test Account Setup
          </CardTitle>
          <CardDescription>
            Create test accounts for different user roles including admins, health personnel, and patients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={setupTestAccounts} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up accounts...
              </>
            ) : (
              'Create Test Accounts'
            )}
          </Button>
        </CardContent>
      </Card>

      {credentials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Login Credentials</CardTitle>
            <CardDescription>
              Use these credentials to test different user roles. Click on any row to copy the credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {credentials.map((account, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => copyCredentials(account.email, account.password)}
                >
                  <div className="flex items-center gap-3">
                    {getRoleIcon(account.role)}
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-muted-foreground">{account.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor(account.role)}>
                      {account.role.replace('_', ' ')}
                    </Badge>
                    <div className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {account.password}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Results</CardTitle>
            <CardDescription>
              Detailed results of the account creation process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">{result.email}</span>
                    {result.role && (
                      <Badge variant="outline" className="text-xs">
                        {result.role}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm">
                    {result.success ? (
                      <span className="text-green-600">✓ Created</span>
                    ) : (
                      <span className="text-red-600" title={result.error}>
                        ✗ Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};