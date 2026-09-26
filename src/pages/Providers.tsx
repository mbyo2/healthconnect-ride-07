import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// Legacy route — the provider directory lives at /search. This redirect keeps
// old bookmarks working instead of crashing (the page previously referenced
// an unimported supabase client and had dead "View Profile"/"Book Now"
// buttons with no handlers).
const Providers = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/search', { replace: true });
  }, [navigate]);
  return (
    <>
      <Helmet>
        <title>Find Doctors & Specialists | Doc&apos; O Clock</title>
        <meta name="robots" content="noindex" />
      </Helmet>
    </>
  );
};

export default Providers;
