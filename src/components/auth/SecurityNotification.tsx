import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SecurityNotificationProps {
  onDismiss?: () => void;
}

export const SecurityNotification = ({ onDismiss }: SecurityNotificationProps) => {
  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <Shield className="h-5 w-5" />
          Security Enhanced
        </CardTitle>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          Your application security has been upgraded with new protection measures.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Security Improvements Applied</AlertTitle>
          <AlertDescription className="space-y-2">
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Enhanced user profile access controls</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Removed hardcoded admin credentials</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Secured PayPal webhook verification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Added role change audit logging</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Restricted sensitive data access</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            Please enable leaked password protection in your Supabase Authentication settings to complete the security enhancement.
          </AlertDescription>
        </Alert>

        {onDismiss && (
          <Button 
            onClick={onDismiss}
            variant="outline" 
            size="sm"
            className="w-full"
          >
            Acknowledge Security Update
          </Button>
        )}
      </CardContent>
    </Card>
  );
};