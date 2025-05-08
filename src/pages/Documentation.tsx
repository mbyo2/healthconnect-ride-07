
import React, { useState } from 'react';
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('user');

  const features = [
    {
      id: 'appointment',
      title: 'Appointments',
      description: 'Schedule, manage, and track healthcare appointments',
      items: [
        { title: 'Scheduling an appointment', content: 'Select a healthcare provider from the search or providers page. Choose an available date and time slot. Fill in appointment details and confirm your booking.' },
        { title: 'Canceling appointments', content: 'Navigate to the Appointments page. Find the appointment you wish to cancel. Click the cancel button and confirm your cancellation. Note that some providers may have cancellation policies.' },
        { title: 'Setting reminders', content: 'When booking or viewing an appointment, enable notifications to receive reminders. You can customize reminder timing in your notification settings.' }
      ]
    },
    {
      id: 'video',
      title: 'Video Consultations',
      description: 'Connect with healthcare providers through secure video calls',
      items: [
        { title: 'Starting a video consultation', content: 'Make sure you have a camera and microphone enabled on your device. Join the video call 5 minutes before the scheduled time. Grant permission for camera and microphone access when prompted.' },
        { title: 'Technical requirements', content: 'Supported browsers: Chrome, Firefox, Safari, Edge (latest versions). Minimum internet speed: 1 Mbps upload/download. Camera and microphone access required.' },
        { title: 'Troubleshooting connection issues', content: 'Refresh the page if video/audio isn\'t working. Check your internet connection. Ensure your camera and microphone are not being used by other applications.' }
      ]
    },
    {
      id: 'offline',
      title: 'Offline Access',
      description: 'Access key features even without internet connection',
      items: [
        { title: 'Using the app offline', content: 'Key information is automatically cached for offline access. When offline, you can view previously loaded appointments, medication information, and your profile data.' },
        { title: 'Syncing when back online', content: 'Changes made while offline are queued for synchronization. When you regain internet connection, the app will automatically sync pending changes.' },
        { title: 'Limitations in offline mode', content: 'Video consultations, real-time messaging, and new appointment booking require an internet connection. Payment processing is unavailable in offline mode.' }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Stay informed about appointments, messages, and updates',
      items: [
        { title: 'Enabling notifications', content: 'In the Settings page, navigate to Notification Preferences. Enable the types of notifications you wish to receive. Grant notification permissions when prompted by your browser.' },
        { title: 'Managing notification preferences', content: 'Customize which notifications you receive for appointments, messages, prescription updates, and system announcements.' },
        { title: 'Troubleshooting notifications', content: 'If you\'re not receiving notifications, check your browser and device settings to ensure notifications are allowed for this website.' }
      ]
    },
    {
      id: 'payment',
      title: 'Payments & Billing',
      description: 'Securely manage payments for healthcare services',
      items: [
        { title: 'Payment methods', content: 'Add and manage payment methods in the Wallet section. The system supports credit/debit cards and digital wallets.' },
        { title: 'Viewing receipts', content: 'Access your payment history in the Wallet section. Download or print receipts for completed payments.' },
        { title: 'Insurance information', content: 'Add your insurance details in your profile to automatically apply coverage to eligible services.' }
      ]
    },
  ];

  const devDocs = [
    {
      id: 'architecture',
      title: 'Architecture Overview',
      content: 'The application is built with React, TypeScript and uses Vite as the build tool. Authentication is handled via Supabase Auth. The UI is built with Shadcn UI components and styled with Tailwind CSS. Data fetching is managed with TanStack Query. The application supports offline capabilities using IndexedDB and a Service Worker.'
    },
    {
      id: 'authentication',
      title: 'Authentication System',
      content: 'Authentication is implemented using Supabase Auth. The system supports email/password login, social logins, and email verification. User sessions are managed through the AuthContext provider. User profiles are stored in the "profiles" table and are automatically created on new user registration.'
    },
    {
      id: 'offline',
      title: 'Offline Support',
      content: 'Offline support is implemented using a combination of: Service Worker for caching static assets, IndexedDB for storing application data, and a queuing system for offline actions. The useOfflineMode hook provides access to offline functionality throughout the app. When connectivity is restored, queued actions are automatically synchronized.'
    },
    {
      id: 'notifications',
      title: 'Push Notifications',
      content: 'Push notifications are implemented using the Web Push API. Notification permissions are requested when users opt-in. Notification preferences are stored in the notification_settings table. Server-sent notifications are processed through Supabase Edge Functions. A background sync mechanism ensures delivery of notifications even when the app is closed.'
    },
    {
      id: 'data-models',
      title: 'Data Models',
      content: 'Key data models include: User profiles, Healthcare providers, Appointments, Prescriptions, Medications, Chat messages, Payment records, and Notification settings. All models are defined in TypeScript interfaces and mapped to Supabase tables. The main relationship diagram is available in the project documentation.'
    },
    {
      id: 'ui-components',
      title: 'UI Component Library',
      content: 'The UI is built using Shadcn UI components, which are based on Radix UI primitives. Custom components extend this library for domain-specific needs. All components are accessible and responsive by default. Component documentation is available in the components/ directory.'
    },
  ];

  const filteredFeatures = searchQuery 
    ? features.map(category => ({
        ...category,
        items: category.items.filter(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          item.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.items.length > 0)
    : features;

  const filteredDevDocs = searchQuery
    ? devDocs.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : devDocs;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-20 pb-24">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Documentation</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive guides for users and developers
          </p>
          
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documentation..."
              className="pl-8 w-full max-w-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <Tabs defaultValue="user" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="user">User Documentation</TabsTrigger>
            <TabsTrigger value="developer">Developer Documentation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="user">
            {filteredFeatures.length > 0 ? (
              <div className="space-y-8">
                {filteredFeatures.map(category => (
                  <Card key={category.id}>
                    <CardHeader>
                      <CardTitle>{category.title}</CardTitle>
                      <p className="text-muted-foreground">{category.description}</p>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {category.items.map((item, index) => (
                          <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="text-left">
                              {item.title}
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="text-muted-foreground">{item.content}</p>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No documentation found for "{searchQuery}"</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="developer">
            {filteredDevDocs.length > 0 ? (
              <div className="space-y-8">
                {filteredDevDocs.map((doc, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle>{doc.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-line">{doc.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No documentation found for "{searchQuery}"</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Documentation;
