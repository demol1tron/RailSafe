import {createContext,useContext,useEffect,useState} from 'react';import {api,tokenStore} from '../api/client';
const AuthContext=createContext(null);
export function AuthProvider({children}){const [user,setUser]=useState(null);const [loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{try{const r=await api.post('/auth/refresh');tokenStore.set(r.data.access_token);const me=await api.get('/auth/me');setUser(me.data)}catch{tokenStore.clear()}finally{setLoading(false)}})()},[]);
  const login=async(email,password)=>{const r=await api.post('/auth/login',{email,password});tokenStore.set(r.data.access_token);const me=await api.get('/auth/me');setUser(me.data);return me.data};
  const register=async(data)=>api.post('/auth/register',data);
  const logout=async()=>{try{await api.post('/auth/logout')}finally{tokenStore.clear();setUser(null)}};
  return <AuthContext.Provider value={{user,setUser,loading,login,register,logout}}>{children}</AuthContext.Provider>}
export const useAuth=()=>useContext(AuthContext);
