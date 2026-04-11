import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

const DestinationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/destinations-gallery" replace />;
  }

  return <Navigate to={`/destinations-template/${encodeURIComponent(id)}`} replace />;
};

export default DestinationDetailPage;
