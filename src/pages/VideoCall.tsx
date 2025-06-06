
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { VideoRoom } from '@/components/video/VideoRoom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { logAnalyticsEvent } from '@/utils/analytics-service';

const VideoCall = () => {
  const { roomUrl } = useParams();
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Set user name for video call
    if (user?.user_metadata?.full_name) {
      setUserName(user.user_metadata.full_name);
    } else if (user?.email) {
      setUserName(user.email.split('@')[0]);
    } else {
      setUserName(`User-${Math.floor(Math.random() * 1000)}`);
    }
    
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    
    // Log analytics event
    logAnalyticsEvent('video_call_opened', {
      room: roomUrl,
      user_id: user?.id,
      timestamp: new Date().toISOString()
    });
    
    return () => clearTimeout(timer);
  }, [user, roomUrl]);

  if (!roomUrl) {
    return <div>Invalid room URL</div>;
  }

  return (
    <ProtectedRoute>
      {loading ? (
        <LoadingScreen />
      ) : (
        <VideoRoom 
          roomUrl={roomUrl} 
          userName={userName} 
          onLeave={() => logAnalyticsEvent('video_call_ended', { room: roomUrl })} 
        />
      )}
    </ProtectedRoute>
  );
};

export default VideoCall;
