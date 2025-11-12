import React from 'react';
import { RoleManagement } from '@/components/admin/RoleManagement';
import { Header } from '@/components/Header';

const RoleManagementPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <RoleManagement />
      </main>
    </div>
  );
};

export default RoleManagementPage;
