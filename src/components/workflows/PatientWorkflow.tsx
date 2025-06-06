
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, MessageSquare, User, FileText, CreditCard, CheckCircle, ArrowRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const PatientWorkflow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const getWorkflowSteps = () => {
    const isProfileComplete = userProfile?.is_profile_complete || false;
    
    return [
      {
        id: 1,
        title: "Complete Your Profile",
        description: "Set up your personal and medical information to get personalized care",
        icon: <User className="h-6 w-6" />,
        action: () => navigate('/profile-setup'),
        completed: isProfileComplete,
        urgent: !isProfileComplete,
        estimatedTime: "5 min"
      },
      {
        id: 2,
        title: "Report Your Symptoms", 
        description: "Tell us how you're feeling to get the right care recommendations",
        icon: <FileText className="h-6 w-6" />,
        action: () => navigate('/symptoms'),
        completed: false,
        urgent: false,
        estimatedTime: "3 min"
      },
      {
        id: 3,
        title: "Find Healthcare Providers",
        description: "Search and discover qualified doctors and specialists near you",
        icon: <Search className="h-6 w-6" />,
        action: () => navigate('/search'),
        completed: false,
        urgent: false,
        estimatedTime: "10 min"
      },
      {
        id: 4,
        title: "Book Your Appointment",
        description: "Schedule a convenient time with your chosen healthcare provider",
        icon: <Calendar className="h-6 w-6" />,
        action: () => navigate('/appointments'),
        completed: false,
        urgent: false,
        estimatedTime: "5 min"
      },
      {
        id: 5,
        title: "Set Up Payment Methods",
        description: "Add your payment information for easy billing and transactions",
        icon: <CreditCard className="h-6 w-6" />,
        action: () => navigate('/payments'),
        completed: false,
        urgent: false,
        estimatedTime: "7 min"
      },
      {
        id: 6,
        title: "Connect & Communicate",
        description: "Chat securely with your healthcare providers and get support",
        icon: <MessageSquare className="h-6 w-6" />,
        action: () => navigate('/chat'),
        completed: false,
        urgent: false,
        estimatedTime: "2 min"
      }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const workflowSteps = getWorkflowSteps();
  const completedSteps = workflowSteps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / workflowSteps.length) * 100;
  const userName = userProfile?.first_name || 'there';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          Your Healthcare Journey
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
          Welcome {userName} to Doc' O Clock
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Follow these simple steps to get the most out of your healthcare experience. 
          Each step takes just a few minutes to complete.
        </p>
        
        {/* Progress Bar */}
        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{completedSteps} of {workflowSteps.length} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-orange-400 to-orange-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Quick Actions for Urgent Steps */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-orange-800 mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Get Started Now
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {workflowSteps.filter(step => step.urgent || step.id <= 3).map((step) => (
            <Button
              key={step.id}
              onClick={step.action}
              variant="outline"
              className="justify-between p-4 h-auto text-left border-orange-200 hover:border-orange-300 hover:bg-orange-50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                  {step.icon}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{step.title}</div>
                  <div className="text-sm text-gray-600">{step.estimatedTime}</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-orange-600" />
            </Button>
          ))}
        </div>
      </div>

      {/* All Steps Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Complete Your Setup</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workflowSteps.map((step) => (
            <Card 
              key={step.id} 
              className="relative hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
              onClick={step.action}
            >
              {step.urgent && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600">
                  Start Here
                </Badge>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl transition-colors duration-200 ${
                      step.completed 
                        ? 'bg-green-100 text-green-600' 
                        : step.urgent 
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                    }`}>
                      {step.completed ? <CheckCircle className="h-6 w-6" /> : step.icon}
                    </div>
                    <div className="text-lg font-bold text-gray-400">
                      {step.id.toString().padStart(2, '0')}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {step.estimatedTime}
                  </Badge>
                </div>
                <CardTitle className="text-lg group-hover:text-orange-600 transition-colors">
                  {step.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <CardDescription className="text-gray-600 leading-relaxed">
                  {step.description}
                </CardDescription>
                
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    step.action();
                  }}
                  className="w-full group-hover:bg-orange-600 transition-colors"
                  variant={step.completed ? "outline" : "default"}
                >
                  {step.completed ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Review & Edit
                    </>
                  ) : (
                    <>
                      {step.urgent ? "Start Now" : "Begin Step"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
        <p className="text-gray-600 mb-4">
          Our support team is here to help you every step of the way
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate('/contact')}>
            Contact Support
          </Button>
          <Button variant="outline" onClick={() => navigate('/chat')}>
            Live Chat
          </Button>
        </div>
      </div>
    </div>
  );
};
