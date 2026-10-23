import { useState, useEffect, useContext, useCallback } from 'react';
import { api } from './api.js';
import {
  Ctx, go, clean, strongPw, money, fmtDate, fmtTime, dayStr, isPast,
  rowLabel, ROLES, roleLabel, errMsg,
} from './lib.js';

// ---- tiny building blocks ----

export const Message = ({ title = 'Not found', children }) => (
  <div className="wrap page"><div className="panel narrow"><h2>{title}</h2>{children || <a href="#/movies">Browse movies</a>}</div></div>
);
const Field = ({ label, ...p }) => <label className="f"><span>{label}</span><input {...p} /></label>;
const Spinner = ({ label = 'Loading…' }) => <div className="wrap page"><p className="muted">{label}</p></div>;
const Poster = ({ m, big }) => (
  <div className={'poster' + (big ? ' big' : '')} style={{ '--h': m.hue ?? 220 }}><span>{m.title}</span><small>{m.genre}</small></div>
);
const MovieCard = ({ m }) => (
  <a className="card" href={'#/movie/' + (m._id || m.id)}><Poster m={m} /><h3>{m.title}</h3><p>{m.language}, {m.duration} min</p></a>
);

// Small data hook: run an async loader, expose { data, loading, error, reload }.
function useData(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const reload = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    loader()
      .then((data) => alive && setState({ data, loading: false, error: '' }))
      .catch((e) => alive && setState({ data: null, loading: false, error: errMsg(e) }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => reload(), [reload]);
  return { ...state, reload };
}

// ---- Home ----

export function Home() {
  const { data, loading, error } = useData(() => api.listMovies(), []);
  if (loading) return <Spinner />;
  const movies = data?.movies || [];
  const now = movies.filter((m) => m.status === 'now');
  const soon = movies.filter((m) => m.status === 'upcoming');
  return (<>
    <section className="hero"><div className="wrap">
      <h1>Pick a film.<br />Pick your seat.</h1>
      <p>See what is playing, choose a theatre and showtime, and book your seats in a few taps.</p>
      <a className="btn" href="#/movies">Browse movies</a><a className="btn ghost" href="#/theatres">See theatres</a>
    </div></section>
    <div className="wrap page">
      {error && <p className="err">{error}</p>}
      <h2>Now showing</h2><div className="grid">{now.map((m) => <MovieCard key={m._id} m={m} />)}</div>
      {soon.length > 0 && <><h2>Coming soon</h2><div className="grid">{soon.map((m) => <MovieCard key={m._id} m={m} />)}</div></>}
    </div>
  </>);
}

// ---- Movies list + filters ----

export function Movies() {
  const [q, setQ] = useState(''), [genre, setGenre] = useState(''), [lang, setLang] = useState(''), [av, setAv] = useState('');
  const { data, loading } = useData(() => api.listMovies(), []);
  const movies = data?.movies || [];
  const uniq = (k) => [...new Set(movies.map((m) => m[k]))].sort();
  const list = movies.filter((m) =>
    (!q || (m.title + m.genre + m.desc).toLowerCase().includes(q.toLowerCase())) &&
    (!genre || m.genre === genre) && (!lang || m.language === lang) && (!av || m.status === av));
  return (
    <div className="wrap page">
      <h1>Movies</h1>
      <div className="filters">
        <input type="search" aria-label="Search movies" placeholder="Search by title, genre or keyword" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)}><option value="">All genres</option>{uniq('genre').map((g) => <option key={g}>{g}</option>)}</select>
        <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value)}><option value="">All languages</option>{uniq('language').map((g) => <option key={g}>{g}</option>)}</select>
        <select aria-label="Availability" value={av} onChange={(e) => setAv(e.target.value)}><option value="">All movies</option><option value="now">Now showing</option><option value="upcoming">Upcoming</option></select>
      </div>
      {loading ? <p className="muted">Loading movies…</p>
        : list.length ? <div className="grid">{list.map((m) => <MovieCard key={m._id} m={m} />)}</div>
        : <p className="muted">No movies match these filters. Clear the search or pick another genre.</p>}
    </div>
  );
}

// ---- Movie detail with showtimes ----

