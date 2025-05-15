
import { ChatList } from "@/components/chat/ChatList";
import { useEffect } from "react";
import { Helmet } from "react-helmet";

const Chat = () => {
  // Prefetch chat data when navigation occurs to this page
  useEffect(() => {
    // This serves as a place to prefetch chat data if needed
    // You could potentially use React Query's prefetchQuery here
    const prefetchChatData = async () => {
      // Implementation would go here if needed
    };
    
    prefetchChatData();
    
    return () => {
      // Cleanup if needed when navigating away
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Messages | Doc&apos; O Clock</title>
        <meta name="description" content="Chat with healthcare professionals" />
      </Helmet>
      <div className="container mx-auto py-6 animate-fade-in">
        <h1 className="text-2xl font-bold mb-4 text-trust-700 dark:text-trust-300">
          Messages
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-blue">
          <ChatList />
        </div>
      </div>
    </>
  );
};

export default Chat;
