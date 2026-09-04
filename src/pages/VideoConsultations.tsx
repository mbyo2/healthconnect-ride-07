import { VideoConsultation } from "@/components/video/VideoConsultation";
import { Helmet } from "react-helmet-async";
import { Video, ShieldCheck } from "lucide-react";

const VideoConsultations = () => {
  return (
    <>
      <Helmet>
        <title>Video Consultations | Doc&apos; O Clock</title>
        <meta name="description" content="Connect with healthcare providers through secure telehealth video consultations" />
      </Helmet>
      <div className="min-h-screen bg-canvas py-8 px-4 sm:px-6 font-sans">
        <div className="max-w-content mx-auto space-y-6">
          <div className="vf-card !p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center shadow-button">
                <Video className="h-7 w-7" />
              </div>
              <div>
                <div className="vf-eyebrow mb-2">
                  <Video className="h-3.5 w-3.5 text-accent-500" />
                  Telehealth Suite
                </div>
                <h1 className="font-display text-3xl font-medium tracking-tight text-midnight">Video Consultations</h1>
                <p className="text-sm text-graphite-500 font-medium tracking-wide">
                  End-to-end encrypted virtual doctor visits &amp; telemedicine calls
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-success-50 border border-success-100 text-xs font-medium text-success-500">
              <ShieldCheck className="h-4 w-4" />
              HIPAA / Data Compliant
            </div>
          </div>

          <div className="vf-card overflow-hidden">
            <VideoConsultation />
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoConsultations;
