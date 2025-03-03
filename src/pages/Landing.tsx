
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const Landing = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Healthcare App</h1>
        <div className="space-x-2">
          {isAuthenticated ? (
            <Link to="/search">
              <Button>Find Providers</Button>
            </Link>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center text-center">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
          Your Health, Our Priority
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Connect with healthcare providers, schedule appointments, and manage your health all in one place.
        </p>
        <div className="mt-8 space-x-4">
          {isAuthenticated ? (
            <>
              <Link to="/search">
                <Button size="lg">Find Care</Button>
              </Link>
              <Link to="/profile">
                <Button size="lg" variant="outline">View Profile</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link to="/provider-portal">
                <Button size="lg" variant="outline">For Providers</Button>
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Landing;
