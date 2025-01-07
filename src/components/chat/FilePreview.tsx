import { FileAttachment } from "@/types/communication";
import { Paperclip } from "lucide-react";

interface FilePreviewProps {
  attachment: FileAttachment;
}

export const FilePreview = ({ attachment }: FilePreviewProps) => {
  return (
    <a
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
    >
      <Paperclip className="h-3 w-3" />
      {attachment.file_name}
    </a>
  );
};