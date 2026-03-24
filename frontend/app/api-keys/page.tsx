import React from 'react';
import ApiKeyManagement from '../../components/ApiKeyManagement';
import Toaster from '../../components/Toaster';

export default function ApiKeysPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <ApiKeyManagement />
    </div>
  );
}
