/* global React, RW, Ico, Badge, Avatar, Button, Field, Card, Modal, Drawer, Toolbar, Sparkline, fmt */
const { useState: useState_S, useEffect: useEffect_S, useMemo: useMemo_S, useRef: useRef_S } = React;

// ============================================================
// AppCtx — passed to all screens via window.useApp() lookup
// ============================================================
// (we expose helpers via window.AppCtx in app.jsx)

// ============================================================
// Dashboard
// ============================================================
function DashboardScreen({ ctx }) {
  const { role, company, buses, drivers, trips, routes, companies } = ctx;

  const visibleBuses = role === 'super_admin' ? buses : buses.filter(b => b.company === company);
  const visibleTrips = role === 'super_admin' ? trips : trips.filter(t => visibleBuses.some(b => b.id === t.bus));
  const visibleDrivers = role === 'super_admin' ? drivers : drivers.filter(d => d.company === company);

  const live = visibleBuses.filter(b => b.status === 'live').length;
  const idle = visibleBuses.filter(b => b.status === 'idle').length;
  const stale = visibleBuses.filter(b => b.status === 'stale').length;
  const offline = visibleBuses.filter(b => b.status === 'offline' || b.status === 'maint').length;

  const inProgress = visibleTrips.filter(t => t.status === 'in_progress').length;
  const scheduled = visibleTrips.filter(t => t.status === 'scheduled').length;
  const completed = visibleTrips.filter(t => t.status === 'completed').length;
  const delayed   = visibleTrips.filter(t => t.status === 'delayed').length;
  const cancelled = visibleTrips.filter(t => t.status === 'cancelled').length;

  const passengersToday = visibleTrips.reduce((s,t)=>s+t.booked,0);
  const fareEstimate = visibleTrips.reduce((s,t) => {
    const r = routes.find(r => r.id === t.route);
    return s + (r ? t.booked * RW.priceForKm(r.distance_km, ctx.basePrice) : 0);
  }, 0);

  const spark1 = [12,18,22,30,24,28,35,40,38,44,52,49,55];
  const spark2 = [5,7,9,12,11,14,18,16,20,22,25,28,32];
  const spark3 = [40,44,46,52,55,60,58,62,66,72,70,68,74];
  const spark4 = [10,12,8,15,18,22,20,18,24,26,30,28,32];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">{role === 'super_admin' ? 'Network Overview' : (RW.COMPANIES.find(c=>c.id===company)?.name + ' — Operations')}</div>
          <div className="page-sub">
            <span className="mono">Tuesday, May 19, 2026</span>
            <span style={{margin:'0 8px', color:'var(--text-3)'}}>·</span>
            Live snapshot · <Badge live>{live} buses streaming</Badge>
          </div>
        </div>
        <div className="page-actions">
          <Button kind="ghost" sm icon={Ico.cog}>Configure</Button>
          <Button kind="primary" sm icon={Ico.plus} onClick={() => ctx.go('trips')}>Schedule trip</Button>
        </div>
      </div>

      <div className="grid g-4" style={{marginBottom: 16}}>
        <KPI label="Live buses" value={live} delta="+2 vs avg" up sub={`${idle} idle · ${stale} stale · ${offline} off`} spark={spark1} />
        <KPI label="Trips in progress" value={inProgress} delta={`${scheduled} scheduled today`} sub={`${completed} completed · ${delayed} delayed`} spark={spark2} />
        <KPI label="Passengers today" value={passengersToday.toLocaleString()} delta="+8.4% w/w" up sub={`${cancelled} cancellations`} spark={spark3} />
        <KPI label="Revenue (est.)" value={fmt.rwf(fareEstimate)} delta="+11.2% w/w" up sub={`Avg ${fmt.rwf(passengersToday ? Math.round(fareEstimate/passengersToday) : 0)} / pax`} spark={spark4} />
      </div>

      <div className="grid" style={{gridTemplateColumns: '2fr 1fr', gap: 16}}>
        <Card title="Active routes" sub="Network occupancy this hour" action={<a className="btn ghost sm" onClick={() => ctx.go('map')}>Open map<Ico.arrow className="ico"/></a>}>
          <table className="table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Company</th>
                <th className="right">Buses</th>
                <th className="right">Avg occ.</th>
                <th className="right">On-time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {routes.filter(r => role === 'super_admin' || r.company === company).slice(0, 7).map((r, i) => {
                const co = companies.find(c => c.id === r.company);
                const onRouteBuses = visibleBuses.filter(b => b.route === r.id).length;
                const occ = 55 + (i * 7) % 35;
                const otp = 88 + (i * 3) % 11;
                return (
                  <tr className="row" key={r.id} onClick={() => ctx.go('map')}>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap: 8}}>
                        <span className="tag-dot" style={{background: co?.color}} />
                        <span style={{fontWeight: 500}}>{r.name}</span>
                        <span className="muted mono tiny">{fmt.km(r.distance_km)}</span>
                      </div>
                    </td>
                    <td><span className="mono tiny" style={{color:'var(--text-2)'}}>{co?.short}</span> {co?.name}</td>
                    <td className="right num">{onRouteBuses}</td>
                    <td className="right num"><OccBar v={occ} /></td>
                    <td className="right num">{otp}%</td>
                    <td><Ico.arrow className="ico" style={{color:'var(--text-3)'}} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Fleet status" sub="GPS heartbeat by company">
          <div className="col-flex">
            {(role === 'super_admin' ? companies : companies.filter(c => c.id === company)).map(co => {
              const list = visibleBuses.filter(b => b.company === co.id);
              const L = list.filter(b => b.status === 'live').length;
              const I = list.filter(b => b.status === 'idle').length;
              const S = list.filter(b => b.status === 'stale').length;
              const O = list.filter(b => b.status === 'offline' || b.status === 'maint').length;
              return (
                <div key={co.id} style={{display:'flex', flexDirection:'column', gap: 8}}>
                  <div className="between">
                    <div className="row-flex">
                      <span className="tag-dot" style={{background: co.color}} />
                      <span style={{fontWeight: 500}}>{co.name}</span>
                    </div>
                    <span className="mono tiny muted">{list.length} buses</span>
                  </div>
                  <StatusBar total={list.length} live={L} idle={I} stale={S} off={O} />
                </div>
              );
            })}
            <div className="divider" />
            <div className="col-flex" style={{gap:8}}>
              <div className="upcase muted">Alerts</div>
              <Alert tone="warn" title="B-1044 GPS stale 8m" sub="Kigali → Huye · Last ping near Byimana" />
              <Alert tone="danger" title="B-2014 offline" sub="Last seen 06:12 · Kinihira approach" />
              <Alert tone="info" title="Driver D-217 below threshold" sub="Rating dropped to 4.3 (last 7 days)" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid g-3" style={{marginTop: 16}}>
        <Card title="Top corridors" sub="By passengers today">
          <div className="col-flex" style={{gap:10}}>
            <CorridorRow name="Kigali → Rwamagana" co="Yahoo" co_color="#4a8cff" pax={143} pct={92} />
            <CorridorRow name="Kigali → Huye" co="Horizon" co_color="#22c55e" pax={94} pct={73} />
            <CorridorRow name="Kigali → Musanze" co="Volcano" co_color="#f59e0b" pax={86} pct={68} />
            <CorridorRow name="Kigali → Kayonza" co="Yahoo" co_color="#4a8cff" pax={38} pct={42} />
            <CorridorRow name="Kigali → Rubavu" co="Volcano" co_color="#f59e0b" pax={46} pct={51} />
          </div>
        </Card>
        <Card title="Drivers on duty" sub={`${visibleDrivers.filter(d => visibleBuses.find(b => b.id === d.bus && b.status === 'live')).length} active now`}>
          <div className="col-flex" style={{gap:8}}>
            {visibleDrivers.slice(0,6).map(d => {
              const b = visibleBuses.find(b => b.id === d.bus);
              const live = b && b.status === 'live';
              return (
                <div key={d.id} className="between" style={{padding: '4px 0'}}>
                  <div className="row-flex">
                    <Avatar name={d.name} />
                    <div>
                      <div style={{fontSize: 12.5}}>{d.name}</div>
                      <div className="mono tiny muted">{d.id} · {b?.id || '—'} · ★ {d.rating}</div>
                    </div>
                  </div>
                  {live ? <Badge tone="ok" live>Live</Badge>
                        : b?.status === 'idle' ? <Badge tone="info">Idle</Badge>
                        : <Badge>Off</Badge>}
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="GPS feed" sub="Last 8 events" action={<Badge live>WS</Badge>}>
          <div className="feed">
            <FeedRow t="09:48:21" ev="ping" id="B-3007" v="KGL→RWM · 49 km/h · -1.9211,30.2014" />
            <FeedRow t="09:48:20" ev="ping" id="B-2010" v="KGL→MUS · 71 km/h · -1.7821,29.9904" />
            <FeedRow t="09:48:19" ev="enter" id="B-1041" tone="info" v="Stop: Ruyenzi" />
            <FeedRow t="09:48:18" ev="ping" id="B-3010" v="62 km/h · -1.5402,30.4001" />
            <FeedRow t="09:48:16" ev="depart" id="B-1042" tone="info" v="Park: Nyabugogo · trip T-7702" />
            <FeedRow t="09:48:14" ev="stale" id="B-1044" tone="warn" v="No ping for 8 min · last @ Byimana" />
            <FeedRow t="09:48:11" ev="ping" id="B-3008" v="68 km/h · -1.9510,30.2510" />
            <FeedRow t="09:48:09" ev="seat" id="B-3007" v="+1 booked · seat 14L" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, sub, delta, up, spark }) {
  return (
    <div className="card kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-meta">
        {delta ? <span className={`kpi-delta ${up ? 'up' : 'down'} mono`}>{up ? '▲' : '▼'} {delta}</span> : null}
      </div>
      {sub ? <div className="muted tiny" style={{marginTop:4}}>{sub}</div> : null}
      {spark ? <Sparkline data={spark} /> : null}
    </div>
  );
}

function OccBar({ v }) {
  return (
    <span style={{display:'inline-flex', alignItems:'center', gap:6, justifyContent:'flex-end'}}>
      <span style={{display:'inline-block', width:54, height:5, borderRadius:3, background:'var(--bg-3)', overflow:'hidden'}}>
        <span style={{display:'block', width:`${v}%`, height:'100%', background: v>85?'var(--warn)':v>60?'var(--accent)':'var(--info)'}} />
      </span>
      <span className="mono tiny">{v}%</span>
    </span>
  );
}

function StatusBar({ total, live, idle, stale, off }) {
  const t = total || 1;
  return (
    <div style={{display:'flex', height:6, borderRadius:3, overflow:'hidden', background:'var(--bg-3)'}}>
      <span style={{width:`${live/t*100}%`, background:'var(--accent)'}} />
      <span style={{width:`${idle/t*100}%`, background:'var(--info)'}} />
      <span style={{width:`${stale/t*100}%`, background:'var(--warn)'}} />
      <span style={{width:`${off/t*100}%`, background:'var(--text-3)'}} />
    </div>
  );
}

function Alert({ tone, title, sub }) {
  return (
    <div style={{display:'flex', gap:10, padding:'8px 10px', background:'var(--bg-2)', borderRadius: 6, borderLeft:`2px solid var(--${tone==='danger'?'danger':tone==='warn'?'warn':'info'})`}}>
      <div>
        <div style={{fontSize:12.5}}>{title}</div>
        <div className="muted tiny" style={{marginTop:2}}>{sub}</div>
      </div>
    </div>
  );
}

function CorridorRow({ name, co, co_color, pax, pct }) {
  return (
    <div>
      <div className="between" style={{marginBottom:4}}>
        <div className="row-flex">
          <span className="tag-dot" style={{background: co_color}}/>
          <span style={{fontSize: 12.5}}>{name}</span>
          <span className="muted tiny">{co}</span>
        </div>
        <span className="mono tiny">{pax} pax</span>
      </div>
      <div style={{height:4, borderRadius:2, background:'var(--bg-3)', overflow:'hidden'}}>
        <span style={{display:'block', width:`${pct}%`, height:'100%', background: co_color, opacity:.7}}/>
      </div>
    </div>
  );
}

function FeedRow({ t, ev, id, v, tone }) {
  return (
    <div className="feed-row">
      <span className="t">{t}</span>
      <span className={`ev ${tone || ''}`}>{ev}</span>
      <span className="id">{id} <span className="v" style={{color:'var(--text-1)'}}>{v}</span></span>
    </div>
  );
}

// ============================================================
// Companies
// ============================================================
function CompaniesScreen({ ctx }) {
  const { companies, buses, drivers, role } = ctx;
  const [openCo, setOpenCo] = useState_S(null);
  const [showNew, setShowNew] = useState_S(false);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Companies</div>
          <div className="page-sub">Operators authorized to run trips on the network</div>
        </div>
        <div className="page-actions">
          {role === 'super_admin' ? <Button kind="primary" sm icon={Ico.plus} onClick={()=>setShowNew(true)}>New company</Button> : null}
        </div>
      </div>

      <Card>
        <table className="table">
          <thead>
            <tr>
              <th>Company</th>
              <th>HQ</th>
              <th>Province coverage</th>
              <th className="right">Districts</th>
              <th className="right">Buses</th>
              <th className="right">Drivers</th>
              <th className="right">Live now</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {companies.map(co => {
              const cBuses = buses.filter(b=>b.company===co.id);
              const cDrivers = drivers.filter(d=>d.company===co.id);
              const live = cBuses.filter(b=>b.status==='live').length;
              const prov = RW.PROVINCES.find(p=>p.id===co.province);
              return (
                <tr className="row" key={co.id} onClick={()=>setOpenCo(co)}>
                  <td>
                    <div className="row-flex">
                      <span style={{width:22, height:22, borderRadius:5, background: co.color, color:'#051a0a', display:'grid', placeItems:'center', fontFamily:'IBM Plex Mono, monospace', fontSize:10, fontWeight:700}}>{co.short}</span>
                      <span style={{fontWeight: 500}}>{co.name}</span>
                      <span className="muted tiny">est. {co.founded}</span>
                    </div>
                  </td>
                  <td>{co.hq}</td>
                  <td><Badge>{prov?.name}</Badge></td>
                  <td className="right num">{co.districts.length} / 30</td>
                  <td className="right num">{cBuses.length}</td>
                  <td className="right num">{cDrivers.length}</td>
                  <td className="right"><Badge tone="ok" live>{live}</Badge></td>
                  <td><Ico.arrow className="ico" style={{color:'var(--text-3)'}}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {openCo ? <CompanyDrawer co={openCo} ctx={ctx} onClose={()=>setOpenCo(null)} /> : null}
      {showNew ? <NewCompanyModal onClose={()=>setShowNew(false)} ctx={ctx} /> : null}
    </div>
  );
}

function CompanyDrawer({ co, ctx, onClose }) {
  const cBuses = ctx.buses.filter(b => b.company === co.id);
  const cDrivers = ctx.drivers.filter(d => d.company === co.id);
  const cRoutes = ctx.routes.filter(r => r.company === co.id);
  return (
    <Drawer
      title={co.name}
      sub={<><span className="mono">{co.short}</span> · HQ {co.hq} · est. {co.founded}</>}
      onClose={onClose}
      footer={<><Button kind="ghost" icon={Ico.edit}>Edit company</Button><Button kind="ghost" icon={Ico.cog}>Permissions</Button></>}
    >
      <div className="grid g-3" style={{gap:10}}>
        <Mini label="Buses" v={cBuses.length} />
        <Mini label="Drivers" v={cDrivers.length} />
        <Mini label="Routes" v={cRoutes.length} />
      </div>
      <div>
        <div className="upcase muted" style={{marginBottom:8}}>District coverage · {co.districts.length}</div>
        <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
          {co.districts.map(id => {
            const d = RW.DISTRICTS.find(x=>x.id===id);
            return <span className="chip on" key={id}>{d?.name}</span>;
          })}
        </div>
      </div>
      <div>
        <div className="upcase muted" style={{marginBottom:8}}>Routes</div>
        <div className="col-flex" style={{gap:6}}>
          {cRoutes.map(r => (
            <div key={r.id} className="between" style={{padding:'8px 10px', background:'var(--bg-2)', borderRadius:6}}>
              <div>
                <div style={{fontSize: 12.5}}>{r.name}</div>
                <div className="mono tiny muted">{r.id} · {r.stops.length} stops</div>
              </div>
              <span className="mono tiny">{fmt.km(r.distance_km)}</span>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
function Mini({ label, v }) {
  return (
    <div style={{padding:'10px 12px', background:'var(--bg-2)', borderRadius:6}}>
      <div className="upcase muted" style={{marginBottom:4}}>{label}</div>
      <div className="num" style={{fontSize:18, fontWeight:600}}>{v}</div>
    </div>
  );
}

function NewCompanyModal({ onClose, ctx }) {
  const [picked, setPicked] = useState_S([]);
  const toggle = (id) => setPicked(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  return (
    <Modal title="New company" onClose={onClose} maxWidth={620}
      footer={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button kind="primary" icon={Ico.check} onClick={onClose}>Create company</Button></>}
    >
      <div className="grid g-2" style={{gap: 14}}>
        <Field label="Name"><input className="input" placeholder="Horizon Coaches" /></Field>
        <Field label="Short code (3 letters)"><input className="input mono" placeholder="HZN" maxLength={3} /></Field>
        <Field label="HQ city"><input className="input" placeholder="Huye" /></Field>
        <Field label="Founded"><input className="input mono" placeholder="2011" /></Field>
      </div>
      <Field label="Operating province">
        <select className="select">
          {RW.PROVINCES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label={`Operating districts (${picked.length} selected)`} hint="Tap districts to include them in this company's coverage. Districts can belong to multiple companies.">
        <div style={{display:'flex', flexWrap:'wrap', gap:5, maxHeight: 180, overflow:'auto', padding:'4px 0'}}>
          {RW.DISTRICTS.map(d => (
            <span key={d.id} className={`chip ${picked.includes(d.id) ? 'on' : ''}`} onClick={()=>toggle(d.id)}>{d.name}</span>
          ))}
        </div>
      </Field>
    </Modal>
  );
}

// ============================================================
// Buses
// ============================================================
function BusesScreen({ ctx }) {
  const { buses, drivers, routes, companies, role, company } = ctx;
  const visible = role === 'super_admin' ? buses : buses.filter(b => b.company === company);
  const [filter, setFilter] = useState_S('all');
  const [openBus, setOpenBus] = useState_S(null);
  const [showNew, setShowNew] = useState_S(false);

  const filtered = filter === 'all' ? visible : visible.filter(b => b.status === filter);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Fleet</div>
          <div className="page-sub">Each bus has a GPS IMEI used for live tracking & journey-planner ETAs</div>
        </div>
        <div className="page-actions">
          <Button kind="primary" sm icon={Ico.plus} onClick={()=>setShowNew(true)}>Add bus</Button>
        </div>
      </div>

      <Card tight>
        <Toolbar
          left={<>
            {['all','live','idle','stale','offline','maint'].map(f => (
              <span key={f} className={`chip ${filter===f?'on':''}`} onClick={()=>setFilter(f)}>
                {f === 'all' ? 'All' : f[0].toUpperCase()+f.slice(1)} <span className="mono tiny">{f==='all'?visible.length:visible.filter(b=>b.status===f).length}</span>
              </span>
            ))}
          </>}
          right={<>
            <Button kind="ghost" sm icon={Ico.filter}>Filters</Button>
            <Button kind="ghost" sm icon={Ico.cog}>Columns</Button>
          </>}
        />
        <table className="table">
          <thead>
            <tr>
              <th>Bus</th>
              <th>Plate</th>
              <th>Model</th>
              <th className="right">Seats</th>
              <th>Company</th>
              <th>Route</th>
              <th>Driver</th>
              <th>GPS IMEI</th>
              <th className="right">Speed</th>
              <th className="right">Batt</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const co = companies.find(c=>c.id===b.company);
              const dr = drivers.find(d=>d.id===b.driver);
              const r = routes.find(r=>r.id===b.route);
              return (
                <tr key={b.id} className="row" onClick={()=>setOpenBus(b)}>
                  <td className="num"><span style={{color:'var(--text-0)', fontWeight:500}}>{b.id}</span></td>
                  <td className="mono">{b.plate}</td>
                  <td>{b.model}</td>
                  <td className="right num">{b.seats}</td>
                  <td><div className="row-flex"><span className="tag-dot" style={{background:co?.color}}/>{co?.short}</div></td>
                  <td>{r?.name || '—'}</td>
                  <td>{dr ? <div className="row-flex"><Avatar name={dr.name} size="sm"/><span>{dr.name}</span></div> : <span className="muted">—</span>}</td>
                  <td className="mono tiny" style={{color:'var(--text-2)'}}>{b.imei}</td>
                  <td className="right num">{b.status === 'live' || b.status === 'stale' ? <>{b.speed} <span className="muted tiny">km/h</span></> : <span className="muted">—</span>}</td>
                  <td className="right num">{b.batt ? <BattBar v={b.batt}/> : <span className="muted">—</span>}</td>
                  <td><BusStatusBadge s={b.status}/></td>
                  <td><Ico.more className="ico" style={{color:'var(--text-3)'}}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {openBus ? <BusDrawer bus={openBus} ctx={ctx} onClose={()=>setOpenBus(null)} /> : null}
      {showNew ? <NewBusModal ctx={ctx} onClose={()=>setShowNew(false)} /> : null}
    </div>
  );
}

function BusStatusBadge({ s }) {
  if (s === 'live') return <Badge tone="ok" live>Live</Badge>;
  if (s === 'idle') return <Badge tone="info" dot>Idle</Badge>;
  if (s === 'stale') return <Badge tone="warn" dot>Stale GPS</Badge>;
  if (s === 'offline') return <Badge tone="danger" dot>Offline</Badge>;
  if (s === 'maint') return <Badge dot>Maintenance</Badge>;
  return <Badge>{s}</Badge>;
}
function BattBar({ v }) {
  const c = v > 60 ? 'var(--accent)' : v > 30 ? 'var(--warn)' : 'var(--danger)';
  return (
    <span style={{display:'inline-flex', alignItems:'center', gap:5, justifyContent:'flex-end'}}>
      <span style={{display:'inline-block', width:24, height:8, border:'1px solid var(--border-strong)', borderRadius:1, position:'relative'}}>
        <span style={{position:'absolute', inset:1, width:`calc(${v}% - 2px)`, background: c}}/>
      </span>
      <span className="tiny">{v}%</span>
    </span>
  );
}
function BusDrawer({ bus, ctx, onClose }) {
  const co = ctx.companies.find(c=>c.id===bus.company);
  const dr = ctx.drivers.find(d=>d.id===bus.driver);
  const r = ctx.routes.find(r=>r.id===bus.route);
  return (
    <Drawer title={<span className="row-flex">{bus.id} <BusStatusBadge s={bus.status}/></span>}
      sub={<><span className="mono">{bus.plate}</span> · {bus.model} · {bus.seats} seats</>}
      onClose={onClose}
      footer={<><Button kind="ghost" icon={Ico.trash}>Decommission</Button><Button kind="ghost" icon={Ico.edit}>Edit</Button><Button kind="primary" icon={Ico.track} onClick={()=>{ctx.go('track'); onClose();}}>Track on map</Button></>}
    >
      <div className="grid g-2" style={{gap:10}}>
        <Mini label="Speed" v={(bus.status==='live'||bus.status==='stale')?`${bus.speed} km/h`:'—'} />
        <Mini label="Battery" v={bus.batt?`${bus.batt}%`:'—'} />
      </div>
      <div className="col-flex" style={{gap:6}}>
        <KV k="Company" v={<div className="row-flex"><span className="tag-dot" style={{background:co?.color}}/>{co?.name}</div>}/>
        <KV k="Driver" v={dr ? <div className="row-flex"><Avatar name={dr.name} size="sm"/>{dr.name} <span className="muted mono tiny">{dr.id}</span></div> : '—'}/>
        <KV k="Assigned route" v={r?.name || '—'}/>
        <KV k="GPS IMEI" v={<span className="mono">{bus.imei}</span>}/>
        <KV k="Last ping" v={<span className="mono">09:48:21 · -1.9221, 30.2009</span>}/>
      </div>
      <div>
        <div className="upcase muted" style={{marginBottom:8}}>Today's trips</div>
        <div className="col-flex" style={{gap:4}}>
          {ctx.trips.filter(t=>t.bus===bus.id).map(t => {
            const tr = ctx.routes.find(r=>r.id===t.route);
            return (
              <div key={t.id} className="between" style={{padding:'8px 10px', background:'var(--bg-2)', borderRadius:6}}>
                <div className="row-flex">
                  <span className="mono">{t.id}</span>
                  <span>{tr?.name}</span>
                </div>
                <div className="row-flex">
                  <span className="mono tiny muted">{t.dep}</span>
                  <TripStatusBadge s={t.status}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
}
function KV({ k, v }) {
  return <div className="between" style={{padding:'6px 0', borderBottom:'1px dashed var(--border)'}}><span className="muted tiny">{k}</span><span style={{fontSize:12.5}}>{v}</span></div>;
}
function NewBusModal({ onClose, ctx }) {
  return (
    <Modal title="Add bus to fleet" onClose={onClose}
      footer={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button kind="primary" icon={Ico.check} onClick={onClose}>Add bus</Button></>}
    >
      <div className="grid g-2" style={{gap:14}}>
        <Field label="Fleet ID"><input className="input mono" placeholder="B-1046" /></Field>
        <Field label="License plate"><input className="input mono" placeholder="RAB 046 A" /></Field>
        <Field label="Model"><input className="input" placeholder="Yutong ZK6107" /></Field>
        <Field label="Seats"><input className="input num" placeholder="49" type="number" /></Field>
      </div>
      <Field label="Company">
        <select className="select" disabled={ctx.role !== 'super_admin'} defaultValue={ctx.company || ''}>
          {ctx.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="GPS IMEI" hint="15-digit IMEI of the on-bus tracker — used to bind GPS pings to this vehicle."><input className="input mono" placeholder="861234042100146" maxLength={15}/></Field>
      <Field label="Assigned route (optional)">
        <select className="select"><option>— Unassigned —</option>{ctx.routes.filter(r => ctx.role === 'super_admin' || r.company === ctx.company).map(r=><option key={r.id}>{r.name}</option>)}</select>
      </Field>
    </Modal>
  );
}

// ============================================================
// Drivers
// ============================================================
function DriversScreen({ ctx }) {
  const { drivers, buses, role, company } = ctx;
  const visible = role === 'super_admin' ? drivers : drivers.filter(d => d.company === company);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Drivers</div>
          <div className="page-sub">Drivers belong to a company; bus assignment is rotated per shift.</div>
        </div>
        <div className="page-actions">
          <Button kind="primary" sm icon={Ico.plus}>Add driver</Button>
        </div>
      </div>
      <Card>
        <table className="table">
          <thead>
            <tr><th>Driver</th><th>ID</th><th>Company</th><th>License</th><th>Phone</th><th className="right">Since</th><th className="right">Rating</th><th>Assigned bus</th><th>Status</th></tr>
          </thead>
          <tbody>
            {visible.map(d => {
              const b = buses.find(x => x.id === d.bus);
              const co = ctx.companies.find(c=>c.id===d.company);
              const status = b?.status;
              return (
                <tr className="row" key={d.id}>
                  <td><div className="row-flex"><Avatar name={d.name}/><span style={{fontWeight:500}}>{d.name}</span></div></td>
                  <td className="mono">{d.id}</td>
                  <td><div className="row-flex"><span className="tag-dot" style={{background:co?.color}}/>{co?.short}</div></td>
                  <td className="mono tiny" style={{color:'var(--text-2)'}}>{d.license}</td>
                  <td className="mono tiny">{d.phone}</td>
                  <td className="right mono tiny">{d.since}</td>
                  <td className="right num">★ {d.rating}</td>
                  <td className="mono tiny">{b?.id || '—'}</td>
                  <td>{status === 'live' ? <Badge tone="ok" live>On trip</Badge> : status === 'idle' ? <Badge tone="info">Standby</Badge> : <Badge>Off duty</Badge>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============================================================
// Trips scheduler (Gantt strip per bus)
// ============================================================
function TripsScreen({ ctx }) {
  const { buses, trips, routes, drivers, role, company } = ctx;
  const visibleBuses = role === 'super_admin' ? buses : buses.filter(b => b.company === company);
  const [showNew, setShowNew] = useState_S(false);
  const HOURS = Array.from({length: 19}, (_, i) => i + 5); // 5:00 → 23:00

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Trip schedule</div>
          <div className="page-sub"><span className="mono">May 19, 2026</span> · {trips.filter(t => visibleBuses.some(b=>b.id===t.bus)).length} trips · drag to reassign, click to edit</div>
        </div>
        <div className="page-actions">
          <Button kind="ghost" sm icon={Ico.filter}>Filter</Button>
          <Button kind="primary" sm icon={Ico.plus} onClick={()=>setShowNew(true)}>Schedule trip</Button>
        </div>
      </div>

      <div className="gantt">
        <div className="gantt-head">
          <div className="gantt-bus" style={{padding:'14px 12px'}}><span className="upcase muted">Bus</span></div>
          <div className="gantt-hours">
            {HOURS.map(h => <div key={h} className="gantt-hour">{String(h).padStart(2,'0')}:00</div>)}
          </div>
        </div>
        {visibleBuses.map(b => {
          const dr = drivers.find(d=>d.id===b.driver);
          const r = routes.find(r=>r.id===b.route);
          const co = ctx.companies.find(c=>c.id===b.company);
          const busTrips = trips.filter(t=>t.bus===b.id);
          return (
            <div className="gantt-row" key={b.id}>
              <div className="gantt-bus">
                <div className="row-flex"><span className="tag-dot" style={{background:co?.color}}/><span className="label">{b.id}</span> <BusStatusBadge s={b.status}/></div>
                <div className="sub mono">{r?.name || '—'} · {dr?.name?.split(' ')[0] || '—'}</div>
              </div>
              <div className="gantt-track">
                {/* hour gridlines */}
                <svg style={{position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none'}}>
                  {HOURS.map((_, i) => (
                    <line key={i} x1={`${i*(100/HOURS.length)}%`} x2={`${i*(100/HOURS.length)}%`} y1="0" y2="100%" stroke="var(--border)" strokeDasharray="2 3"/>
                  ))}
                  {/* now line */}
                  <line x1={`${((9.8 - 5)/19)*100}%`} x2={`${((9.8 - 5)/19)*100}%`} y1="0" y2="100%" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 2"/>
                </svg>
                {busTrips.map(t => {
                  const [hh, mm] = t.dep.split(':').map(Number);
                  const startH = hh + mm/60;
                  const endH = startH + t.durMin/60;
                  const leftPct = ((startH - 5) / 19) * 100;
                  const widthPct = (t.durMin / 60 / 19) * 100;
                  const cls = t.status === 'completed' ? 'ok' : t.status === 'delayed' ? 'warn' : t.status === 'in_progress' ? 'ok' : '';
                  const tr = routes.find(r=>r.id===t.route);
                  return (
                    <div className={`gantt-trip ${cls}`} key={t.id}
                         style={{left:`${leftPct}%`, width:`${Math.max(widthPct, 2.4)}%`}}
                         title={`${t.id} · ${tr?.name} · ${t.dep} · ${fmt.min(t.durMin)} · ${t.booked} pax`}>
                      <div className="t-time">{t.dep} → {plusMin(t.dep, t.durMin)}</div>
                      <div className="t-name">{tr?.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showNew ? <ScheduleTripModal ctx={ctx} onClose={()=>setShowNew(false)} /> : null}
    </div>
  );
}
function plusMin(dep, m) {
  const [h, mm] = dep.split(':').map(Number);
  const total = h*60 + mm + m;
  return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}
function TripStatusBadge({ s }) {
  if (s === 'in_progress') return <Badge tone="ok" live>Running</Badge>;
  if (s === 'completed') return <Badge tone="ok">Done</Badge>;
  if (s === 'scheduled') return <Badge tone="info">Scheduled</Badge>;
  if (s === 'delayed') return <Badge tone="warn">Delayed</Badge>;
  if (s === 'cancelled') return <Badge tone="danger">Cancelled</Badge>;
  return <Badge>{s}</Badge>;
}
function ScheduleTripModal({ ctx, onClose }) {
  return (
    <Modal title="Schedule trip" onClose={onClose} maxWidth={560}
      footer={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button kind="primary" icon={Ico.check} onClick={onClose}>Create</Button></>}
    >
      <div className="grid g-2" style={{gap:14}}>
        <Field label="Date"><input className="input mono" defaultValue="2026-05-19"/></Field>
        <Field label="Departure"><input className="input mono" defaultValue="08:30"/></Field>
        <Field label="Route">
          <select className="select">{ctx.routes.filter(r => ctx.role==='super_admin' || r.company === ctx.company).map(r=><option key={r.id}>{r.name}</option>)}</select>
        </Field>
        <Field label="Bus">
          <select className="select">{ctx.buses.filter(b => ctx.role==='super_admin' || b.company === ctx.company).map(b=><option key={b.id}>{b.id} · {b.plate}</option>)}</select>
        </Field>
        <Field label="Driver">
          <select className="select">{ctx.drivers.filter(d => ctx.role==='super_admin' || d.company === ctx.company).map(d=><option key={d.id}>{d.name} ({d.id})</option>)}</select>
        </Field>
        <Field label="Duration" hint="Auto-estimated from route">
          <input className="input mono" defaultValue="195 min" readOnly/>
        </Field>
      </div>
    </Modal>
  );
}

// ============================================================
// Operators & roles
// ============================================================
function OperatorsScreen({ ctx }) {
  const { operators, role, company } = ctx;
  const visible = role === 'super_admin' ? operators : operators.filter(o => o.company === company);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Operators & roles</div>
          <div className="page-sub">Who can act on the network and which companies / data they see</div>
        </div>
        <div className="page-actions">
          <Button kind="primary" sm icon={Ico.plus}>Invite operator</Button>
        </div>
      </div>

      <div className="grid g-4" style={{marginBottom: 16}}>
        <RoleCard role="Super admin" count={operators.filter(o=>o.role==='super_admin').length}
          perms={['Manage companies', 'Manage routes / stops / parks', 'Set pricing curve', 'See everything']} />
        <RoleCard role="Company admin" count={operators.filter(o=>o.role==='company_admin').length}
          perms={['Manage own buses + drivers', 'Schedule trips on assigned routes', 'See own company only']} />
        <RoleCard role="Dispatcher" count={operators.filter(o=>o.role==='dispatcher').length}
          perms={['Schedule + edit trips', 'Track own vehicles', 'Cannot add buses or drivers']} />
        <RoleCard role="Finance" count={operators.filter(o=>o.role==='finance').length}
          perms={['Read bookings & revenue', 'Export reports', 'No fleet edits']} />
      </div>

      <Card>
        <Toolbar
          left={<><span className="upcase muted">Members</span><span className="mono tiny muted">{visible.length} total</span></>}
          right={<Button kind="ghost" sm icon={Ico.filter}>Filters</Button>}
        />
        <table className="table">
          <thead><tr><th>Operator</th><th>Email</th><th>Company</th><th>Role</th><th>Last active</th><th></th></tr></thead>
          <tbody>
            {visible.map(o => {
              const co = ctx.companies.find(c=>c.id===o.company);
              return (
                <tr className="row" key={o.id}>
                  <td><div className="row-flex"><Avatar name={o.name}/><span style={{fontWeight:500}}>{o.name}</span></div></td>
                  <td className="mono tiny">{o.email}</td>
                  <td>{co ? <div className="row-flex"><span className="tag-dot" style={{background:co.color}}/>{co.short}</div> : <span className="muted">— Network —</span>}</td>
                  <td><RoleBadge r={o.role}/></td>
                  <td className="mono tiny" style={{color:'var(--text-2)'}}>{o.last}</td>
                  <td><Ico.more className="ico" style={{color:'var(--text-3)'}}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
function RoleBadge({ r }) {
  const label = r.replaceAll('_',' ');
  if (r==='super_admin') return <Badge tone="ok">{label}</Badge>;
  if (r==='company_admin') return <Badge tone="info">{label}</Badge>;
  if (r==='dispatcher') return <Badge tone="warn">{label}</Badge>;
  return <Badge>{label}</Badge>;
}
function RoleCard({ role, count, perms }) {
  return (
    <div className="card" style={{padding:'14px 16px'}}>
      <div className="between" style={{marginBottom:8}}>
        <div style={{fontWeight:600}}>{role}</div>
        <span className="mono tiny muted">{count} members</span>
      </div>
      <ul style={{margin:0, padding:0, listStyle:'none'}}>
        {perms.map((p,i) => <li key={i} className="row-flex" style={{padding:'2px 0', color:'var(--text-1)', fontSize:12}}><Ico.check className="ico" style={{color:'var(--accent)'}}/>{p}</li>)}
      </ul>
    </div>
  );
}

// ============================================================
// Pricing curve config
// ============================================================
function PricingScreen({ ctx }) {
  const [base, setBase] = useState_S(ctx.basePrice);
  useEffect_S(() => setBase(ctx.basePrice), [ctx.basePrice]);
  const apply = () => ctx.setBasePrice(base);

  // build curve points for visualization
  const samples = [1,2,3,5,10,20,30,50,75,100,134.7,158.8];
  const W = 720, H = 240, padL = 50, padR = 20, padT = 14, padB = 30;
  const maxKm = 160, maxRwf = Math.max(...samples.map(km => RW.priceForKm(km, base)));
  const X = km => padL + (km / maxKm) * (W - padL - padR);
  const Y = rwf => H - padB - (rwf / maxRwf) * (H - padT - padB);
  const dense = Array.from({length: 160}, (_, i) => i + 1);
  const linePath = dense.map((km, i) => `${i===0?'M':'L'}${X(km)},${Y(RW.priceForKm(km, base))}`).join(' ');
  const areaPath = `${linePath} L${X(160)},${H - padB} L${X(1)},${H - padB} Z`;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Pricing curve</div>
          <div className="page-sub">Admin sets the base RWF / km. The system computes the per-km curve, applying bucketed multipliers for longer trips. Only super admins.</div>
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns: '1fr 360px', gap: 16}}>
        <Card title="Distance → price" sub={`Base ${fmt.rwf(base)} / km · piecewise multipliers below`}>
          <div className="curve-frame">
            <svg viewBox={`0 0 ${W} ${H}`}>
              {/* grid */}
              {[0,0.25,0.5,0.75,1].map((g,i) => (
                <line key={i} className="curve-grid" x1={padL} x2={W-padR} y1={padT + g*(H-padT-padB)} y2={padT + g*(H-padT-padB)} />
              ))}
              {[0,40,80,120,160].map((km,i)=>(<text key={i} className="curve-axis" x={X(km)} y={H-padB+18} textAnchor="middle">{km}km</text>))}
              {[0,0.5,1].map((g,i)=>(<text key={i} className="curve-axis" x={padL-8} y={padT + g*(H-padT-padB) + 4} textAnchor="end">{Math.round(maxRwf*(1-g)).toLocaleString()}</text>))}
              <path d={areaPath} className="curve-area"/>
              <path d={linePath} className="curve-line"/>
              {samples.map((km, i) => {
                const rwf = RW.priceForKm(km, base);
                return (
                  <g key={i}>
                    <circle cx={X(km)} cy={Y(rwf)} r="4" className="curve-dot"/>
                    <text className="curve-axis" x={X(km)+6} y={Y(rwf)-6}>{km}km · {fmt.rwf(rwf)}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div style={{marginTop:14}}>
            <table className="table">
              <thead><tr><th>Distance bucket</th><th>Multiplier</th><th className="right">Effective rate</th></tr></thead>
              <tbody>
                <tr><td>km 1</td><td className="mono">×1.00</td><td className="right mono">{fmt.rwf(base*1)} / km</td></tr>
                <tr><td>km 2 – 4</td><td className="mono">×0.75</td><td className="right mono">{fmt.rwf(base*0.75)} / km</td></tr>
                <tr><td>km 5 – 19</td><td className="mono">×0.60</td><td className="right mono">{fmt.rwf(base*0.60)} / km</td></tr>
                <tr><td>km 20 – 49</td><td className="mono">×0.50</td><td className="right mono">{fmt.rwf(base*0.50)} / km</td></tr>
                <tr><td>km 50 – 99</td><td className="mono">×0.42</td><td className="right mono">{fmt.rwf(base*0.42)} / km</td></tr>
                <tr><td>km 100+</td><td className="mono">×0.38</td><td className="right mono">{fmt.rwf(base*0.38)} / km</td></tr>
              </tbody>
            </table>
          </div>
        </Card>

        <div className="col-flex" style={{gap:16}}>
          <Card title="Configuration">
            <Field label="Base price · RWF per kilometre" hint="Multipliers above are system-managed and cannot be edited per company.">
              <input type="range" min="20" max="120" step="5" value={base} onChange={e=>setBase(+e.target.value)} style={{width:'100%'}}/>
              <div className="between" style={{marginTop:6}}>
                <span className="muted tiny">20 RWF</span>
                <span className="num" style={{fontSize:18, fontWeight:600}}>{fmt.rwf(base)} / km</span>
                <span className="muted tiny">120 RWF</span>
              </div>
            </Field>
            <div className="row-flex" style={{marginTop:8, justifyContent:'flex-end'}}>
              <Button kind="ghost" onClick={()=>setBase(50)}>Reset</Button>
              <Button kind="primary" icon={Ico.check} onClick={apply}>Publish curve</Button>
            </div>
          </Card>

          <Card title="Sample fares">
            <div className="col-flex" style={{gap:6}}>
              <SampleRow from="Kigali" to="Ruyenzi (Kamonyi)" km={11} base={base}/>
              <SampleRow from="Kigali" to="Muhanga" km={45} base={base}/>
              <SampleRow from="Kigali" to="Ruhango" km={75} base={base}/>
              <SampleRow from="Kigali" to="Nyanza" km={94} base={base}/>
              <SampleRow from="Kigali" to="Huye" km={134.7} base={base}/>
              <SampleRow from="Kigali" to="Musanze" km={99.4} base={base}/>
              <SampleRow from="Kigali" to="Rubavu" km={158.8} base={base}/>
              <SampleRow from="Kigali" to="Nyagatare" km={154.2} base={base}/>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
function SampleRow({ from, to, km, base }) {
  return (
    <div className="between" style={{padding:'6px 0', borderBottom:'1px dashed var(--border)'}}>
      <div>
        <div style={{fontSize:12.5}}>{from} → {to}</div>
        <div className="mono tiny muted">{fmt.km(km)}</div>
      </div>
      <div className="num" style={{fontWeight:600}}>{fmt.rwf(RW.priceForKm(km, base))}</div>
    </div>
  );
}

// Expose
Object.assign(window, {
  DashboardScreen, CompaniesScreen, BusesScreen, DriversScreen,
  TripsScreen, OperatorsScreen, PricingScreen, BusStatusBadge, TripStatusBadge
});
