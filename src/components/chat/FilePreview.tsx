import { useEffect, useState } from "react";
import { FileAttachment } from "@/types/communication";
import { FileText, Image, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FilePreviewProps {
  attachment: FileAttachment;
}

/** Signed URLs for chat attachments live for one hour — long enough for a
 * reading session; the link is re-resolved on every mount. */
const SIGNED_URL_TTL_SECONDS = 3600;

export const FilePreview = ({ attachment }: FilePreviewProps) => {
  // Legacy rows store a full public URL in file_url — render those
  // exactly as before. New rows store a storage path inside the private
  // chat-attachments bucket, which must be resolved to a signed URL
  // (read access is enforced by the participant storage policy).
  const isFullUrl = /^https?:\/\//i.test(attachment.file_url);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isFullUrl) return;
    let cancelled = false;
    supabase.storage
      .from('chat-attachments')
      .createSignedUrl(attachment.file_url, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (!cancelled && !error && data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
      });
    return () => { cancelled = true; };
  }, [attachment.file_url, isFullUrl]);

  const getFileIcon = () => {
    const extension = attachment.file_name.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      return <Image className="h-3 w-3" />;
    } else if (['pdf', 'txt', 'doc', 'docx'].includes(extension || '')) {
      return <FileText className="h-3 w-3" />;
    }
    return <Paperclip className="h-3 w-3" />;
  };

  const href = isFullUrl ? attachment.file_url : signedUrl;

  if (!href) {
    // Path-format attachment whose signed URL has not resolved (or was
    // refused): show the name without a dead link.
    return (
      <span className="text-sm flex items-center gap-1 mt-1 opacity-80">
        {getFileIcon()}
        {attachment.file_name}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
    >
      {getFileIcon()}
      {attachment.file_name}
    </a>
  );
};
