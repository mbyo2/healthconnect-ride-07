import { Navigate } from 'react-router-dom';

const Register = () => {
  return <Navigate to="/auth?tab=signup" replace />;
};

export default Register;
