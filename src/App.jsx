import { useState, useEffect, useCallback } from 'react';
import { api, tokens } from './api.js';
import { Ctx, ROLES, go, errMsg } from './lib.js';
import {
  Home, Movies, MovieDetail, Theatres, Seats, Ticket, MyBookings,
  Profile, Login, Register, Message, Legal,
} from './pages.jsx';
import Dashboard from './Dashboard.jsx';

function useRoute() {
  const read = () => location.hash.slice(1).split('/').filter(Boolean);
  const [seg, setSeg] = useState(read);
  useEffect(() => {
    const f = () => { setSeg(read()); window.scrollTo(0, 0); };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return seg;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState('');
  const seg = useRoute();

  // Restore the session on first load if we have a token.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (tokens.access || tokens.refresh) {
        try {
          const { user: u } = await api.me();
          if (alive) setUser(u);
        } catch {
          tokens.clear();
        }
      }
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  const toast = useCallback((t) => { setMsg(t); setTimeout(() => setMsg(''), 3200); }, []);

  const afterAuth = (payload) => {
    tokens.set(payload);
    setUser(payload.user);
    const next = sessionStorage.getItem('next');
    sessionStorage.removeItem('next');
    const home = payload.user.role === ROLES.CUSTOMER ? '/' : '/dashboard';
    go(next || home);
  };

  const login = async (email, password) => {
    try { afterAuth(await api.login({ email, password })); return null; }
    catch (e) { return errMsg(e); }
  };
  const register = async (payload) => {
    try { afterAuth(await api.register(payload)); return null; }
    catch (e) { return errMsg(e); }
  };
  const logout = () => { tokens.clear(); setUser(null); go('/'); };

  const isStaff = user && (user.role === ROLES.ADMIN || user.role === ROLES.THEATRE_OWNER);
  const links = [
    ['', 'Home', ''],
    ['movies', 'Movies', 'movies'],
    ['theatres', 'Theatres', 'theatres'],
    ...(user ? [['bookings', 'My bookings', 'bookings'], ['profile', 'Profile', 'profile']] : []),
    ...(isStaff ? [['dashboard', user.role === ROLES.ADMIN ? 'Admin' : 'Dashboard', 'dashboard']] : []),
  ];

  const NeedLogin = () => (
    <Message title="Log in to continue">
      <p>This page is only available to signed-in users.</p>
      <a className="btn" href="#/login" onClick={() => sessionStorage.setItem('next', location.hash.slice(1))}>Log in</a>
    </Message>
  );

  let page;
  if (!ready) {
    page = <div className="wrap page"><p className="muted">Loading…</p></div>;
  } else {
    switch (seg[0]) {
      case 'movies': page = <Movies />; break;
      case 'movie': page = <MovieDetail id={seg[1]} />; break;
      case 'theatres': page = <Theatres />; break;
      case 'seats': page = <Seats id={seg[1]} />; break;
      case 'ticket': page = <Ticket id={seg[1]} />; break;
      case 'bookings': page = user ? <MyBookings /> : <NeedLogin />; break;
      case 'profile': page = user ? <Profile /> : <NeedLogin />; break;
      case 'login': page = <Login />; break;
      case 'register': page = <Register />; break;
      case 'terms': case 'privacy': page = <Legal kind={seg[0]} />; break;
      case 'dashboard':
        page = isStaff ? <Dashboard /> : <Message title="Access denied">This area is for theatre owners and administrators.</Message>;
        break;
      default: page = <Home />;
    }
  }

  return (
    <Ctx.Provider value={{ user, setUser, toast, login, register, logout }}>
      <header className="top"><div className="wrap bar">
        <a className="brand" href="#/">🎬 CurtainCall</a>
        <nav aria-label="Main">
          {links.map(([h, t, k]) => (
            <a key={t} href={'#/' + h} className={k === seg[0] || (k === 'movies' && seg[0] === 'movie') ? 'on' : ''}>{t}</a>
          ))}
        </nav>
        <div className="auth">
          {user
            ? <><span className="who">{user.name.split(' ')[0]}</span><button className="btn ghost sm" onClick={logout}>Log out</button></>
            : <a className="btn sm" href="#/login">Log in</a>}
        </div>
      </div></header>
      <main>{page}</main>
      <footer className="wrap foot"><a href="#/terms">Terms and conditions</a><a href="#/privacy">Privacy</a></footer>
      {msg && <div className="toast" role="status">{msg}</div>}
    </Ctx.Provider>
  );
}
