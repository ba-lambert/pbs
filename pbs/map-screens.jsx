/* global React, L, RW, Ico, Badge, Avatar, Button, Field, Card, Modal, Drawer, Toolbar, fmt, BusStatusBadge, TripStatusBadge */
const { useState: useState_M, useEffect: useEffect_M, useRef: useRef_M, useMemo: useMemo_M, useCallback: useCallback_M } = React;

// ============================================================
// useLeaflet — initializes a Leaflet map in a ref'd div
// ============================================================
function useLeaflet(opts = {}) {
  const ref = useRef_M(null);
  const [map, setMap] = useState_M(null);
  useEffect_M(() => {
    if (!ref.current || map) return;
    const m = L.map(ref.current, {
      center: opts.center || [-1.94, 30.06],
      zoom: opts.zoom || 9,
      zoomControl: opts.zoomControl !== false,
      attributionControl: true,
      preferCanvas: true,
      worldCopyJump: false,
    });
    // Dark-friendly OSM tiles via CARTO
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap · © CARTO',
      subdomains: 'abcd',
    }).addTo(m);
    setMap(m);
    return () => { m.remove(); };
    // eslint-disable-next-line
  }, []);
  return [ref, map];
}

// ============================================================
// Map editor — draw stops (polygon), parks (polygon), routes (linestring)
// ============================================================
function MapEditorScreen({ ctx }) {
  const [ref, map] = useLeaflet({ center: [-1.94, 30.06], zoom: 9 });
  const [tool, setTool] = useState_M('cursor'); // cursor | stop | park | route
  const [tab, setTab] = useState_M('stops');    // stops | parks | routes
  const [stops, setStops]   = useState_M(RW.STOPS);
  const [parks, setParks]   = useState_M(RW.PARKS);
  const [routes, setRoutes] = useState_M(RW.ROUTES);
  const [draftPts, setDraftPts] = useState_M([]);
  const [pendingDistrict, setPendingDistrict] = useState_M(null);
  const [selected, setSelected] = useState_M(null);

  // layer groups
  const groups = useRef_M({ stops: null, parks: null, routes: null, draft: null, hl: null });

  // (re)draw all features whenever data changes
  useEffect_M(() => {
    if (!map) return;
    if (!groups.current.stops) {
      groups.current.stops = L.layerGroup().addTo(map);
      groups.current.parks = L.layerGroup().addTo(map);
      groups.current.routes = L.layerGroup().addTo(map);
      groups.current.draft = L.layerGroup().addTo(map);
      groups.current.hl    = L.layerGroup().addTo(map);
    }
    const { stops: gs, parks: gp, routes: gr } = groups.current;
    gs.clearLayers(); gp.clearLayers(); gr.clearLayers();

    stops.forEach(s => {
      const poly = L.polygon(s.poly.map(([lng,lat])=>[lat,lng]), {
        color:'#4a8cff', weight: 1.5, fillColor:'#4a8cff', fillOpacity: 0.25
      }).addTo(gs);
      poly.bindTooltip(`${s.name}<br><span style="opacity:.6">${s.district}</span>`, { direction:'top', offset:[0,-4] });
      poly.on('click', () => { setSelected({ kind:'stop', item: s }); setTab('stops'); });
    });
    parks.forEach(p => {
      const poly = L.polygon(p.poly.map(([lng,lat])=>[lat,lng]), {
        color:'#f59e0b', weight: 1.5, fillColor:'#f59e0b', fillOpacity: 0.20
      }).addTo(gp);
      poly.bindTooltip(`${p.name}<br><span style="opacity:.6">PARK · ${p.district}</span>`, { direction:'top', offset:[0,-4] });
      poly.on('click', () => { setSelected({ kind:'park', item: p }); setTab('parks'); });
    });
    routes.forEach(r => {
      const co = RW.COMPANIES.find(c => c.id === r.company);
      const line = L.polyline(r.path.map(([lng,lat])=>[lat,lng]), {
        color: co?.color || '#22c55e', weight: 3, opacity: 0.85
      }).addTo(gr);
      line.bindTooltip(`${r.name}<br><span style="opacity:.6">${co?.name} · ${r.distance_km} km</span>`, { sticky:true });
      line.on('click', () => { setSelected({ kind:'route', item: r }); setTab('routes'); });
    });
  }, [map, stops, parks, routes]);

  // map click handler (drawing)
  useEffect_M(() => {
    if (!map) return;
    const onClick = (e) => {
      if (tool === 'cursor') return;
      setDraftPts(pts => [...pts, [e.latlng.lng, e.latlng.lat]]);
    };
    map.on('click', onClick);
    // change cursor based on tool
    map.getContainer().style.cursor = tool === 'cursor' ? '' : 'crosshair';
    return () => { map.off('click', onClick); };
  }, [map, tool]);

  // render draft
  useEffect_M(() => {
    if (!map || !groups.current.draft) return;
    const g = groups.current.draft;
    g.clearLayers();
    if (draftPts.length === 0) return;
    const latLngs = draftPts.map(([lng,lat])=>[lat,lng]);
    if (tool === 'route') {
      L.polyline(latLngs, { color: '#22c55e', weight: 3, dashArray: '5 4' }).addTo(g);
    } else if (tool === 'stop' || tool === 'park') {
      if (draftPts.length >= 3) {
        L.polygon(latLngs, { color: tool==='stop'?'#4a8cff':'#f59e0b', weight: 1.5, fillOpacity: 0.18, dashArray: '4 3' }).addTo(g);
      } else {
        L.polyline(latLngs, { color: tool==='stop'?'#4a8cff':'#f59e0b', weight: 1.5, dashArray: '4 3' }).addTo(g);
      }
    }
    draftPts.forEach(([lng,lat], i) => {
      L.circleMarker([lat,lng], { radius: 4, color:'#fff', weight: 1.5, fillColor: tool==='route'?'#22c55e':tool==='stop'?'#4a8cff':'#f59e0b', fillOpacity: 1 })
        .bindTooltip(String(i+1), { permanent: true, direction: 'right', offset: [6,0], className:'tiny' })
        .addTo(g);
    });
  }, [map, draftPts, tool]);

  const commit = (name) => {
    if (!name || draftPts.length < (tool === 'route' ? 2 : 3)) return;
    const id = `${tool}-${Math.random().toString(36).slice(2,7)}`;
    const center = draftPts.reduce(([sx,sy],[x,y])=>[sx+x,sy+y],[0,0]).map(v=>v/draftPts.length);
    if (tool === 'stop') {
      setStops(s => [...s, { id, name, district: pendingDistrict || 'nyarugenge', center, poly: draftPts }]);
      setTab('stops');
    } else if (tool === 'park') {
      setParks(p => [...p, { id, name, district: pendingDistrict || 'nyarugenge', center, poly: draftPts }]);
      setTab('parks');
    } else if (tool === 'route') {
      setRoutes(r => [...r, { id, name, company: ctx.role === 'super_admin' ? 'horizon' : ctx.company, stops: [], distance_km: roughKm(draftPts), path: draftPts }]);
      setTab('routes');
    }
    setDraftPts([]);
    setTool('cursor');
    setPendingDistrict(null);
  };

  const cancelDraft = () => { setDraftPts([]); setTool('cursor'); setPendingDistrict(null); };
  const undoPoint = () => setDraftPts(p => p.slice(0, -1));

  const counts = { stops: stops.length, parks: parks.length, routes: routes.length };

  return (
    <div className="page" style={{padding: '16px 22px 0'}}>
      <div className="page-head" style={{marginBottom: 14}}>
        <div>
          <div className="page-title">Map editor</div>
          <div className="page-sub">Stops & parks are <span className="mono">POLYGON</span> · Routes are <span className="mono">LINESTRING</span> · stored in PostGIS</div>
        </div>
        <div className="page-actions">
          <span className="mono tiny muted">Tool: <strong style={{color: 'var(--text-0)'}}>{tool.toUpperCase()}</strong></span>
          {draftPts.length > 0 ? <>
            <Button kind="ghost" sm onClick={undoPoint}>Undo point ({draftPts.length})</Button>
            <Button kind="ghost" sm onClick={cancelDraft}>Cancel</Button>
          </> : null}
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'320px 1fr', gap: 14, height: 'calc(100vh - 130px)'}}>
        {/* sidebar with feature lists */}
        <div className="card" style={{display:'flex', flexDirection:'column', overflow:'hidden'}}>
          <div className="toolbar" style={{padding:'8px 10px'}}>
            {['stops','parks','routes'].map(t => (
              <span key={t} className={`chip ${tab===t?'on':''}`} onClick={()=>setTab(t)}>
                {t[0].toUpperCase()+t.slice(1)} <span className="mono tiny">{counts[t]}</span>
              </span>
            ))}
          </div>
          <div className="scroll-y" style={{flex:1}}>
            {tab==='stops' && stops.map(s => (
              <FeatureRow key={s.id} active={selected?.item?.id===s.id} onClick={()=>{ setSelected({kind:'stop', item:s}); map?.flyTo([s.center[1], s.center[0]], 14); }}
                title={s.name} sub={`${RW.DISTRICTS.find(d=>d.id===s.district)?.name} · ${s.poly.length-1} vertices`} tone="info"/>
            ))}
            {tab==='parks' && parks.map(p => (
              <FeatureRow key={p.id} active={selected?.item?.id===p.id} onClick={()=>{ setSelected({kind:'park', item:p}); map?.flyTo([p.center[1], p.center[0]], 14); }}
                title={p.name} sub={`${RW.DISTRICTS.find(d=>d.id===p.district)?.name} · ${p.poly.length-1} vertices`} tone="warn"/>
            ))}
            {tab==='routes' && routes.map(r => {
              const co = RW.COMPANIES.find(c=>c.id===r.company);
              return (
                <FeatureRow key={r.id} active={selected?.item?.id===r.id} onClick={()=>{ setSelected({kind:'route', item:r}); map?.flyToBounds(r.path.map(([lng,lat])=>[lat,lng])); }}
                  title={r.name} sub={<><span className="tag-dot" style={{background:co?.color}}/> {co?.name} · {fmt.km(r.distance_km)} · {r.path.length} waypoints</>} tone={null} dotColor={co?.color}/>
              );
            })}
          </div>
        </div>

        {/* map */}
        <div className="map-frame" style={{height:'100%'}}>
          <div ref={ref} style={{position:'absolute', inset:0}} />

          {/* draw tools */}
          <div className="map-overlay tl draw-tools">
            <button className={tool==='cursor'?'on':''} onClick={()=>setTool('cursor')} title="Select"><Ico.cursor/></button>
            <div className="sep"/>
            <button className={tool==='stop'?'on':''} onClick={()=>{setTool('stop'); setDraftPts([]);}} title="Draw stop (polygon)"><Ico.pin/></button>
            <button className={tool==='park'?'on':''} onClick={()=>{setTool('park'); setDraftPts([]);}} title="Draw park (polygon)"><Ico.poly/></button>
            <button className={tool==='route'?'on':''} onClick={()=>{setTool('route'); setDraftPts([]);}} title="Draw route (linestring)"><Ico.line/></button>
          </div>

          {/* legend / instruction */}
          <div className="map-overlay tr" style={{minWidth: 220}}>
            {tool === 'cursor' ? <>
              <div className="upcase muted" style={{marginBottom: 8}}>Legend</div>
              <div className="col-flex" style={{gap:6}}>
                <LegendItem color="#4a8cff" label="Stop polygon" />
                <LegendItem color="#f59e0b" label="Bus park polygon" />
                <LegendItem color="#22c55e" label="Route (linestring)" line/>
              </div>
              <div className="divider"/>
              <div className="muted tiny">Click a tool ← to draw. Click any feature to inspect.</div>
            </> : <>
              <div className="upcase muted" style={{marginBottom: 6}}>Drawing {tool}</div>
              <div className="tiny muted" style={{marginBottom: 8}}>
                {tool === 'route'
                  ? 'Click to add waypoints. Minimum 2 points. Connect through parks for transfers.'
                  : 'Click to add vertices. Minimum 3 points to form a polygon.'}
              </div>
              <div className="mono tiny" style={{marginBottom:8}}>{draftPts.length} points</div>
              <CommitForm tool={tool} disabled={draftPts.length < (tool==='route'?2:3)}
                pendingDistrict={pendingDistrict} setPendingDistrict={setPendingDistrict}
                onCommit={commit} onCancel={cancelDraft}/>
            </>}
          </div>

          {/* selection panel */}
          {selected && tool === 'cursor' ? (
            <div className="map-overlay bl" style={{minWidth: 280, maxWidth: 320}}>
              <div className="between" style={{marginBottom: 8}}>
                <div className="upcase muted">{selected.kind}</div>
                <button className="btn ghost sm" onClick={()=>setSelected(null)}><Ico.close className="ico"/></button>
              </div>
              <div style={{fontSize:14, fontWeight:600, marginBottom: 4}}>{selected.item.name}</div>
              <div className="mono tiny muted" style={{marginBottom:10}}>{selected.item.id}</div>
              <div className="col-flex" style={{gap:4}}>
                {selected.kind === 'stop' || selected.kind === 'park' ? (
                  <>
                    <KVRow k="District" v={RW.DISTRICTS.find(d=>d.id===selected.item.district)?.name}/>
                    <KVRow k="Vertices" v={selected.item.poly.length - 1}/>
                    <KVRow k="Geometry" v={<span className="mono tiny">POLYGON</span>}/>
                  </>
                ) : (
                  <>
                    <KVRow k="Company" v={RW.COMPANIES.find(c=>c.id===selected.item.company)?.name}/>
                    <KVRow k="Distance" v={fmt.km(selected.item.distance_km)}/>
                    <KVRow k="Stops" v={selected.item.stops?.length || 0}/>
                    <KVRow k="Waypoints" v={selected.item.path.length}/>
                    <KVRow k="Geometry" v={<span className="mono tiny">LINESTRING</span>}/>
                  </>
                )}
              </div>
              <div className="row-flex" style={{marginTop: 10}}>
                <Button kind="ghost" sm icon={Ico.edit}>Edit</Button>
                <Button kind="ghost" sm icon={Ico.trash}>Delete</Button>
              </div>
            </div>
          ) : null}

          <div className="map-overlay br" style={{display:'flex', gap: 10, alignItems:'center'}}>
            <Badge>Click features to inspect</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ title, sub, onClick, active, tone, dotColor }) {
  return (
    <div onClick={onClick} style={{padding:'10px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer', background: active ? 'var(--bg-3)' : 'transparent', display:'flex', alignItems:'flex-start', gap:10}}>
      <span className="tag-dot" style={{marginTop: 5, background: dotColor || (tone==='info'?'#4a8cff':tone==='warn'?'#f59e0b':'#22c55e')}}/>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:12.5, fontWeight: 500}}>{title}</div>
        <div className="muted tiny" style={{marginTop:2, display:'flex', gap:5, alignItems:'center', flexWrap:'wrap'}}>{sub}</div>
      </div>
    </div>
  );
}
function LegendItem({ color, label, line }) {
  return (
    <div className="row-flex">
      {line ? <span style={{display:'inline-block', width: 18, height:3, background: color, borderRadius: 2}}/>
            : <span style={{display:'inline-block', width: 10, height:10, background: color, opacity:.4, border:`1.5px solid ${color}`, borderRadius:2}}/>}
      <span className="tiny">{label}</span>
    </div>
  );
}
function KVRow({ k, v }) {
  return <div className="between" style={{padding:'4px 0', borderBottom:'1px dashed var(--border)'}}><span className="muted tiny">{k}</span><span className="tiny">{v}</span></div>;
}
function CommitForm({ tool, disabled, pendingDistrict, setPendingDistrict, onCommit, onCancel }) {
  const [name, setName] = useState_M('');
  return (
    <div className="col-flex" style={{gap:8}}>
      <Field label="Name"><input className="input" placeholder={tool==='route'?'e.g. Kigali → Karongi':'e.g. Ruyenzi Stop'} value={name} onChange={e=>setName(e.target.value)}/></Field>
      {tool !== 'route' ? (
        <Field label="District">
          <select className="select" value={pendingDistrict || ''} onChange={e=>setPendingDistrict(e.target.value)}>
            <option value="">— pick district —</option>
            {RW.DISTRICTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
      ) : null}
      <div className="row-flex">
        <Button kind="ghost" sm onClick={onCancel}>Cancel</Button>
        <Button kind="primary" sm icon={Ico.check} disabled={disabled || !name} onClick={()=>onCommit(name)}>Save {tool}</Button>
      </div>
    </div>
  );
}

function roughKm(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [lng1, lat1] = pts[i-1], [lng2, lat2] = pts[i];
    const dx = (lng2 - lng1) * 111 * Math.cos(((lat1+lat2)/2) * Math.PI / 180);
    const dy = (lat2 - lat1) * 111;
    total += Math.sqrt(dx*dx + dy*dy);
  }
  return Math.round(total * 10) / 10;
}

