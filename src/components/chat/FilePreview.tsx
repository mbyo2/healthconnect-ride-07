import { FileAttachment } from "@/types/communication";
import { FileText, Image, Paperclip } from "lucide-react";

interface FilePreviewProps {
  attachment: FileAttachment;
}

export const FilePreview = ({ attachment }: FilePreviewProps) => {
  const getFileIcon = () => {
    const extension = attachment.file_name.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      return <Image className="h-3 w-3" />;
    } else if (['pdf', 'txt', 'doc', 'docx'].includes(extension || '')) {
      return <FileText className="h-3 w-3" />;
    }
    return <Paperclip className="h-3 w-3" />;
  };

  return (
    <a
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
    >
      {getFileIcon()}
      {attachment.file_name}
    </a>
  );
};