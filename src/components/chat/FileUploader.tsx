import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateFileUpload } from '@/utils/input-validation';
import { logSecurityEvent, SecurityEvents, uploadRateLimiter } from '@/utils/security-service';

interface FileUploaderProps {
  onUploadComplete: (fileUrl: string, fileName: string) => void;
}

export const FileUploader = ({ onUploadComplete }: FileUploaderProps) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Rate limiting check
      if (!uploadRateLimiter('user')) {
        toast.error('You are uploading files too quickly. Please wait a moment.');
        return;
      }

      // Enhanced file validation
      const validation = validateFileUpload(file);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file');
        await logSecurityEvent(SecurityEvents.SUSPICIOUS_ACTIVITY, {
          reason: 'invalid_file_upload',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          error: validation.error,
        });
        return;
      }

      // Log successful file upload attempt
      await logSecurityEvent(SecurityEvents.FILE_UPLOAD, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      onUploadComplete(publicUrl, file.name);
      toast.success('File uploaded successfully');
      console.log('File uploaded:', { publicUrl, fileName: file.name });
    } catch (error: any) {
      toast.error('Error uploading file');
      console.error('Error uploading file:', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      disabled={uploading}
      type="button"
    >
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileUpload}
        disabled={uploading}
        accept=".jpg,.jpeg,.png,.pdf,.txt"
      />
      <Upload className="h-4 w-4" />
    </Button>
  );
};