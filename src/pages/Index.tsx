import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    // Cashier app - redirect to PIN login
    navigate('/pin', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent" />
    </div>
  );
}
