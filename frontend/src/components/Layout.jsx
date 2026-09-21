import {NavLink, Outlet, useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {roleLabel} from '../utils/labels';

const links = [
  ['/dashboard', 'Обзор'],
  ['/map', 'Карта'],
  ['/incidents', 'Инциденты'],
  ['/stations', 'Станции'],
  ['/categories', 'Категории'],
  ['/notifications', 'Уведомления'],
  ['/profile', 'Профиль'],
];

export default function Layout() {
  const {user, logout} = useAuth();
  const navigate = useNavigate();
  const exit = async () => {
    await logout();
    navigate('/login');
  };

  return <div className="shell">
    <aside>
      <div className="brand"><span className="brand-mark">RS</span><div><b>RailSafe</b><small>Ж/д безопасность</small></div></div>
      <nav>
        {links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        {user?.role === 'ADMIN' && <NavLink to="/users">Пользователи</NavLink>}
      </nav>
      <div className="sidebar-user">
        <small>{roleLabel(user?.role)}</small><span>{user?.full_name}</span><button className="ghost" onClick={exit}>Выйти</button>
      </div>
    </aside>
    <main>
      <header><div><b>RailSafe</b><span>Мониторинг железнодорожной безопасности · Новосибирск</span></div><NavLink className="bell" to="/notifications">🔔</NavLink></header>
      <section className="content"><Outlet /></section>
    </main>
  </div>;
}
