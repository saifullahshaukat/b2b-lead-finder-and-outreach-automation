import { Navigate } from 'react-router-dom';

const Index = () => {
  // Redirect to leads page by default
  return <Navigate to="/leads" replace />;
};

export default Index;
