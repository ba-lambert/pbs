// === Rwanda Transit Ops — seed data ===
// 5 provinces, 30 districts. Coordinates approximated for prototype.

window.RW = (function () {
  const PROVINCES = [
    { id: 'kgl', name: 'Kigali City', short: 'KGL' },
    { id: 'n',   name: 'Northern',    short: 'N' },
    { id: 's',   name: 'Southern',    short: 'S' },
    { id: 'e',   name: 'Eastern',     short: 'E' },
    { id: 'w',   name: 'Western',     short: 'W' },
  ];

  // [lng, lat]
  const DISTRICTS = [
    // Kigali
    { id: 'nyarugenge', name: 'Nyarugenge', province: 'kgl', center: [30.058, -1.9476] },
    { id: 'gasabo',     name: 'Gasabo',     province: 'kgl', center: [30.114, -1.9111] },
    { id: 'kicukiro',   name: 'Kicukiro',   province: 'kgl', center: [30.105, -1.9836] },
    // Northern
    { id: 'burera',     name: 'Burera',     province: 'n',   center: [29.872, -1.469] },
    { id: 'gakenke',    name: 'Gakenke',    province: 'n',   center: [29.768, -1.685] },
    { id: 'gicumbi',    name: 'Gicumbi',    province: 'n',   center: [30.110, -1.580] },
    { id: 'musanze',    name: 'Musanze',    province: 'n',   center: [29.633, -1.499] },
    { id: 'rulindo',    name: 'Rulindo',    province: 'n',   center: [30.063, -1.776] },
    // Southern
    { id: 'gisagara',   name: 'Gisagara',   province: 's',   center: [29.860, -2.609] },
    { id: 'huye',       name: 'Huye',       province: 's',   center: [29.738, -2.595] },
    { id: 'kamonyi',    name: 'Kamonyi',    province: 's',   center: [29.906, -2.024] },
    { id: 'muhanga',    name: 'Muhanga',    province: 's',   center: [29.756, -2.085] },
    { id: 'nyamagabe',  name: 'Nyamagabe',  province: 's',   center: [29.512, -2.474] },
    { id: 'nyanza',     name: 'Nyanza',     province: 's',   center: [29.747, -2.351] },
    { id: 'nyaruguru',  name: 'Nyaruguru',  province: 's',   center: [29.420, -2.708] },
    { id: 'ruhango',    name: 'Ruhango',    province: 's',   center: [29.776, -2.232] },
    // Eastern
    { id: 'bugesera',   name: 'Bugesera',   province: 'e',   center: [30.190, -2.220] },
    { id: 'gatsibo',    name: 'Gatsibo',    province: 'e',   center: [30.426, -1.580] },
    { id: 'kayonza',    name: 'Kayonza',    province: 'e',   center: [30.621, -1.879] },
    { id: 'kirehe',     name: 'Kirehe',     province: 'e',   center: [30.706, -2.219] },
    { id: 'ngoma',      name: 'Ngoma',      province: 'e',   center: [30.480, -2.143] },
    { id: 'nyagatare',  name: 'Nyagatare',  province: 'e',   center: [30.327, -1.297] },
    { id: 'rwamagana',  name: 'Rwamagana',  province: 'e',   center: [30.434, -1.949] },
    // Western
    { id: 'karongi',    name: 'Karongi',    province: 'w',   center: [29.391, -2.073] },
    { id: 'ngororero',  name: 'Ngororero',  province: 'w',   center: [29.628, -1.870] },
    { id: 'nyabihu',    name: 'Nyabihu',    province: 'w',   center: [29.503, -1.654] },
    { id: 'nyamasheke', name: 'Nyamasheke', province: 'w',   center: [29.140, -2.396] },
    { id: 'rubavu',     name: 'Rubavu',     province: 'w',   center: [29.357, -1.679] },
    { id: 'rusizi',     name: 'Rusizi',     province: 'w',   center: [28.907, -2.483] },
    { id: 'rutsiro',    name: 'Rutsiro',    province: 'w',   center: [29.331, -1.929] },
  ];

  const COMPANIES = [
    {
      id: 'yahoo', name: 'Yahoo Express', short: 'YHO', color: '#4a8cff',
      province: 'e', founded: '2014',
      districts: ['bugesera','gatsibo','kayonza','kirehe','ngoma','nyagatare','rwamagana'],
      hq: 'Rwamagana',
    },
    {
      id: 'horizon', name: 'Horizon Coaches', short: 'HZN', color: '#22c55e',
      province: 's', founded: '2011',
      districts: ['gisagara','huye','kamonyi','muhanga','nyamagabe','nyanza','nyaruguru','ruhango'],
      hq: 'Huye',
    },
    {
      id: 'volcano', name: 'Volcano Lines', short: 'VLC', color: '#f59e0b',
      province: 'n', founded: '2009',
      districts: ['burera','gakenke','gicumbi','musanze','rulindo'],
      hq: 'Musanze',
    },
  ];

  // Stops & parks — polygons (small bboxes around centers)
  // Bus parks are larger polygons, stops are smaller.
  function bboxPoly(center, w, h) {
    const [lng, lat] = center;
    return [
      [lng - w, lat - h],
      [lng + w, lat - h],
      [lng + w, lat + h],
      [lng - w, lat + h],
      [lng - w, lat - h],
    ];
  }

  const PARKS = [
    { id: 'park-nyabugogo', name: 'Nyabugogo Bus Park',  district: 'nyarugenge', center: [30.0455, -1.9395], poly: bboxPoly([30.0455, -1.9395], 0.0025, 0.0018) },
    { id: 'park-remera',    name: 'Remera Taxi Park',    district: 'gasabo',     center: [30.111, -1.957],  poly: bboxPoly([30.111, -1.957], 0.0018, 0.0014) },
    { id: 'park-nyanza',    name: 'Nyanza Park',         district: 'nyanza',     center: [29.747, -2.351],  poly: bboxPoly([29.747, -2.351], 0.0020, 0.0015) },
    { id: 'park-huye',      name: 'Huye Central Park',   district: 'huye',       center: [29.738, -2.595],  poly: bboxPoly([29.738, -2.595], 0.0020, 0.0015) },
    { id: 'park-muhanga',   name: 'Muhanga Park',        district: 'muhanga',    center: [29.756, -2.085],  poly: bboxPoly([29.756, -2.085], 0.0018, 0.0014) },
    { id: 'park-ruhango',   name: 'Ruhango Park',        district: 'ruhango',    center: [29.776, -2.232],  poly: bboxPoly([29.776, -2.232], 0.0018, 0.0014) },
    { id: 'park-musanze',   name: 'Musanze Park',        district: 'musanze',    center: [29.633, -1.499],  poly: bboxPoly([29.633, -1.499], 0.0020, 0.0015) },
    { id: 'park-rubavu',    name: 'Rubavu Park',         district: 'rubavu',     center: [29.357, -1.679],  poly: bboxPoly([29.357, -1.679], 0.0020, 0.0015) },
    { id: 'park-rwamagana', name: 'Rwamagana Park',      district: 'rwamagana',  center: [30.434, -1.949],  poly: bboxPoly([30.434, -1.949], 0.0020, 0.0015) },
    { id: 'park-nyagatare', name: 'Nyagatare Park',      district: 'nyagatare',  center: [30.327, -1.297],  poly: bboxPoly([30.327, -1.297], 0.0020, 0.0015) },
  ];

  const STOPS = [
    { id: 'stop-ruyenzi',   name: 'Ruyenzi Stop',     district: 'kamonyi',  center: [29.913, -2.024], poly: bboxPoly([29.913, -2.024], 0.0008, 0.0006) },
    { id: 'stop-kamonyi',   name: 'Kamonyi Center',   district: 'kamonyi',  center: [29.906, -2.060], poly: bboxPoly([29.906, -2.060], 0.0008, 0.0006) },
    { id: 'stop-gitarama',  name: 'Gitarama Junction',district: 'muhanga',  center: [29.768, -2.073], poly: bboxPoly([29.768, -2.073], 0.0008, 0.0006) },
    { id: 'stop-kabgayi',   name: 'Kabgayi',          district: 'muhanga',  center: [29.755, -2.122], poly: bboxPoly([29.755, -2.122], 0.0008, 0.0006) },
    { id: 'stop-byimana',   name: 'Byimana',          district: 'ruhango',  center: [29.763, -2.179], poly: bboxPoly([29.763, -2.179], 0.0008, 0.0006) },
    { id: 'stop-kinazi',    name: 'Kinazi',           district: 'ruhango',  center: [29.781, -2.270], poly: bboxPoly([29.781, -2.270], 0.0008, 0.0006) },
    { id: 'stop-busasamana',name: 'Busasamana',       district: 'nyanza',   center: [29.751, -2.330], poly: bboxPoly([29.751, -2.330], 0.0008, 0.0006) },
    { id: 'stop-save',      name: 'Save',             district: 'huye',     center: [29.741, -2.495], poly: bboxPoly([29.741, -2.495], 0.0008, 0.0006) },
    { id: 'stop-shyogwe',   name: 'Shyogwe',          district: 'muhanga',  center: [29.749, -2.105], poly: bboxPoly([29.749, -2.105], 0.0008, 0.0006) },
    { id: 'stop-kabuye',    name: 'Kabuye',           district: 'gasabo',   center: [30.085, -1.892], poly: bboxPoly([30.085, -1.892], 0.0008, 0.0006) },
    { id: 'stop-jabana',    name: 'Jabana',           district: 'gasabo',   center: [30.040, -1.880], poly: bboxPoly([30.040, -1.880], 0.0008, 0.0006) },
    { id: 'stop-base',      name: 'Base',             district: 'rulindo',  center: [30.038, -1.840], poly: bboxPoly([30.038, -1.840], 0.0008, 0.0006) },
    { id: 'stop-shyorongi', name: 'Shyorongi',        district: 'rulindo',  center: [30.013, -1.792], poly: bboxPoly([30.013, -1.792], 0.0008, 0.0006) },
    { id: 'stop-kinihira',  name: 'Kinihira',         district: 'rulindo',  center: [29.937, -1.667], poly: bboxPoly([29.937, -1.667], 0.0008, 0.0006) },
    { id: 'stop-byumba',    name: 'Byumba',           district: 'gicumbi',  center: [30.073, -1.575], poly: bboxPoly([30.073, -1.575], 0.0008, 0.0006) },
    { id: 'stop-kinigi',    name: 'Kinigi',           district: 'musanze',  center: [29.602, -1.435], poly: bboxPoly([29.602, -1.435], 0.0008, 0.0006) },
    { id: 'stop-ruhengeri', name: 'Ruhengeri Town',   district: 'musanze',  center: [29.634, -1.501], poly: bboxPoly([29.634, -1.501], 0.0008, 0.0006) },
    { id: 'stop-mukamira',  name: 'Mukamira',         district: 'nyabihu',  center: [29.560, -1.580], poly: bboxPoly([29.560, -1.580], 0.0008, 0.0006) },
    { id: 'stop-kabarore',  name: 'Kabarore',         district: 'gatsibo',  center: [30.432, -1.640], poly: bboxPoly([30.432, -1.640], 0.0008, 0.0006) },
    { id: 'stop-kayonza-c', name: 'Kayonza Center',   district: 'kayonza',  center: [30.621, -1.879], poly: bboxPoly([30.621, -1.879], 0.0008, 0.0006) },
    { id: 'stop-rwinkwavu', name: 'Rwinkwavu',        district: 'kayonza',  center: [30.665, -2.000], poly: bboxPoly([30.665, -2.000], 0.0008, 0.0006) },
    { id: 'stop-kibungo',   name: 'Kibungo',          district: 'ngoma',    center: [30.479, -2.158], poly: bboxPoly([30.479, -2.158], 0.0008, 0.0006) },
  ];

  // Routes — linestrings of [lng, lat] points.
  const ROUTES = [
    {
      id: 'r-kgl-huye', name: 'Kigali → Huye', company: 'horizon',
      stops: ['park-nyabugogo','stop-ruyenzi','stop-kamonyi','stop-gitarama','park-muhanga','stop-byimana','park-ruhango','stop-kinazi','stop-busasamana','park-nyanza','stop-save','park-huye'],
      distance_km: 134.7,
      path: [
        [30.0455,-1.9395],[30.0,-1.97],[29.95,-1.99],[29.913,-2.024],[29.85,-2.04],[29.788,-2.067],[29.756,-2.085],[29.763,-2.179],[29.776,-2.232],[29.781,-2.270],[29.751,-2.330],[29.747,-2.351],[29.741,-2.495],[29.738,-2.595]
      ]
    },
    {
      id: 'r-kgl-musanze', name: 'Kigali → Musanze', company: 'volcano',
      stops: ['park-nyabugogo','stop-jabana','stop-base','stop-shyorongi','stop-kinihira','stop-mukamira','park-musanze'],
      distance_km: 99.4,
      path: [
        [30.0455,-1.9395],[30.040,-1.880],[30.038,-1.840],[30.013,-1.792],[29.937,-1.667],[29.860,-1.620],[29.760,-1.555],[29.660,-1.520],[29.633,-1.499]
      ]
    },
    {
      id: 'r-kgl-rwamagana', name: 'Kigali → Rwamagana', company: 'yahoo',
      stops: ['park-nyabugogo','park-remera','park-rwamagana'],
      distance_km: 54.2,
      path: [
        [30.0455,-1.9395],[30.080,-1.950],[30.111,-1.957],[30.200,-1.952],[30.300,-1.948],[30.434,-1.949]
      ]
    },
    {
      id: 'r-kgl-kayonza', name: 'Kigali → Kayonza', company: 'yahoo',
      stops: ['park-nyabugogo','park-remera','park-rwamagana','stop-kayonza-c'],
      distance_km: 87.6,
      path: [
        [30.0455,-1.9395],[30.111,-1.957],[30.434,-1.949],[30.520,-1.910],[30.621,-1.879]
      ]
    },
    {
      id: 'r-kgl-nyagatare', name: 'Kigali → Nyagatare', company: 'yahoo',
      stops: ['park-nyabugogo','park-rwamagana','stop-kabarore','park-nyagatare'],
      distance_km: 154.2,
      path: [
        [30.0455,-1.9395],[30.111,-1.957],[30.434,-1.949],[30.420,-1.780],[30.432,-1.640],[30.380,-1.480],[30.327,-1.297]
      ]
    },
    {
      id: 'r-kgl-byumba', name: 'Kigali → Byumba', company: 'volcano',
      stops: ['park-nyabugogo','stop-jabana','stop-shyorongi','stop-byumba'],
      distance_km: 67.3,
      path: [
        [30.0455,-1.9395],[30.040,-1.880],[30.013,-1.792],[30.063,-1.700],[30.073,-1.575]
      ]
    },
    {
      id: 'r-kgl-rubavu', name: 'Kigali → Rubavu', company: 'volcano',
      stops: ['park-nyabugogo','park-musanze','park-rubavu'],
      distance_km: 158.8,
      path: [
        [30.0455,-1.9395],[29.937,-1.667],[29.760,-1.555],[29.633,-1.499],[29.500,-1.580],[29.430,-1.640],[29.357,-1.679]
      ]
    },
    {
      id: 'r-kgl-ngoma', name: 'Kigali → Kibungo', company: 'yahoo',
      stops: ['park-nyabugogo','park-rwamagana','stop-kibungo'],
      distance_km: 98.4,
      path: [
        [30.0455,-1.9395],[30.111,-1.957],[30.434,-1.949],[30.479,-2.158]
      ]
    },
  ];

  // Buses
  const BUSES = [
    { id: 'B-1041', plate: 'RAB 041 A', company: 'horizon', model: 'Toyota Coaster',  seats: 30, imei: '861234042100141', driver: 'D-014', route: 'r-kgl-huye',     status: 'live',     speed: 64, batt: 92 },
    { id: 'B-1042', plate: 'RAB 042 A', company: 'horizon', model: 'Toyota Coaster',  seats: 30, imei: '861234042100142', driver: 'D-021', route: 'r-kgl-huye',     status: 'live',     speed: 58, batt: 88 },
    { id: 'B-1043', plate: 'RAB 043 A', company: 'horizon', model: 'Higer KLQ6109',   seats: 49, imei: '861234042100143', driver: 'D-006', route: 'r-kgl-huye',     status: 'idle',     speed: 0,  batt: 99 },
    { id: 'B-1044', plate: 'RAB 044 A', company: 'horizon', model: 'Higer KLQ6109',   seats: 49, imei: '861234042100144', driver: 'D-009', route: 'r-kgl-huye',     status: 'stale',    speed: 12, batt: 41 },
    { id: 'B-1045', plate: 'RAB 045 A', company: 'horizon', model: 'Yutong ZK6107',   seats: 53, imei: '861234042100145', driver: 'D-018', route: 'r-kgl-huye',     status: 'maint',    speed: 0,  batt: 0  },
    { id: 'B-2010', plate: 'RAC 210 B', company: 'volcano', model: 'Toyota Coaster',  seats: 30, imei: '861234042100210', driver: 'D-101', route: 'r-kgl-musanze',  status: 'live',     speed: 72, batt: 84 },
    { id: 'B-2011', plate: 'RAC 211 B', company: 'volcano', model: 'Toyota Coaster',  seats: 30, imei: '861234042100211', driver: 'D-103', route: 'r-kgl-musanze',  status: 'live',     speed: 49, batt: 76 },
    { id: 'B-2012', plate: 'RAC 212 B', company: 'volcano', model: 'Higer KLQ6109',   seats: 49, imei: '861234042100212', driver: 'D-107', route: 'r-kgl-rubavu',   status: 'live',     speed: 67, batt: 91 },
    { id: 'B-2013', plate: 'RAC 213 B', company: 'volcano', model: 'Yutong ZK6107',   seats: 53, imei: '861234042100213', driver: 'D-110', route: 'r-kgl-byumba',   status: 'live',     speed: 52, batt: 80 },
    { id: 'B-2014', plate: 'RAC 214 B', company: 'volcano', model: 'Toyota Coaster',  seats: 30, imei: '861234042100214', driver: 'D-114', route: 'r-kgl-musanze',  status: 'offline',  speed: 0,  batt: 22 },
    { id: 'B-3007', plate: 'RAD 307 C', company: 'yahoo',   model: 'Yutong ZK6107',   seats: 53, imei: '861234042100307', driver: 'D-202', route: 'r-kgl-rwamagana',status: 'live',     speed: 75, batt: 95 },
    { id: 'B-3008', plate: 'RAD 308 C', company: 'yahoo',   model: 'Yutong ZK6107',   seats: 53, imei: '861234042100308', driver: 'D-205', route: 'r-kgl-rwamagana',status: 'live',     speed: 68, batt: 89 },
    { id: 'B-3009', plate: 'RAD 309 C', company: 'yahoo',   model: 'Higer KLQ6109',   seats: 49, imei: '861234042100309', driver: 'D-208', route: 'r-kgl-kayonza',  status: 'live',     speed: 60, batt: 82 },
    { id: 'B-3010', plate: 'RAD 310 C', company: 'yahoo',   model: 'Higer KLQ6109',   seats: 49, imei: '861234042100310', driver: 'D-211', route: 'r-kgl-nyagatare',status: 'live',     speed: 70, batt: 93 },
    { id: 'B-3011', plate: 'RAD 311 C', company: 'yahoo',   model: 'Toyota Coaster',  seats: 30, imei: '861234042100311', driver: 'D-214', route: 'r-kgl-ngoma',    status: 'idle',     speed: 0,  batt: 98 },
    { id: 'B-3012', plate: 'RAD 312 C', company: 'yahoo',   model: 'Toyota Coaster',  seats: 30, imei: '861234042100312', driver: 'D-217', route: 'r-kgl-rwamagana',status: 'stale',    speed: 8,  batt: 38 },
  ];

  const DRIVERS = [
    { id: 'D-006', name: 'Jean-Claude Habimana', company: 'horizon', license: 'D-06621',  phone: '+250 788 411 006', since: '2018-03', rating: 4.8, bus: 'B-1043' },
    { id: 'D-009', name: 'Patrick Nshuti',       company: 'horizon', license: 'D-06811',  phone: '+250 788 411 009', since: '2019-09', rating: 4.5, bus: 'B-1044' },
    { id: 'D-014', name: 'Eric Mugisha',         company: 'horizon', license: 'D-07014',  phone: '+250 788 411 014', since: '2017-01', rating: 4.9, bus: 'B-1041' },
    { id: 'D-018', name: 'Aimable Niyonzima',    company: 'horizon', license: 'D-07112',  phone: '+250 788 411 018', since: '2021-05', rating: 4.6, bus: 'B-1045' },
    { id: 'D-021', name: 'Olivier Bizimana',     company: 'horizon', license: 'D-07203',  phone: '+250 788 411 021', since: '2020-02', rating: 4.7, bus: 'B-1042' },
    { id: 'D-101', name: 'Theogene Uwimana',     company: 'volcano', license: 'D-08001',  phone: '+250 788 421 101', since: '2016-07', rating: 4.9, bus: 'B-2010' },
    { id: 'D-103', name: 'Vincent Kayitare',     company: 'volcano', license: 'D-08003',  phone: '+250 788 421 103', since: '2019-12', rating: 4.4, bus: 'B-2011' },
    { id: 'D-107', name: 'Joseph Ndayisaba',     company: 'volcano', license: 'D-08019',  phone: '+250 788 421 107', since: '2015-04', rating: 4.8, bus: 'B-2012' },
    { id: 'D-110', name: 'Faustin Munyaneza',    company: 'volcano', license: 'D-08027',  phone: '+250 788 421 110', since: '2018-11', rating: 4.6, bus: 'B-2013' },
    { id: 'D-114', name: 'Innocent Tuyizere',    company: 'volcano', license: 'D-08099',  phone: '+250 788 421 114', since: '2022-01', rating: 4.2, bus: 'B-2014' },
    { id: 'D-202', name: 'Emmanuel Iradukunda',  company: 'yahoo',   license: 'D-09008',  phone: '+250 788 431 202', since: '2014-09', rating: 4.9, bus: 'B-3007' },
    { id: 'D-205', name: 'Pacifique Ngabo',      company: 'yahoo',   license: 'D-09022',  phone: '+250 788 431 205', since: '2017-03', rating: 4.7, bus: 'B-3008' },
    { id: 'D-208', name: 'Ferdinand Sebera',     company: 'yahoo',   license: 'D-09041',  phone: '+250 788 431 208', since: '2019-08', rating: 4.5, bus: 'B-3009' },
    { id: 'D-211', name: 'Anaclet Ndahiro',      company: 'yahoo',   license: 'D-09055',  phone: '+250 788 431 211', since: '2018-04', rating: 4.8, bus: 'B-3010' },
    { id: 'D-214', name: 'Simon Hakizimana',     company: 'yahoo',   license: 'D-09071',  phone: '+250 788 431 214', since: '2020-10', rating: 4.6, bus: 'B-3011' },
    { id: 'D-217', name: 'Gilbert Bayingana',    company: 'yahoo',   license: 'D-09088',  phone: '+250 788 431 217', since: '2021-06', rating: 4.3, bus: 'B-3012' },
  ];

  const OPERATORS = [
    { id: 'OP-001', name: 'Marie Uwase',       email: 'marie@horizon.rw',  company: 'horizon', role: 'company_admin',    last: '2026-05-19 09:14' },
    { id: 'OP-002', name: 'David Tugume',      email: 'david@horizon.rw',  company: 'horizon', role: 'dispatcher',       last: '2026-05-19 09:32' },
    { id: 'OP-003', name: 'Joseph Mukasa',     email: 'joseph@yahoo.rw',   company: 'yahoo',   role: 'company_admin',    last: '2026-05-19 08:55' },
    { id: 'OP-004', name: 'Aline Mukamana',    email: 'aline@yahoo.rw',    company: 'yahoo',   role: 'dispatcher',       last: '2026-05-19 09:48' },
    { id: 'OP-005', name: 'Bernard Hakuzwe',   email: 'bernard@volcano.rw',company: 'volcano', role: 'company_admin',    last: '2026-05-19 07:11' },
    { id: 'OP-006', name: 'Chantal Ineza',     email: 'chantal@volcano.rw',company: 'volcano', role: 'dispatcher',       last: '2026-05-19 09:21' },
    { id: 'OP-007', name: 'Yvonne Ishimwe',    email: 'yvonne@rtops.rw',   company: null,      role: 'super_admin',      last: '2026-05-19 09:50' },
    { id: 'OP-008', name: 'Alexis Karenzi',    email: 'alexis@rtops.rw',   company: null,      role: 'super_admin',      last: '2026-05-19 06:02' },
    { id: 'OP-009', name: 'Diane Mutoni',      email: 'diane@horizon.rw',  company: 'horizon', role: 'finance',          last: '2026-05-18 18:30' },
    { id: 'OP-010', name: 'Robert Sebagabo',   email: 'robert@yahoo.rw',   company: 'yahoo',   role: 'finance',          last: '2026-05-19 08:02' },
  ];

  // Trips today (May 19, 2026)
  function trip(id, busId, routeId, depHHmm, durMin, status='scheduled', booked=0) {
    return { id, bus: busId, route: routeId, dep: depHHmm, durMin, status, booked };
  }
  const TRIPS = [
    trip('T-7701','B-1041','r-kgl-huye','06:00',195,'completed',28),
    trip('T-7702','B-1042','r-kgl-huye','07:30',195,'in_progress',26),
    trip('T-7703','B-1041','r-kgl-huye','10:00',195,'in_progress',24),
    trip('T-7704','B-1043','r-kgl-huye','13:00',195,'scheduled',12),
    trip('T-7705','B-1042','r-kgl-huye','15:30',195,'scheduled',18),
    trip('T-7706','B-1044','r-kgl-huye','08:15',195,'in_progress',32),
    trip('T-7707','B-1044','r-kgl-huye','17:00',195,'delayed',9),

    trip('T-8801','B-2010','r-kgl-musanze','05:30',150,'completed',29),
    trip('T-8802','B-2011','r-kgl-musanze','07:15',150,'in_progress',27),
    trip('T-8803','B-2010','r-kgl-musanze','11:00',150,'in_progress',22),
    trip('T-8804','B-2012','r-kgl-rubavu','06:45',240,'in_progress',46),
    trip('T-8805','B-2013','r-kgl-byumba','08:00',100,'in_progress',44),
    trip('T-8806','B-2011','r-kgl-musanze','14:30',150,'scheduled',8),
    trip('T-8807','B-2014','r-kgl-musanze','16:00',150,'cancelled',0),

    trip('T-9901','B-3007','r-kgl-rwamagana','06:00',75, 'completed',49),
    trip('T-9902','B-3008','r-kgl-rwamagana','07:30',75, 'in_progress',51),
    trip('T-9903','B-3007','r-kgl-rwamagana','09:00',75, 'in_progress',43),
    trip('T-9904','B-3009','r-kgl-kayonza','06:30',130,'in_progress',38),
    trip('T-9905','B-3010','r-kgl-nyagatare','06:00',220,'in_progress',41),
    trip('T-9906','B-3011','r-kgl-ngoma','12:00',140,'scheduled',6),
    trip('T-9907','B-3008','r-kgl-rwamagana','13:30',75, 'scheduled',22),
    trip('T-9908','B-3012','r-kgl-rwamagana','15:00',75, 'scheduled',14),
  ];

  // Distance → price helper. Base 50 RWF/km, decreasing multiplier per km cohort.
  // 1km: 50, 2km: ~85 (50 + 50*0.7), and so on; we use admin-set base * sum(multipliers).
  function priceForKm(km, base = 50) {
    // piecewise multipliers per km bucket
    const ms = [];
    for (let i = 0; i < Math.ceil(km); i++) {
      if (i < 1) ms.push(1.0);
      else if (i < 5) ms.push(0.75);
      else if (i < 20) ms.push(0.6);
      else if (i < 50) ms.push(0.5);
      else if (i < 100) ms.push(0.42);
      else ms.push(0.38);
    }
    const sum = ms.reduce((a,b)=>a+b,0);
    return Math.round(base * sum / 50) * 50; // round to nearest 50 RWF
  }

  return { PROVINCES, DISTRICTS, COMPANIES, PARKS, STOPS, ROUTES, BUSES, DRIVERS, OPERATORS, TRIPS, priceForKm, bboxPoly };
})();
