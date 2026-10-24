import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateFileUpload } from '@/utils/input-validation';
import { logSecurityEvent, SecurityEvents, uploadRateLimiter } from '@/utils/security-service';

interface FileUploaderProps {
  /**
   * Called with the storage PATH of the uploaded object inside the
   * private `chat-attachments` bucket (`<userId>/<random>.<ext>`) — not a
   * URL. The chat-attachments bucket is private: there is no public URL.
   * Display code resolves the path to a short-lived signed URL at render
   * time (see FilePreview). Legacy rows whose file_url is already a full
   * http(s) URL keep rendering as-is.
   */
  onUploadComplete: (filePath: string, fileName: string) => void;
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

      // Storage RLS on this bucket is folder-scoped: uploads are only
      // allowed under a first path segment equal to the caller's uid.
      // Uploading to the bucket root (the old behaviour) is refused, and
      // getPublicUrl is meaningless on a private bucket — hand back the
      // storage path; readers resolve a signed URL when rendering.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be signed in to upload a file');
        return;
      }

      const rawExt = (file.name.split('.').pop() || '').toLowerCase();
      const fileExt = /^[a-z0-9]{1,10}$/.test(rawExt) ? rawExt : 'bin';
      const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const filePath = `${user.id}/${randomPart}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      onUploadComplete(filePath, file.name);
      toast.success('File uploaded successfully');
      console.log('File uploaded:', { filePath, fileName: file.name });
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
      className="relative min-h-[44px] min-w-[44px]"
      disabled={uploading}
      type="button"
      aria-label="Attach a file to this message"
    >
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileUpload}
        disabled={uploading}
        accept=".jpg,.jpeg,.png,.pdf,.txt"
        aria-label="Choose a file to attach"
      />
      <Upload className="h-4 w-4" />
    </Button>
  );
};