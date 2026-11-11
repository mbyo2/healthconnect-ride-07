import { VideoConsultation } from "@/components/video/VideoConsultation";
import { StatusBadge } from "@/components/ui/status-badge";
import { Helmet } from "react-helmet-async";
import { Video, ShieldCheck } from "lucide-react";

const VideoConsultations = () => {
  return (
    <>
      <Helmet>
        <title>Video Consultations | Doc&apos; O Clock</title>
        <meta name="description" content="Connect with healthcare providers through secure telehealth video consultations" />
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Video consultations</h1>
              <p className="text-sm text-muted-foreground">
                Encrypted virtual doctor visits &amp; telemedicine calls
              </p>
            </div>
          </div>
          <StatusBadge tone="positive" className="gap-1.5 px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure &amp; private
          </StatusBadge>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
          <VideoConsultation />
        </div>
      </div>
    </>
  );
};

export default VideoConsultations;
