
import React from 'react';
import AuthForm from "@/components/auth/AuthForm";
import { Header } from "@/components/Header";

const Register = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-20 pb-24">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
          <AuthForm mode="register" />
        </div>
      </div>
    </div>
  );
};

export default Register;
