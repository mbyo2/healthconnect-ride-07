
import { VideoConsultation } from "@/components/video/VideoConsultation";
import { Helmet } from "react-helmet";
import { useEffect } from "react";

const VideoConsultations = () => {
  // Prefetch necessary data when component mounts
  useEffect(() => {
    // Preload video assets or configurations if needed
    const preloadVideoAssets = () => {
      // Implementation would go here
    };

    preloadVideoAssets();
  }, []);

  return (
    <>
      <Helmet>
        <title>Video Consultations | Doc&apos; O Clock</title>
        <meta name="description" content="Connect with healthcare providers through video consultations" />
      </Helmet>
      <div className="container mx-auto py-6 animate-fade-in">
        <h1 className="text-2xl font-bold mb-4 text-foreground">
          Video Consultations
        </h1>
        <div className="bg-card rounded-xl shadow-soft-blue backdrop-blur-sm border border-border">
          <VideoConsultation />
        </div>
      </div>
    </>
  );
};

export default VideoConsultations;
