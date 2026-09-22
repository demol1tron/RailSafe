import {createContext, useContext, useEffect, useState} from 'react';
import {api, tokenStore} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({children}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const refresh = await api.post('/auth/refresh');
        tokenStore.set(refresh.data.access_token);
        const me = await api.get('/auth/me');
        setUser(me.data);
      } catch {
        tokenStore.clear();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const finishLogin = async (accessToken) => {
    if (!accessToken) throw new Error('Сервер не вернул access token');
    tokenStore.set(accessToken);
    const me = await api.get('/auth/me');
    setUser(me.data);
    return me.data;
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', {email, password});
    if (response.data.requires_2fa) return response.data;
    await finishLogin(response.data.access_token);
    return response.data;
  };

  const verifyTwoFactor = async (challengeId, code) => {
    const response = await api.post('/auth/2fa/verify', {
      challenge_id: challengeId,
      code,
    });
    return finishLogin(response.data.access_token);
  };

  const register = async (data) => api.post('/auth/register', data);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  };

  return <AuthContext.Provider value={{
    user,
    setUser,
    loading,
    login,
    verifyTwoFactor,
    register,
    logout,
  }}>
    {children}
  </AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
