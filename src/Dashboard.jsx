import { useState, useEffect, useContext, useCallback } from 'react';
import { api } from './api.js';
import { Ctx, clean, money, fmtDate, fmtTime, ROLES, roleLabel, errMsg } from './lib.js';

// ---- shared form / table primitives ----

function Form({ fields, init, blank, onSave, onCancel, label }) {
  const [v, setV] = useState(init), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => setV(init), [init]);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await onSave({ ...v });
    setBusy(false);
    if (r) setErr(r); else { setErr(''); setV(blank); }
  };
  return (
    <form className="aform" onSubmit={submit}>
      {fields.map((f) => (
        <label key={f.k} className="f"><span>{f.label}</span>
          {f.opts ? <select value={v[f.k] ?? ''} onChange={set(f.k)}><option value="">Select…</option>{f.opts.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select>
            : f.area ? <textarea rows={2} value={v[f.k] ?? ''} onChange={set(f.k)} /> : <input type={f.type || 'text'} value={v[f.k] ?? ''} onChange={set(f.k)} />}
        </label>
      ))}
      <div className="row"><button className="btn sm" disabled={busy}>{v.id ? 'Save changes' : label}</button>{v.id && <button type="button" className="btn ghost sm" onClick={onCancel}>Cancel edit</button>}</div>
      {err && <p className="err" role="alert">{err}</p>}
    </form>
  );
}
const Table = ({ head, rows }) => (
  <div className="tw"><table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>) : <tr><td colSpan={head.length} className="muted">Nothing here yet.</td></tr>}</tbody></table></div>
);
const Acts = ({ onEdit, onDel }) => <div className="row">{onEdit && <button className="btn ghost sm" onClick={onEdit}>Edit</button>}{onDel && <button className="btn danger sm" onClick={onDel}>Delete</button>}</div>;

// Reusable loader for a tab.
function useTabData(loader, deps = []) {
  const [data, setData] = useState(null), [err, setErr] = useState(''), [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    loader().then((d) => { setData(d); setErr(''); }).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => reload(), [reload]);
  return { data, err, loading, reload };
}

// ---- Movies (admin only) ----

const BM = { title: '', genre: '', language: '', duration: '', status: 'now', desc: '' };
function MoviesTab() {
  const { toast } = useContext(Ctx);
  const [ed, setEd] = useState(null);
  const { data, loading, reload } = useTabData(() => api.listMovies(), []);
  const movies = data?.movies || [];

  const save = async (v) => {
    try {
      const payload = { title: clean(v.title), genre: clean(v.genre), language: clean(v.language), duration: Number(v.duration), status: v.status, desc: clean(v.desc) };
      if (v.id) await api.updateMovie(v.id, payload); else await api.createMovie(payload);
      setEd(null); toast('Movie saved.'); reload();
    } catch (e) { return errMsg(e); }
  };
  const del = async (m) => {
    if (!confirm(`Delete "${m.title}"?`)) return;
    try { await api.deleteMovie(m._id); toast('Movie deleted.'); reload(); } catch (e) { toast(errMsg(e)); }
  };
  const F = [{ k: 'title', label: 'Title' }, { k: 'genre', label: 'Genre' }, { k: 'language', label: 'Language' }, { k: 'duration', label: 'Minutes', type: 'number' },
    { k: 'status', label: 'Status', opts: [['now', 'Now showing'], ['upcoming', 'Upcoming']] }, { k: 'desc', label: 'Description', area: true }];
  return (<>
    <Form fields={F} init={ed || BM} blank={BM} onSave={save} onCancel={() => setEd(null)} label="Add movie" />
    {loading ? <p className="muted">Loading…</p> :
      <Table head={['Title', 'Genre', 'Language', 'Min', 'Status', '']}
        rows={movies.map((m) => [m.title, m.genre, m.language, m.duration, m.status === 'now' ? 'Now showing' : 'Upcoming',
          <Acts onEdit={() => setEd({ id: m._id, title: m.title, genre: m.genre, language: m.language, duration: m.duration, status: m.status, desc: m.desc })} onDel={() => del(m)} />])} />}
  </>);
}

// ---- Theatres and screens (owner-scoped / admin) ----

