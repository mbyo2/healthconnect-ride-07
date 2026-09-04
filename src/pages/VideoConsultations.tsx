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
      <div className="min-h-screen bg-[#f5f7fa] dark:bg-slate-950 py-8 px-4 sm:px-6 font-sans">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="rounded-3xl bg-[#0f172a] text-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[#0073ea] text-white flex items-center justify-center font-black shadow-md">
                <Video className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Telehealth Suite</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">Video Consultations</h1>
                <p className="text-xs text-slate-400 font-medium">
                  End-to-end encrypted virtual doctor visits &amp; telemedicine calls
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-extrabold text-slate-300">
              <ShieldCheck className="h-4 w-4 text-[#00a86b]" />
              HIPAA / Data Compliant
            </div>
          </div>

          <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm overflow-hidden">
            <VideoConsultation />
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoConsultations;
