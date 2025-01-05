import { Database } from './generated';

export type ChatAttachment = Database['public']['Tables']['chat_attachments']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'] & {
  attachments?: ChatAttachment[];
};
export type VideoConsultation = Database['public']['Tables']['video_consultations']['Row'] & {
  provider: {
    first_name: string | null;
    last_name: string | null;
  };
};