function TheatresTab() {
  const { user, toast } = useContext(Ctx);
  const [et, setEt] = useState(null), [es, setEs] = useState(null);
  const { data, loading, reload } = useTabData(async () => {
    const [{ theatres }, owners] = await Promise.all([
      api.listManageableTheatres(),
      user.role === ROLES.ADMIN ? api.listOwners() : Promise.resolve({ owners: [] }),
    ]);
    return { theatres, owners: owners.owners };
  }, [user.role]);
  const theatres = data?.theatres || [];
  const owners = data?.owners || [];
  const isAdmin = user.role === ROLES.ADMIN;

  const BT = { name: '', area: '', owner: '' };
  const saveT = async (v) => {
    try {
      const payload = { name: clean(v.name), area: clean(v.area), ...(isAdmin && v.owner ? { owner: v.owner } : {}) };
      if (v.id) await api.updateTheatre(v.id, payload); else await api.createTheatre(payload);
      setEt(null); toast('Theatre saved.'); reload();
    } catch (e) { return errMsg(e); }
  };
  const delT = async (t) => {
    if (!confirm(`Delete ${t.name}?`)) return;
    try { await api.deleteTheatre(t._id); toast('Theatre deleted.'); reload(); } catch (e) { toast(errMsg(e)); }
  };

  const BS = { theatreId: '', name: '', rows: '', cols: '' };
  const saveS = async (v) => {
    try {
      const payload = { name: clean(v.name), rows: Number(v.rows), cols: Number(v.cols) };
      if (v.id) await api.updateScreen(v.theatreId, v.id, payload); else await api.addScreen(v.theatreId, payload);
      setEs(null); toast('Screen saved.'); reload();
    } catch (e) { return errMsg(e); }
  };
  const delS = async (t, s) => {
    if (!confirm(`Delete ${t.name}, ${s.name}?`)) return;
    try { await api.deleteScreen(t._id, s._id); toast('Screen deleted.'); reload(); } catch (e) { toast(errMsg(e)); }
  };

  const theatreFields = [{ k: 'name', label: 'Theatre name' }, { k: 'area', label: 'Area' },
    ...(isAdmin ? [{ k: 'owner', label: 'Owner', opts: owners.map((o) => [o.id, `${o.name} (${o.email})`]) }] : [])];
  const screens = theatres.flatMap((t) => t.screens.map((s) => ({ t, s })));

  if (loading) return <p className="muted">Loading…</p>;
  return (<>
    <h3>Theatres</h3>
    <Form fields={theatreFields} init={et || BT} blank={BT} onSave={saveT} onCancel={() => setEt(null)} label="Add theatre" />
    <Table head={['Theatre', 'Area', ...(isAdmin ? ['Owner'] : []), 'Screens', '']}
      rows={theatres.map((t) => [t.name, t.area, ...(isAdmin ? [t.owner?.email || '—'] : []), t.screens.length,
        <Acts onEdit={() => setEt({ id: t._id, name: t.name, area: t.area, owner: t.owner?._id || t.owner || '' })} onDel={() => delT(t)} />])} />

    <h3 style={{ marginTop: 24 }}>Screens and seat layouts</h3>
    <Form fields={[{ k: 'theatreId', label: 'Theatre', opts: theatres.map((t) => [t._id, t.name]) }, { k: 'name', label: 'Screen name' }, { k: 'rows', label: 'Rows (3-15)', type: 'number' }, { k: 'cols', label: 'Seats per row (4-16)', type: 'number' }]}
      init={es || BS} blank={BS} onSave={saveS} onCancel={() => setEs(null)} label="Add screen" />
    <Table head={['Theatre', 'Screen', 'Layout', 'Seats', '']}
      rows={screens.map(({ t, s }) => [t.name, s.name, `${s.rows} x ${s.cols}`, s.rows * s.cols,
        <Acts onEdit={() => setEs({ id: s._id, theatreId: t._id, name: s.name, rows: s.rows, cols: s.cols })} onDel={() => delS(t, s)} />])} />
  </>);
}

// ---- Shows (owner-scoped / admin) ----

function ShowsTab() {
  const { user, toast } = useContext(Ctx);
  const [ed, setEd] = useState(null);
  const { data, loading, reload } = useTabData(async () => {
    const [shows, { theatres }, movies] = await Promise.all([
      api.listManageableShows(),
      api.listManageableTheatres(),
      api.listMovies(),
    ]);
    return { shows: shows.shows, theatres, movies: movies.movies };
  }, [user.role]);
  const shows = data?.shows || [], theatres = data?.theatres || [], movies = data?.movies || [];

  const BH = { movie: '', theatreScreen: '', date: '', time: '', price: '' };
  const screenOpts = theatres.flatMap((t) => t.screens.map((s) => [`${t._id}:${s._id}`, `${t.name}, ${s.name}`]));

  const save = async (v) => {
    try {
      const [theatre, screenId] = (v.theatreScreen || '').split(':');
      if (!theatre || !screenId) return 'Choose a theatre and screen.';
      const payload = { movie: v.movie, theatre, screenId, date: v.date, time: v.time, price: Number(v.price) };
      if (v.id) await api.updateShow(v.id, payload); else await api.createShow(payload);
      setEd(null); toast('Show saved.'); reload();
    } catch (e) { return errMsg(e); }
  };
  const del = async (s) => {
    if (!confirm('Delete this show?')) return;
    try { await api.deleteShow(s._id); toast('Show deleted.'); reload(); } catch (e) { toast(errMsg(e)); }
  };

  const F = [{ k: 'movie', label: 'Movie', opts: movies.map((m) => [m._id, m.title]) },
    { k: 'theatreScreen', label: 'Theatre and screen', opts: screenOpts },
    { k: 'date', label: 'Date', type: 'date' }, { k: 'time', label: 'Time', type: 'time' }, { k: 'price', label: 'Ticket price', type: 'number' }];

  const rows = shows.map((s) => {
    const screen = s.theatre?.screens?.find((x) => x._id === s.screenId);
    return [s.movie?.title, `${s.theatre?.name}, ${screen?.name}`, fmtDate(s.date), fmtTime(s.time), money(s.price), s.seatsSold ?? 0,
      <Acts onEdit={() => setEd({ id: s._id, movie: s.movie?._id, theatreScreen: `${s.theatre?._id}:${s.screenId}`, date: s.date, time: s.time, price: s.price })} onDel={() => del(s)} />];
  });

  if (loading) return <p className="muted">Loading…</p>;
  return (<>
    <Form fields={F} init={ed || BH} blank={BH} onSave={save} onCancel={() => setEd(null)} label="Add show" />
    <Table head={['Movie', 'Screen', 'Date', 'Time', 'Price', 'Seats sold', '']} rows={rows} />
  </>);
}