export function MovieDetail({ id }) {
  const [day, setDay] = useState(null);
  const { data, loading, error } = useData(async () => {
    const [{ movie }, { shows }] = await Promise.all([api.getMovie(id), api.listShows({ movie: id })]);
    return { movie, shows };
  }, [id]);

  if (loading) return <Spinner />;
  if (error || !data?.movie) return <Message title="Movie not found" />;
  const { movie: m, shows } = data;
  const future = shows.filter((s) => s.date >= dayStr());
  const dates = [...new Set(future.map((s) => s.date))].sort();
  const cur = day || dates[0];
  const groups = {};
  future.filter((s) => s.date === cur).forEach((s) => {
    const key = s.theatre._id;
    (groups[key] = groups[key] || { theatre: s.theatre, list: [] }).list.push(s);
  });

  return (
    <div className="wrap page">
      <div className="detail">
        <Poster m={m} big />
        <div>
          <h1>{m.title}</h1>
          <p className="muted">{m.genre}, {m.language}, {m.duration} min</p>
          <span className={'badge' + (m.status === 'now' ? '' : ' x')}>{m.status === 'now' ? 'Now showing' : 'Upcoming'}</span>
          <p>{m.desc}</p>
        </div>
      </div>
      <h2>Showtimes</h2>
      {!dates.length ? <p className="muted">No shows are scheduled yet. Check back soon.</p> : <>
        <div className="tabs" role="tablist">{dates.map((d) => <button key={d} role="tab" aria-selected={d === cur} className={d === cur ? 'on' : ''} onClick={() => setDay(d)}>{fmtDate(d)}</button>)}</div>
        {Object.values(groups).map(({ theatre, list }) => (
          <section className="panel" key={theatre._id}>
            <h3>{theatre.name} <span className="muted">({theatre.area})</span></h3>
            <div className="slots">{list.sort((a, b) => a.time.localeCompare(b.time)).map((s) => {
              const screen = theatre.screens.find((x) => x._id === s.screenId);
              const cap = screen ? screen.rows * screen.cols : 0;
              const full = (s.takenSeats?.length || 0) >= cap;
              const off = isPast(s) || full;
              return <button key={s._id} className="slot" disabled={off} onClick={() => go('/seats/' + s._id)}>
                <b>{fmtTime(s.time)}</b><small>{screen?.name}, {money(s.price)}</small>{off && <small>{full ? 'Sold out' : 'Show started'}</small>}
              </button>;
            })}</div>
          </section>
        ))}
      </>}
    </div>
  );
}

// ---- Theatres ----

export function Theatres() {
  const { data, loading } = useData(async () => {
    const [{ theatres }, { shows }] = await Promise.all([api.listTheatres(), api.listShows()]);
    return { theatres, shows };
  }, []);
  if (loading) return <Spinner />;
  const { theatres, shows } = data;
  return (
    <div className="wrap page"><h1>Theatres</h1>
      {theatres.map((t) => {
        const movieIds = [...new Set(shows.filter((s) => s.theatre?._id === t._id && s.date >= dayStr()).map((s) => s.movie?._id))];
        const movies = movieIds.map((id) => shows.find((s) => s.movie?._id === id)?.movie).filter(Boolean);
        return (
          <section className="panel" key={t._id}>
            <h2>{t.name}</h2><p className="muted">{t.area}</p>
            <ul className="plain">{t.screens.map((s) => <li key={s._id}>{s.name}: {s.rows * s.cols} seats</li>)}</ul>
            <h3>Playing here</h3>
            {movies.length ? <p>{movies.map((m) => <a key={m._id} className="chip" href={'#/movie/' + m._id}>{m.title}</a>)}</p> : <p className="muted">No upcoming shows.</p>}
          </section>
        );
      })}
    </div>
  );
}

// ---- Seat selection + booking ----

