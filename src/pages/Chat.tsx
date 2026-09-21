
import { ChatList } from "@/components/chat/ChatList";
import { Helmet } from "react-helmet-async";
import { MessageCircle } from "lucide-react";

const Chat = () => {
  return (
    <>
      <Helmet>
        <title>Messages | Doc&apos; O Clock</title>
        <meta name="description" content="Secure chat with your healthcare providers" />
        <link rel="canonical" href="https://doc0clock.online/chat" />
      </Helmet>
      <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
        <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk dark:border-slate-800 px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
          <div className="max-w-content mx-auto flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight">Messages</h1>
              <p className="text-sm text-graphite-500 font-medium tracking-wide">
                Secure chat with your providers — realtime and private
              </p>
            </div>
          </div>
        </div>
        <div className="max-w-content mx-auto px-4 sm:px-6 pt-6 animate-fade-in">
          <div className="vf-card">
            <ChatList />
          </div>
        </div>
      </div>
    </>
  );
};

export default Chat;