// ============================================================
// Live tracking — animated buses + WS feed panel
// ============================================================
function LiveTrackScreen({ ctx }) {
  const [ref, map] = useLeaflet({ center: [-1.94, 30.06], zoom: 8 });
  const [selectedBus, setSelectedBus] = useState_M(null);
  const [feed, setFeed] = useState_M([]);
  const [now, setNow] = useState_M(0);
  const [paused, setPaused] = useState_M(false);
  const speed = ctx.trackingSpeed || 1;

  const visibleBuses = useMemo_M(() => {
    const list = ctx.buses.filter(b => b.status === 'live' || b.status === 'stale');
    return ctx.role === 'super_admin' ? list : list.filter(b => b.company === ctx.company);
  }, [ctx.buses, ctx.role, ctx.company]);

  // assign each bus a progress along its route (start staggered)
  const stateRef = useRef_M({});
  useEffect_M(() => {
    visibleBuses.forEach((b, i) => {
      if (!stateRef.current[b.id]) {
        stateRef.current[b.id] = {
          t: (i * 0.13 + 0.05) % 1,
          direction: 1,
        };
      }
    });
  }, [visibleBuses]);

  // animation loop
  useEffect_M(() => {
    let raf;
    let last = performance.now();
    const tick = (t) => {
      const dt = (t - last) / 1000; last = t;
      if (!paused) setNow(n => n + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  // bus markers
  const markersRef = useRef_M({});
  const routeLinesRef = useRef_M(null);

  // draw stops & routes once
  useEffect_M(() => {
    if (!map) return;
    if (routeLinesRef.current) return;
    const g = L.layerGroup().addTo(map);
    RW.STOPS.forEach(s => {
      L.circleMarker([s.center[1], s.center[0]], { radius: 3, color: '#4a8cff', weight: 1, fillColor:'#4a8cff', fillOpacity: 0.6 })
        .bindTooltip(s.name, { direction: 'top', offset:[0,-4] })
        .addTo(g);
    });
    RW.PARKS.forEach(p => {
      L.rectangle([
        [p.poly[0][1], p.poly[0][0]],
        [p.poly[2][1], p.poly[2][0]]
      ], { color: '#f59e0b', weight: 1.5, fillOpacity: 0.2 })
        .bindTooltip(`${p.name} · PARK`, { direction: 'top', offset:[0,-4] })
        .addTo(g);
    });
    RW.ROUTES.forEach(r => {
      const co = RW.COMPANIES.find(c => c.id === r.company);
      L.polyline(r.path.map(([lng,lat])=>[lat,lng]), {
        color: co?.color || '#22c55e', weight: 2, opacity: 0.5
      }).bindTooltip(r.name).addTo(g);
    });
    routeLinesRef.current = g;
  }, [map]);

  // move bus markers
  useEffect_M(() => {
    if (!map) return;
    visibleBuses.forEach(b => {
      const route = RW.ROUTES.find(r => r.id === b.route);
      if (!route) return;
      const st = stateRef.current[b.id];
      if (!st) return;
      // advance
      const segs = route.path.length - 1;
      const advance = (b.speed / 60 / 60) * (1 / route.distance_km) * (now * 60) * speed;
      const tNow = (st.t + advance * 0.0006 * speed) % 1;
      // Actually simpler: bind to a time-progress using sin oscillation so buses bounce route
      const cycle = ((now * speed * 0.02) + (st.t || 0)) % 2;
      const u = cycle < 1 ? cycle : (2 - cycle);
      const idx = u * segs;
      const i0 = Math.floor(idx);
      const i1 = Math.min(i0 + 1, segs);
      const f = idx - i0;
      const [lng0, lat0] = route.path[i0];
      const [lng1, lat1] = route.path[i1];
      const lat = lat0 + (lat1 - lat0) * f;
      const lng = lng0 + (lng1 - lng0) * f;
      const bearing = Math.atan2(lng1 - lng0, lat1 - lat0) * 180 / Math.PI;

      if (!markersRef.current[b.id]) {
        const icon = L.divIcon({
          className: '',
          html: `<div class="bus-marker ${b.status === 'stale' ? 'stale' : ''}" style="transform: rotate(${bearing}deg);">${b.id.slice(-2)}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const m = L.marker([lat, lng], { icon }).addTo(map);
        m.bindTooltip(b.id, { direction:'top', offset:[0,-12] });
        m.on('click', () => setSelectedBus(b));
        markersRef.current[b.id] = m;
      } else {
        markersRef.current[b.id].setLatLng([lat, lng]);
        const el = markersRef.current[b.id].getElement();
        if (el) {
          const inner = el.querySelector('.bus-marker');
          if (inner) inner.style.transform = `rotate(${bearing}deg)`;
        }
      }
    });
  }, [now, map, visibleBuses, speed]);

  // synthesize WS feed
  useEffect_M(() => {
    if (paused) return;
    const id = setInterval(() => {
      const b = visibleBuses[Math.floor(Math.random() * visibleBuses.length)];
      if (!b) return;
      const r = RW.ROUTES.find(r => r.id === b.route);
      const stamp = new Date().toLocaleTimeString('en-GB');
      const ev = Math.random() < 0.06 ? 'enter' : Math.random() < 0.04 ? 'depart' : 'ping';
      const m = markersRef.current[b.id];
      const ll = m?.getLatLng();
      const item = {
        t: stamp,
        ev,
        id: b.id,
        tone: ev === 'enter' ? 'info' : ev === 'depart' ? 'info' : '',
        v: ev === 'ping'
          ? `${b.speed} km/h · ${ll ? ll.lat.toFixed(4)+','+ll.lng.toFixed(4) : ''}`
          : ev === 'enter'
            ? `Stop: ${RW.STOPS[Math.floor(Math.random()*RW.STOPS.length)].name}`
            : `Park: ${RW.PARKS[Math.floor(Math.random()*RW.PARKS.length)].name}`,
        route: r?.name || '',
      };
      setFeed(f => [item, ...f].slice(0, 50));
    }, 900 / speed);
    return () => clearInterval(id);
  }, [visibleBuses, paused, speed]);

  // selected bus follow
  useEffect_M(() => {
    if (!map || !selectedBus) return;
    const m = markersRef.current[selectedBus.id];
    if (m) map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 11), { duration: 0.5 });
  }, [selectedBus, map]);

  return (
    <div className="page" style={{padding: '16px 22px 0'}}>
      <div className="page-head" style={{marginBottom: 14}}>
        <div>
          <div className="page-title">Live tracking</div>
          <div className="page-sub">Realtime GPS via on-bus IMEI · 30s heartbeat · <Badge live>WS connected</Badge></div>
        </div>
        <div className="page-actions">
          <span className="mono tiny muted">{visibleBuses.length} buses streaming</span>
          <Button kind="ghost" sm onClick={()=>setPaused(p => !p)}>{paused ? '▶ Resume' : '⏸ Pause'}</Button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns: '1fr 360px', gap: 14, height: 'calc(100vh - 130px)'}}>
        <div className="map-frame" style={{height:'100%'}}>
          <div ref={ref} style={{position:'absolute', inset: 0}} />

          {/* legend */}
          <div className="map-overlay tl">
            <div className="upcase muted" style={{marginBottom: 8}}>Streaming</div>
            <div className="col-flex" style={{gap:6}}>
              <div className="row-flex"><span style={{width:14, height:14, borderRadius:4, background:'var(--accent)', border:'2px solid var(--bg-0)'}}/><span className="tiny">Live · {visibleBuses.filter(b=>b.status==='live').length}</span></div>
              <div className="row-flex"><span style={{width:14, height:14, borderRadius:4, background:'var(--warn)', border:'2px solid var(--bg-0)'}}/><span className="tiny">Stale GPS · {visibleBuses.filter(b=>b.status==='stale').length}</span></div>
            </div>
          </div>

          {/* per-company filter */}
          <div className="map-overlay tr" style={{minWidth: 200}}>
            <div className="upcase muted" style={{marginBottom: 8}}>Companies</div>
            <div className="col-flex" style={{gap:5}}>
              {RW.COMPANIES.map(co => {
                const list = visibleBuses.filter(b => b.company === co.id);
                return (
                  <div key={co.id} className="between">
                    <div className="row-flex">
                      <span className="tag-dot" style={{background: co.color}}/>
                      <span className="tiny">{co.short}</span>
                    </div>
                    <span className="mono tiny muted">{list.length}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* selected bus card */}
          {selectedBus ? (
            <div className="map-overlay bl" style={{minWidth: 280, maxWidth: 320}}>
              <div className="between" style={{marginBottom: 6}}>
                <div className="row-flex"><span className="mono" style={{fontWeight:600}}>{selectedBus.id}</span> <BusStatusBadge s={selectedBus.status}/></div>
                <button className="btn ghost sm" onClick={()=>setSelectedBus(null)}><Ico.close className="ico"/></button>
              </div>
              <div className="muted tiny" style={{marginBottom:8}}>{selectedBus.plate} · {selectedBus.model}</div>
              <div className="col-flex" style={{gap:4}}>
                <KVRow k="Route" v={RW.ROUTES.find(r=>r.id===selectedBus.route)?.name}/>
                <KVRow k="Driver" v={ctx.drivers.find(d=>d.id===selectedBus.driver)?.name}/>
                <KVRow k="Speed" v={<span className="mono">{selectedBus.speed} km/h</span>}/>
                <KVRow k="Battery" v={<span className="mono">{selectedBus.batt}%</span>}/>
                <KVRow k="IMEI" v={<span className="mono tiny">{selectedBus.imei}</span>}/>
              </div>
              <div className="row-flex" style={{marginTop: 10}}>
                <Button kind="ghost" sm icon={Ico.signal}>Ping</Button>
                <Button kind="ghost" sm>Message driver</Button>
              </div>
            </div>
          ) : null}

          <div className="map-overlay br">
            <div className="row-flex">
              <span className="mono tiny muted">Sim speed</span>
              {[1,2,4,8].map(s => (
                <span key={s} className={`chip ${ctx.trackingSpeed===s?'on':''}`} onClick={()=>ctx.setTrackingSpeed(s)}>×{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* WS feed sidebar */}
        <div className="card" style={{display:'flex', flexDirection:'column', overflow:'hidden'}}>
          <div className="toolbar" style={{padding:'10px 14px'}}>
            <div className="row-flex">
              <Badge live>WS</Badge>
              <span className="upcase muted">GPS event stream</span>
            </div>
            <div className="grow"/>
            <span className="mono tiny muted">{feed.length} / 50</span>
          </div>
          <div className="scroll-y feed" style={{flex:1, padding:'4px 14px 14px'}}>
            {feed.length === 0 ? (
              <div className="empty">
                <Ico.signal/>
                <div>Connecting to telemetry stream…</div>
                <div className="muted tiny">wss://api.rtops.rw/track/v1</div>
              </div>
            ) : null}
            {feed.map((f, i) => (
              <div key={i} className="feed-row">
                <span className="t">{f.t}</span>
                <span className={`ev ${f.tone}`}>{f.ev}</span>
                <span className="id">{f.id}</span>
                <span className="v">{f.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MapEditorScreen, LiveTrackScreen });
