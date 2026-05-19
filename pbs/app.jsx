/* global React, ReactDOM, RW, Ico, Badge, Avatar, Button, Field, Card, Modal, Drawer, Toolbar, fmt,
   DashboardScreen, CompaniesScreen, BusesScreen, DriversScreen, TripsScreen, OperatorsScreen, PricingScreen,
   MapEditorScreen, LiveTrackScreen,
   TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor, TweakSlider, TweakSelect */

const { useState, useEffect, useMemo } = React;

const NAV = [
  { group: 'Operate', items: [
    { id: 'dashboard', label: 'Dashboard',   ico: Ico.dashboard },
    { id: 'track',     label: 'Live tracking', ico: Ico.track, badge: 'live' },
    { id: 'trips',     label: 'Trips',       ico: Ico.trip },
  ]},
  { group: 'Network', items: [
    { id: 'map',       label: 'Map editor',  ico: Ico.map },
    { id: 'companies', label: 'Companies',   ico: Ico.company, superOnly: false },
  ]},
  { group: 'Fleet', items: [
    { id: 'buses',     label: 'Buses',       ico: Ico.bus },
    { id: 'drivers',   label: 'Drivers',     ico: Ico.driver },
  ]},
  { group: 'Admin', items: [
    { id: 'operators', label: 'Operators',   ico: Ico.users },
    { id: 'pricing',   label: 'Pricing',     ico: Ico.price, superOnly: true },
  ]},
];

const ROLE_LABELS = {
  super_admin:   'Super admin',
  company_admin: 'Company admin',
  dispatcher:    'Dispatcher',
};

function App() {
  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "theme": "dark",
    "density": "comfortable",
    "basePrice": 50,
    "trackingSpeed": 2,
    "role": "super_admin",
    "company": "horizon"
  }/*EDITMODE-END*/);

  // apply theme & density to :root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    document.documentElement.setAttribute('data-density', t.density);
  }, [t.theme, t.density]);

  const [route, setRoute] = useState('dashboard');

  // role: super_admin sees everything; company_admin / dispatcher only see one company
  const role = t.role;
  const company = role === 'super_admin' ? null : t.company;

  // route guards
  useEffect(() => {
    if (route === 'pricing' && role !== 'super_admin') setRoute('dashboard');
  }, [role, route]);

  const ctx = useMemo(() => ({
    role, company,
    setBasePrice: (v) => setTweak('basePrice', v),
    basePrice: t.basePrice,
    setTrackingSpeed: (v) => setTweak('trackingSpeed', v),
    trackingSpeed: t.trackingSpeed,
    companies: RW.COMPANIES, districts: RW.DISTRICTS, parks: RW.PARKS,
    stops: RW.STOPS, routes: RW.ROUTES, buses: RW.BUSES, drivers: RW.DRIVERS,
    operators: RW.OPERATORS, trips: RW.TRIPS,
    go: setRoute,
  }), [role, company, t.basePrice, t.trackingSpeed]);

  const userOperator = useMemo(() => {
    if (role === 'super_admin') return RW.OPERATORS.find(o => o.role === 'super_admin');
    return RW.OPERATORS.find(o => o.role === 'company_admin' && o.company === company)
        || RW.OPERATORS.find(o => o.company === company);
  }, [role, company]);

  const currentNav = NAV.flatMap(g => g.items).find(i => i.id === route);

  return (
    <div className="shell">
      <Sidebar route={route} setRoute={setRoute} role={role} company={company} ctx={ctx}/>
      <div className="workspace">
        <Topbar
          here={currentNav?.label || 'Dashboard'}
          here_ico={currentNav?.ico}
          role={role} company={company}
          setRole={(r) => setTweak('role', r)}
          setCompany={(c) => setTweak('company', c)}
          user={userOperator}
        />
        <div className="content">
          {route === 'dashboard' && <DashboardScreen ctx={ctx}/>}
          {route === 'map' &&       <MapEditorScreen ctx={ctx}/>}
          {route === 'track' &&     <LiveTrackScreen ctx={ctx}/>}
          {route === 'companies' && <CompaniesScreen ctx={ctx}/>}
          {route === 'buses' &&     <BusesScreen ctx={ctx}/>}
          {route === 'drivers' &&   <DriversScreen ctx={ctx}/>}
          {route === 'trips' &&     <TripsScreen ctx={ctx}/>}
          {route === 'operators' && <OperatorsScreen ctx={ctx}/>}
          {route === 'pricing' &&   <PricingScreen ctx={ctx}/>}
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Persona"/>
        <TweakRadio label="Role" value={t.role} onChange={v => setTweak('role', v)} options={[
          { value:'super_admin',  label:'Super' },
          { value:'company_admin',label:'Company' },
          { value:'dispatcher',   label:'Dispatch' },
        ]}/>
        {t.role !== 'super_admin' ? (
          <TweakSelect label="Company" value={t.company} onChange={v => setTweak('company', v)}
            options={RW.COMPANIES.map(c => ({ value: c.id, label: c.name }))}/>
        ) : null}

        <TweakSection label="Appearance"/>
        <TweakRadio label="Theme" value={t.theme} onChange={v => setTweak('theme', v)} options={[
          { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }
        ]}/>
        <TweakRadio label="Density" value={t.density} onChange={v => setTweak('density', v)} options={[
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'compact',     label: 'Compact' },
        ]}/>

        <TweakSection label="Pricing"/>
        <TweakSlider label="Base RWF / km" value={t.basePrice} min={20} max={120} step={5} unit=" RWF"
          onChange={v => setTweak('basePrice', v)}/>

        <TweakSection label="Tracking sim"/>
        <TweakRadio label="Sim speed" value={t.trackingSpeed} onChange={v => setTweak('trackingSpeed', v)} options={[
          { value:1, label:'×1' }, { value:2, label:'×2' }, { value:4, label:'×4' }, { value:8, label:'×8' }
        ]}/>
      </TweaksPanel>
    </div>
  );
}

