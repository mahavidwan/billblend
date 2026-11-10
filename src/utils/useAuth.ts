import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useStore } from '../store';
import { triggerGlobalSync } from './cloudSync';

export function useAuth() {
  const cloudUser = useStore(state => state.cloudUser);
  const setCloudUser = useStore(state => state.setCloudUser);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginSuccess = async (tokenResponse: any) => {
    const grantedScopes = tokenResponse.scope || '';
    if (!grantedScopes.includes('drive.appdata')) {
      alert("Permission Denied: You must check the box to allow access to your Google Drive AppData folder.");
      return;
    }
    try {
      setIsLoggingIn(true);
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      
      setCloudUser({
        name: userInfo.name, email: userInfo.email, picture: userInfo.picture,
        accessToken: tokenResponse.access_token,
        tokenExpiry: Date.now() + (tokenResponse.expires_in * 1000),
      });
      
      // Instantly resume auto-sync if they are logging in from the sidebar
      triggerGlobalSync(); 
    } catch (err) { 
      alert("Failed to fetch Google Profile."); 
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 1. Silent JIT Login (Skips selector if email is known)
  const login = useGoogleLogin({
    scope: 'openid profile email https://www.googleapis.com/auth/drive.appdata',
    // @ts-ignore
    login_hint: cloudUser?.email, 
    onSuccess: handleLoginSuccess,
    onError: () => alert("Google Login Failed.")
  });

  // 2. Switch Account Login (Forces Google Account Chooser)
  const switchAccount = useGoogleLogin({
    scope: 'openid profile email https://www.googleapis.com/auth/drive.appdata',
    prompt: 'select_account', 
    onSuccess: handleLoginSuccess,
    onError: () => alert("Account switch canceled.")
  });

  return { login, switchAccount, isLoggingIn };
}