// ---- Bookings (owner-scoped / admin) ----

function BookingsTab() {
  const { toast } = useContext(Ctx);
  const { data, loading, reload } = useTabData(() => api.listManageableBookings(), []);
  const bookings = data?.bookings || [];
  const cancel = async (b) => {
    if (!confirm('Cancel this booking and release its seats?')) return;
    try { await api.cancelManagedBooking(b._id); toast('Booking cancelled.'); reload(); } catch (e) { toast(errMsg(e)); }
  };
  if (loading) return <p className="muted">Loading…</p>;
  const rows = bookings.map((b) => {
    const s = b.show;
    return [b.code, b.user?.email, s?.movie?.title, s && `${fmtDate(s.date)} ${fmtTime(s.time)}`, b.seats.join(', '), money(b.total), b.status,
      b.status === 'confirmed' ? <button className="btn danger sm" onClick={() => cancel(b)}>Cancel</button> : ''];
  });
  return <Table head={['ID', 'User', 'Movie', 'Show', 'Seats', 'Total', 'Status', '']} rows={rows} />;
}

// ---- Users (admin only) ----

function UsersTab() {
  const { user, toast } = useContext(Ctx);
  const { data, loading, reload } = useTabData(() => api.listUsers(), []);
  const users = data?.users || [];
  const setRole = async (u, role) => {
    try { await api.setUserRole(u.id, role); toast('Role updated.'); reload(); } catch (e) { toast(errMsg(e)); }
  };
  const del = async (u) => {
    if (!confirm(`Remove ${u.email}?`)) return;
    try { await api.deleteUser(u.id); toast('User removed.'); reload(); } catch (e) { toast(errMsg(e)); }
  };
  if (loading) return <p className="muted">Loading…</p>;
  return <Table head={['Name', 'Email', 'Phone', 'Role', '']}
    rows={users.map((u) => [u.name, u.email, u.phone || '-', roleLabel(u.role),
      u.id === user.id ? <span className="muted">You</span> :
        <div className="row">
          <select className="rolesel" value={u.role} onChange={(e) => setRole(u, e.target.value)} aria-label={`Role for ${u.email}`}>
            <option value={ROLES.CUSTOMER}>Customer</option>
            <option value={ROLES.THEATRE_OWNER}>Theatre owner</option>
            <option value={ROLES.ADMIN}>Administrator</option>
          </select>
          <button className="btn danger sm" onClick={() => del(u)}>Remove</button>
        </div>])} />;
}

// ---- Activity log (admin only) ----

function LogTab() {
  const { data, loading } = useTabData(() => api.listLogs(), []);
  if (loading) return <p className="muted">Loading…</p>;
  const logs = data?.logs || [];
  return <Table head={['When', 'Who', 'Role', 'Action']}
    rows={logs.map((l) => [new Date(l.at).toLocaleString(), l.by, roleLabel(l.role), l.action])} />;
}

// ---- Dashboard shell: tabs vary by role ----

export default function Dashboard() {
  const { user } = useContext(Ctx);
  const isAdmin = user.role === ROLES.ADMIN;

  const tabs = [
    ...(isAdmin ? [['Movies', MoviesTab]] : []),
    ['Theatres and screens', TheatresTab],
    ['Shows', ShowsTab],
    ['Bookings', BookingsTab],
    ...(isAdmin ? [['Users', UsersTab], ['Activity log', LogTab]] : []),
  ];
  const [tab, setTab] = useState(0);
  const Tab = tabs[tab][1];

  return (
    <div className="wrap page">
      <h1>{isAdmin ? 'Admin console' : 'Theatre dashboard'}</h1>
      <p className="muted">Signed in as {roleLabel(user.role)}. {isAdmin ? 'You manage the whole platform.' : 'You manage your own theatres, screens, shows and bookings.'}</p>
      <div className="tabs" role="tablist">{tabs.map(([n], i) => <button key={n} role="tab" aria-selected={i === tab} className={i === tab ? 'on' : ''} onClick={() => setTab(i)}>{n}</button>)}</div>
      <div className="panel"><Tab /></div>
    </div>
  );
}