// ============================================================
// Sidebar
// ============================================================
function Sidebar({ route, setRoute, role, company, ctx }) {
  const co = company ? RW.COMPANIES.find(c => c.id === company) : null;
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">RT</div>
        <div className="brand-text">
          <div className="brand-name">Rwanda Transit</div>
          <div className="brand-sub mono">OPS · v0.9.1</div>
        </div>
      </div>

      {NAV.map(group => (
        <div className="nav-group" key={group.group}>
          <div className="nav-group-title">{group.group}</div>
          {group.items.filter(i => !(i.superOnly && role !== 'super_admin')).map(item => {
            const Icon = item.ico;
            const count = countForNav(item.id, role, company);
            return (
              <div
                key={item.id}
                className={`nav-item ${route===item.id?'active':''}`}
                onClick={()=>setRoute(item.id)}
              >
                <Icon className="ico" />
                <span>{item.label}</span>
                {item.badge === 'live' ? <Badge live tone="ok" style={{marginLeft:'auto'}}>{count}</Badge>
                  : count != null ? <span className="count">{count}</span> : null}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{marginTop:'auto', padding: 12, borderTop: '1px solid var(--border)'}}>
        <div className="row-flex" style={{padding:'4px 6px'}}>
          {co ? (
            <span style={{width:22, height:22, borderRadius:5, background: co.color, color:'#051a0a', display:'grid', placeItems:'center', fontFamily:'IBM Plex Mono, monospace', fontSize:10, fontWeight:700}}>{co.short}</span>
          ) : (
            <span style={{width:22, height:22, borderRadius:5, background:'var(--bg-3)', display:'grid', placeItems:'center'}}>
              <Ico.users className="ico" style={{width:13, height:13}}/>
            </span>
          )}
          <div style={{minWidth:0, flex:1}}>
            <div style={{fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{co ? co.name : 'Network admin'}</div>
            <div className="mono tiny muted">{ROLE_LABELS[role]}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function countForNav(id, role, company) {
  if (id === 'track') {
    const list = role === 'super_admin' ? RW.BUSES : RW.BUSES.filter(b => b.company === company);
    return list.filter(b => b.status === 'live').length;
  }
  if (id === 'companies') return role === 'super_admin' ? RW.COMPANIES.length : null;
  if (id === 'buses')     return (role === 'super_admin' ? RW.BUSES : RW.BUSES.filter(b => b.company === company)).length;
  if (id === 'drivers')   return (role === 'super_admin' ? RW.DRIVERS : RW.DRIVERS.filter(d => d.company === company)).length;
  if (id === 'trips')     return (role === 'super_admin' ? RW.TRIPS : RW.TRIPS.filter(t => RW.BUSES.find(b => b.id === t.bus && b.company === company))).length;
  if (id === 'operators') return (role === 'super_admin' ? RW.OPERATORS : RW.OPERATORS.filter(o => o.company === company)).length;
  return null;
}

// ============================================================
// Topbar with crumbs, role switcher, search
// ============================================================
function Topbar({ here, here_ico, role, company, setRole, setCompany, user }) {
  const HereIcon = here_ico;
  return (
    <header className="topbar">
      <div className="crumbs">
        <span>Rwanda Transit Ops</span>
        <span className="sep">/</span>
        <span className="here row-flex">{HereIcon ? <HereIcon className="ico" /> : null}{here}</span>
      </div>

      <div className="topbar-right">
        <div className="search">
          <Ico.search />
          <input placeholder="Search routes, buses, drivers…" />
          <kbd>⌘K</kbd>
        </div>

        {role !== 'super_admin' ? (
          <select className="select" style={{width: 140, height: 30, padding: '4px 10px'}} value={company || ''} onChange={e=>setCompany(e.target.value)}>
            {RW.COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : null}

        <div className="role-pill" role="tablist" aria-label="Acting as">
          <button className={role==='super_admin'?'on':''} onClick={()=>setRole('super_admin')}>Super</button>
          <button className={role==='company_admin'?'on':''} onClick={()=>setRole('company_admin')}>Company</button>
          <button className={role==='dispatcher'?'on':''} onClick={()=>setRole('dispatcher')}>Dispatch</button>
        </div>

        <div className="row-flex" style={{paddingLeft: 6, borderLeft:'1px solid var(--border)'}}>
          {user ? <>
            <Avatar name={user.name} />
            <div style={{lineHeight:1.15}}>
              <div style={{fontSize:12, fontWeight:500}}>{user.name}</div>
              <div className="mono tiny muted">{user.email}</div>
            </div>
          </> : null}
        </div>
      </div>
    </header>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
