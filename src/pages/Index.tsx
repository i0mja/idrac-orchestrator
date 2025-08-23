// Simple redirect to dashboard - navigation now handled by AppLayout
import { Navigate } from "react-router-dom";

const Index = () => {
  return <Navigate to="/" replace />;
};

export default Index;