export function Seats({ id }) {
  const { user, toast } = useContext(Ctx);
  const [sel, setSel] = useState([]), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const { data, loading, error, reload } = useData(() => api.getShow(id), [id]);

  if (loading) return <Spinner />;
  if (error || !data?.show) return <Message title="Show not found" />;
  const show = data.show;
  const m = show.movie, theatre = show.theatre, screen = show.screen;
  const taken = new Set(show.takenSeats || []);
  const past = isPast(show);

  const toggle = (c) => {
    setErr('');
    if (sel.includes(c)) setSel(sel.filter((x) => x !== c));
    else if (sel.length >= 6) setErr('You can book up to 6 seats at a time.');
    else setSel([...sel, c]);
  };

  const book = async () => {
    if (!user) { sessionStorage.setItem('next', '/seats/' + id); go('/login'); return; }
    setBusy(true); setErr('');
    try {
      const { booking } = await api.createBooking({ show: id, seats: sel });
      toast('Booking confirmed.');
      go('/ticket/' + (booking._id || booking.id));
    } catch (e) {
      setErr(errMsg(e));
      setSel([]);
      reload(); // refresh taken seats in case someone else booked
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap page">
      <h1>{m.title}</h1>
      <p className="muted">{theatre.name}, {screen?.name}, {fmtDate(show.date)} at {fmtTime(show.time)}</p>
      <div className="book">
        <div className="panel">
          <div className="screen">Screen this way</div>
          <div className="seatmap" role="group" aria-label="Seat map">
            {Array.from({ length: screen.rows }, (_, r) => (
              <div className="seatrow" key={r}><i>{rowLabel(r)}</i>
                {Array.from({ length: screen.cols }, (_, c) => {
                  const code = rowLabel(r) + (c + 1);
                  const st = taken.has(code) ? 'taken' : sel.includes(code) ? 'sel' : 'free';
                  return <button key={code} aria-label={`Seat ${code}, ${st === 'taken' ? 'booked' : st === 'sel' ? 'selected' : 'available'}`}
                    className={'seat ' + st + (c + 1 === Math.ceil(screen.cols / 2) ? ' gap' : '')} disabled={st === 'taken' || past} onClick={() => toggle(code)}>{st === 'taken' ? '×' : c + 1}</button>;
                })}
              </div>
            ))}
          </div>
          <div className="legend"><span>Available</span><span className="s">Selected</span><span className="t">Booked</span></div>
        </div>
        <aside className="panel sum">
          <h3>Your booking</h3>
          <dl><dt>Seats</dt><dd>{sel.length ? [...sel].sort().join(', ') : 'None yet'}</dd><dt>Tickets</dt><dd>{sel.length}</dd><dt>Price each</dt><dd>{money(show.price)}</dd></dl>
          <p className="total">{money(sel.length * show.price)}</p>
          {past && <p className="err">This show has already started.</p>}
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn" disabled={!sel.length || busy || past} onClick={book}>{busy ? 'Confirming your seats…' : user ? `Book ${sel.length || ''} seat${sel.length === 1 ? '' : 's'}` : 'Log in to book'}</button>
        </aside>
      </div>
    </div>
  );
}

// ---- Ticket ----

export function Ticket({ id }) {
  const { data, loading, error } = useData(() => api.getBooking(id), [id]);
  if (loading) return <Spinner />;
  if (error || !data?.booking) return <Message title="Booking not found">You can only view your own bookings.</Message>;
  const b = data.booking;
  const s = b.show, m = s?.movie, theatre = s?.theatre;
  const screen = theatre?.screens?.find((x) => x._id === s?.screenId);
  return (
    <div className="wrap page">
      <h1>{b.status === 'confirmed' ? 'You are booked' : 'Booking cancelled'}</h1>
      <div className="ticket">
        <div className="main">
          <h2>{m?.title}</h2>
          <dl><dt>Theatre</dt><dd>{theatre?.name}, {screen?.name}</dd><dt>Date</dt><dd>{s && fmtDate(s.date)}</dd><dt>Time</dt><dd>{s && fmtTime(s.time)}</dd>
            <dt>Seats</dt><dd>{b.seats.join(', ')}</dd><dt>Tickets</dt><dd>{b.seats.length}</dd><dt>Total</dt><dd>{money(b.total)}</dd></dl>
        </div>
        <div className="stub"><span className="muted">Booking ID</span><b>{b.code}</b><span className={'badge' + (b.status === 'confirmed' ? '' : ' x')}>{b.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</span></div>
      </div>
      <a className="btn ghost" href="#/bookings">My bookings</a>
    </div>
  );
}

// ---- My bookings ----

export function MyBookings() {
  const { toast } = useContext(Ctx);
  const { data, loading, reload } = useData(() => api.myBookings(), []);
  const mine = data?.bookings || [];

  const cancel = async (b) => {
    if (!b.canCancel) { toast('This booking can no longer be cancelled. Cancellation closes 2 hours before the show.'); return; }
    if (!confirm('Cancel this booking? Your seats will be released.')) return;
    try { await api.cancelBooking(b._id); toast('Booking cancelled. Your seats are free again.'); reload(); }
    catch (e) { toast(errMsg(e)); }
  };

  if (loading) return <Spinner />;
  return (
    <div className="wrap page"><h1>My bookings</h1>
      {!mine.length ? <p className="muted">You have no bookings yet. <a href="#/movies">Find a movie</a></p> :
        <div className="blist">{mine.map((b) => {
          const s = b.show, m = s?.movie, theatre = s?.theatre;
          const screen = theatre?.screens?.find((x) => x._id === s?.screenId);
          return (
            <div className="panel bk" key={b._id}>
              <div>
                <h3>{m?.title} <span className={'badge' + (b.status === 'confirmed' ? '' : ' x')}>{b.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</span></h3>
                <p>{theatre?.name}, {screen?.name}</p>
                <p>{s && `${fmtDate(s.date)} at ${fmtTime(s.time)}`}</p>
                <p className="muted">Seats {b.seats.join(', ')}, {money(b.total)}, ID {b.code}</p>
              </div>
              <div className="row"><a className="btn ghost sm" href={'#/ticket/' + b._id}>View ticket</a>
                {b.status === 'confirmed' && <button className="btn danger sm" onClick={() => cancel(b)}>Cancel booking</button>}</div>
            </div>
          );
        })}</div>}
    </div>
  );
}

// ---- Profile ----

export function Profile() {
  const { user, setUser, toast } = useContext(Ctx);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const form = e.target, f = Object.fromEntries(new FormData(form));
    if (clean(f.name).length < 2) return setErr('Enter your full name.');
    if (f.phone && !/^\d{10}$/.test(f.phone)) return setErr('Phone number must be 10 digits.');
    if (f.password && !strongPw(f.password)) return setErr('New password needs 8+ characters with upper-case, lower-case and a number.');
    try {
      const { user: u } = await api.updateProfile({ name: clean(f.name), phone: clean(f.phone), password: f.password || '' });
      setUser(u); setErr(''); form.password.value = ''; toast('Profile saved.');
    } catch (e2) { setErr(errMsg(e2)); }
  };
  return (
    <div className="wrap page"><div className="panel narrow"><h1>Profile</h1>
      <p className="muted">Signed in as <strong>{roleLabel(user.role)}</strong></p>
      <form onSubmit={submit}>
        <Field label="Full name" name="name" defaultValue={user.name} required />
        <Field label="Email" value={user.email} readOnly />
        <Field label="Phone (10 digits, optional)" name="phone" defaultValue={user.phone} inputMode="numeric" />
        <Field label="New password (leave blank to keep current)" name="password" type="password" autoComplete="new-password" />
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn">Save changes</button>
      </form></div></div>
  );
}

// ---- Login ----

export function Login() {
  const { login } = useContext(Ctx);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    setBusy(true);
    const r = await login(f.email, f.password);
    setBusy(false);
    if (r) setErr(r);
  };
  return (
    <div className="wrap page"><div className="panel narrow"><h1>Log in</h1>
      <form onSubmit={submit}>
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required autoComplete="current-password" />
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
      </form>
      <p>New here? <a href="#/register">Create an account</a></p>
      <p className="muted">Demo admin: admin@cinema.com / Admin@123<br />Demo owner: owner@cinema.com / Owner@123</p>
    </div></div>
  );
}

// ---- Register (customer or theatre owner) ----

export function Register() {
  const { register } = useContext(Ctx);
  const [err, setErr] = useState(''), [role, setRole] = useState(ROLES.CUSTOMER), [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    if (clean(f.name).length < 2) return setErr('Enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Enter a valid email address.');
    if (f.phone && !/^\d{10}$/.test(f.phone)) return setErr('Phone number must be 10 digits.');
    if (!strongPw(f.password)) return setErr('Password needs 8+ characters with upper-case, lower-case and a number.');
    if (f.password !== f.confirm) return setErr('Passwords do not match.');
    setBusy(true);
    const r = await register({ name: clean(f.name), email: f.email, phone: clean(f.phone), password: f.password, role });
    setBusy(false);
    if (r) setErr(r);
  };
  return (
    <div className="wrap page"><div className="panel narrow"><h1>Create account</h1>
      <form onSubmit={submit}>
        <label className="f"><span>I am a</span>
          <select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value={ROLES.CUSTOMER}>Movie-goer (customer)</option>
            <option value={ROLES.THEATRE_OWNER}>Theatre owner</option>
          </select>
        </label>
        <Field label="Full name" name="name" required />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Phone (10 digits, optional)" name="phone" inputMode="numeric" />
        <Field label="Password" name="password" type="password" required autoComplete="new-password" />
        <Field label="Confirm password" name="confirm" type="password" required autoComplete="new-password" />
        {role === ROLES.THEATRE_OWNER && <p className="muted">As a theatre owner you can add your venues, screens and showtimes, and manage their bookings from the dashboard.</p>}
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p>Already registered? <a href="#/login">Log in</a></p>
    </div></div>
  );
}

export const Legal = ({ kind }) => (
  <div className="wrap page"><div className="panel narrow">
    {kind === 'terms'
      ? <><h1>Terms and conditions</h1><p>Seats are held only after a booking is confirmed. A booking can be cancelled up to 2 hours before the show starts. Ticket prices are set by the theatre.</p></>
      : <><h1>Privacy</h1><p>We keep only the details needed to run your bookings: name, email, optional phone number and booking history. Only you and authorised staff can see them.</p></>}
  </div></div>
);
