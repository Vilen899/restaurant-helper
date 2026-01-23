import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useManifest() {
  const location = useLocation();

  useEffect(() => {
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    
    if (!manifestLink) return;

    // Determine which manifest to use based on the current route
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isCashierRoute = location.pathname.startsWith('/cashier') || 
                           location.pathname.startsWith('/pin-login') ||
                           location.pathname === '/';
    
    let manifestPath = '/manifest.json'; // default

    if (isAdminRoute) {
      manifestPath = '/manifest-admin.json';
    } else if (isCashierRoute) {
      manifestPath = '/manifest-cashier.json';
    }

    // Only update if different
    if (manifestLink.href !== window.location.origin + manifestPath) {
      manifestLink.href = manifestPath;
    }
  }, [location.pathname]);
}
