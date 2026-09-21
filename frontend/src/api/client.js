import axios from 'axios';
let accessToken=null;let refreshing=null;
export const tokenStore={get:()=>accessToken,set:(v)=>{accessToken=v},clear:()=>{accessToken=null}};
export const api=axios.create({baseURL:import.meta.env.VITE_API_BASE_URL||'/api',withCredentials:true,headers:{'X-Requested-With':'XMLHttpRequest'}});
api.interceptors.request.use((config)=>{if(accessToken)config.headers.Authorization=`Bearer ${accessToken}`;return config});
api.interceptors.response.use(r=>r,async(error)=>{
  const original=error.config;
  if(error.response?.status===401&&!original?._retry&&!original?.url?.includes('/auth/refresh')&&!original?.url?.includes('/auth/login')){
    original._retry=true;
    try{refreshing=refreshing||api.post('/auth/refresh').finally(()=>{refreshing=null});const {data}=await refreshing;tokenStore.set(data.access_token);original.headers.Authorization=`Bearer ${data.access_token}`;return api(original)}catch{tokenStore.clear();if(window.location.pathname!='/login')window.location.assign('/login')}
  }
  return Promise.reject(error)
});
export const errorText=(e)=>{
  const detail=e?.response?.data?.detail;
  if(typeof detail==='string')return detail;
  if(Array.isArray(detail)){
    return detail.map(item=>{
      if(typeof item==='string')return item;
      if(item&&typeof item==='object'){
        const field=Array.isArray(item.loc)?item.loc.filter(x=>x!=='body').join('.') : '';
        return `${field?field+': ':''}${item.msg||'Ошибка валидации'}`;
      }
      return String(item);
    }).join('; ');
  }
  if(detail&&typeof detail==='object')return detail.msg||JSON.stringify(detail);
  if(!e?.response)return 'Сервер недоступен или соединение прервано';
  return `Ошибка запроса (${e.response.status})`;
};
