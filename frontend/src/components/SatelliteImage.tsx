interface Props {
  name: string
  category: string
}

// Images par catégorie (public/satellites/images/)
const CATEGORY_IMAGE: Record<string, string> = {
  starlink:   '/satellites/images/starlink.jpg',
  // gps:        '/satellites/images/gps.jpg',
  // station:    '/satellites/images/station.jpg',
  // weather:    '/satellites/images/weather.jpg',
  // science:    '/satellites/images/science.jpg',
  // telephonie: '/satellites/images/telephonie.jpg',
}

// Images par nom de constellation (priorité sur la catégorie)
const NAME_IMAGE: { match: string | RegExp; src: string }[] = [
  { match: 'oneweb',    src: '/satellites/images/oneweb.jpg' },
  { match: 'hjs',       src: '/satellites/images/hjs.jpg' },
  { match: 'hulianwang', src: '/satellites/images/hulianwang.jpg' },
  { match: 'daqi',    src: '/satellites/images/daqi.jpg' },
  { match: 'qianfan', src: '/satellites/images/qianfan.jpg' },
  { match: 'tianshi',      src: '/satellites/images/tianshi.jpg' },
  { match: 'superview neo', src: '/satellites/images/superview_neo.jpg' },
  { match: 'centispace', src: '/satellites/images/centispace.jpg' },
  { match: 'yaogan',     src: '/satellites/images/yaogan.jpg' },
  { match: 'sz-',      src: '/satellites/images/shenzhou.jpg' },
  { match: 'tianhui', src: '/satellites/images/tianhui.jpg' },
  { match: 'zy',   src: '/satellites/images/zy.jpg' },
  { match: 'dear',   src: '/satellites/images/dear.jpg' },
  { match: 'geesat',   src: '/satellites/images/geesat.jpg' },
  { match: 'tianzhou', src: '/satellites/images/tianzhou.jpg' },
  { match: 'chinasat',  src: '/satellites/images/chinasat.jpg' },
  { match: 'zhangheng', src: '/satellites/images/zhangheng.jpg' },
  { match: 'tianwen',  src: '/satellites/images/tianwen.jpg' },
  { match: 'tianlian', src: '/satellites/images/tianlian.jpg' },
  { match: 'yunyao',   src: '/satellites/images/yunyao.jpg' },
  { match: 'piesat',   src: '/satellites/images/piesat.jpg' },
  { match: 'haishao',  src: '/satellites/images/haishao.jpg' },
  { match: 'haiyang',  src: '/satellites/images/haiyang.jpg' },
  { match: 'gaofen', src: '/satellites/images/gaofen.jpg' },
  { match: 'bro', src: '/satellites/images/bro.jpg' },
  { match: 'flylab', src: '/satellites/images/flylab.jpg' },
  { match: 'spacevan', src: '/satellites/images/spacevan.jpg' },
  { match: 'co3', src: '/satellites/images/co.jpg' },
  { match: 'carb', src: '/satellites/images/carb.jpg' },
  { match: 'kineis', src: '/satellites/images/kineis.jpg' },
  { match: 'soap', src: '/satellites/images/soap.jpg' },
  { match: 'uvsq-sat ng', src: '/satellites/images/uvsq.jpg' },
  { match: 'uvsq-sat', src: '/satellites/images/uvsqsat.jpg' },
  { match: 'robusta-3a', src: '/satellites/images/robusta3a.jpg' },
{ match: 'robusta 1b', src: '/satellites/images/robusta1b.jpg' },
{ match: 'robusta', src: '/satellites/images/robusta.jpg' },
{ match: 'gesat gen 1', src: '/satellites/images/gesat.jpg' },
{ match: 'enso', src: '/satellites/images/enso.jpg' },
{ match: 'protomethee', src: '/satellites/images/protomethee.jpg' },
  { match: 'ness', src: '/satellites/images/ness.jpg' },
  { match: 'syracuse 4', src: '/satellites/images/syracuse4.jpg' },
  { match: 'syracuse 3', src: '/satellites/images/syracuse3.jpg' },
  { match: 'inspire-sat 7', src: '/satellites/images/inspire-sat7.jpg' },
{ match: 'gama-alpha', src: '/satellites/images/gama-alpha.jpg' },
{ match: 'celesta', src: '/satellites/images/celesta.jpg' },
{ match: 'mt-cube-2', src: '/satellites/images/mt-cube-2.jpg' },
{ match: 'pne', src: '/satellites/images/pne.jpg' },
{ match: 'amicalsat', src: '/satellites/images/amicalsat.jpg' },
{ match: 'eyesat-nano', src: '/satellites/images/eyesat-nano.jpg' },
{ match: 'angels', src: '/satellites/images/angels.jpg' },
{ match: 'entrysat', src: '/satellites/images/entrysat.jpg' },
{ match: 'microscope', src: '/satellites/images/microscope.jpg' },
{ match: 'pleiades', src: '/satellites/images/pleiades.jpg' },
{ match: 'spot', src: '/satellites/images/spot.jpg' },
{ match: 'elisa', src: '/satellites/images/elisa.jpg' },
{ match: 'picard', src: '/satellites/images/picard.jpg' },
{ match: 'helios', src: '/satellites/images/helios.jpg' },
{ match: 'spirale', src: '/satellites/images/spirale.jpg' },
{ match: 'jason 2', src: '/satellites/images/jason-2.jpg' },
{ match: 'corot', src: '/satellites/images/corot.jpg' },
{ match: 'calipso', src: '/satellites/images/calipso.jpg' },
{ match: 'parasol', src: '/satellites/images/parasol.jpg' },
{ match: 'demeter', src: '/satellites/images/demeter.jpg' },
{ match: 'essaim', src: '/satellites/images/essaim.jpg' },
{ match: 'clementine', src: '/satellites/images/clementine.jpg' },
{ match: 'telecom', src: '/satellites/images/telecom.jpg' },
{ match: 'cerise', src: '/satellites/images/cerise.jpg' },
{ match: 'stella', src: '/satellites/images/stella.jpg' },
{ match: 'arasene', src: '/satellites/images/arasene.jpg' },
{ match: 's80/t', src: '/satellites/images/s80t.jpg' },
{ match: 'sara', src: '/satellites/images/sara.jpg' },
{ match: 'tdf', src: '/satellites/images/tdf.jpg' },
{ match: 'aureole', src: '/satellites/images/aureole.jpg' },
{ match: 'signe 3', src: '/satellites/images/signe3.jpg' },
{ match: 'sret 1', src: '/satellites/images/sret1.jpg' },
{ match: 'sret 2', src: '/satellites/images/sret2.jpg' },
{ match: 'd5b', src: '/satellites/images/d5b.jpg' },
{ match: 'd5a', src: '/satellites/images/d5a.jpg' },
{ match: 'starlette', src: '/satellites/images/starlette.jpg' },
{ match: 'eole', src: '/satellites/images/eole1.jpg' },
{ match: 'tournesol', src: '/satellites/images/tournesol.jpg' },
{ match: 'diadem', src: '/satellites/images/diadem.jpg' },
{ match: 'diapason', src: '/satellites/images/diapason.jpg' },
{ match: 'fr 1', src: '/satellites/images/fr1.jpg' },
{ match: 'a-1', src: '/satellites/images/a1asterix.jpg' },
{ match: 'vanguard 1', src: '/satellites/images/vanguard.jpg' },
{ match: 'vanguard 2', src: '/satellites/images/vanguard2.jpg' },
{ match: 'vanguard 3', src: '/satellites/images/vanguard3.jpg' },
{ match: 'ravan', src: '/satellites/images/ravan.jpg' },
{ match: 'lemur', src: '/satellites/images/lemur.jpg' },
{ match: 'nauka', src: '/satellites/images/nauka.jpg' },
{ match: 'tiangong', src: '/satellites/images/tiangong.jpg' },
{ match: 'destiny', src: '/satellites/images/destiny.jpg' },
{ match: 'zvezda', src: '/satellites/images/zvezda.jpg' },
{ match: 'unity', src: '/satellites/images/unity.jpg' },
{ match: 'zarya', src: '/satellites/images/zarya.jpg' },
{ match: 'progress-ms 34', src: '/satellites/images/progress-ms-34.jpg' },
{ match: 'cygnus ng-24', src: '/satellites/images/cygnus-ng-24.jpg' },
{ match: 'progress-ms 33', src: '/satellites/images/progress-ms-33.jpg' },
{ match: 'crew dragon 12', src: '/satellites/images/crew-dragon-12.jpg' },
{ match: 'soyuz-ms 28', src: '/satellites/images/soyuz-ms-28.jpg' },
{ match: 'shenzhou-22', src: '/satellites/images/shenzhou-22.jpg' },
{ match: 'htv-x1', src: '/satellites/images/htv-x1.jpg' },
{ match: 'wentian', src: '/satellites/images/css.jpg' },
{ match: 'mengtian', src: '/satellites/images/css.jpg' },
{ match: 'tianhe', src: '/satellites/images/css.jpg' },
{ match: 'poisk', src: '/satellites/images/poisk.jpg' },
// GLONASS series (specific before generic)
{ match: 'glonass-k2',              src: '' },
{ match: /glonass-k\b/i,            src: '' },
{ match: /glonass-m\b/i,            src: '/satellites/images/glonass.jpg' },
{ match: 'glonass',                 src: '/satellites/images/glonass.jpg' },

// GPS series (specific before generic)
{ match: /gps iiif/i,               src: '' },
{ match: /gps iii/i,                src: '' },
{ match: /gps biif/i,               src: '' },
{ match: /gps biirm/i,              src: '' },
{ match: /gps biir/i,               src: '' },
{ match: /gps block ii\b/i,         src: '' },
{ match: 'navstar',                 src: '/satellites/images/navstar.jpg' },
{ match: 'gps',                     src: '/satellites/images/gps.jpg' },

// QZSS / NAVIC
{ match: /qzs-?\d/i,                src: '' },
{ match: 'michibiki',               src: '' },
{ match: 'irnss',                   src: '' },
{ match: 'navic',                   src: '' },

// SBAS
{ match: 'waas',                    src: '' },
{ match: 'egnos',                   src: '' },
{ match: 'msas',                    src: '' },
{ match: 'gagan',                   src: '' },

// Beidou series (BDS-3 before generic BDS-2)
{ match: 'beidou-3',                src: '' },
{ match: 'beidou 3',                src: '' },
{ match: 'beidou',                  src: '/satellites/images/beidou.jpg' },

// Galileo (IOV before generic)
{ match: /galileo.?(pfm|fm[234])/i, src: '' },
{ match: /gsat01\d{2}/i,            src: '' },
{ match: /galileo.?foc/i,           src: '' },
{ match: 'galileo',                 src: '/satellites/images/galileo.jpg' },
// Fengyun series (specific before generic)
{ match: /fy-?4|fengyun.?4/i,       src: '' },
{ match: /fy-?3|fengyun.?3/i,       src: '' },
{ match: /fy-?2|fengyun.?2/i,       src: '' },
{ match: /fy-?1|fengyun.?1/i,       src: '' },
{ match: 'fengyun',                 src: '/satellites/images/fengyun.jpg' },

// European / Russian / Asian weather
{ match: /meteosat \d{2}/i,         src: '' },  // MSG/MTG generation
{ match: /meteosat-\d{2}/i,         src: '' },
{ match: 'meteosat',                src: '' },
{ match: 'elektro-l',               src: '' },
{ match: 'arktika-m',               src: '' },
{ match: /insat-\d|kalpana/i,       src: '' },
{ match: /gsat-\d+(r|bc)?/i,        src: '' },
{ match: /gms-\d/i,                 src: '' },
{ match: 'coms',                    src: '' },   // Korean Chollian/COMS
{ match: 'chollian',                src: '' },
{ match: 'geo-kompsat',             src: '' },
{ match: 'himawari',                src: '' },   // fallback (specific already above)
{ match: 'sentinel-6b', src: '/satellites/images/sentinel-6b.jpg' },
{ match: 'sentinel 1a', src: '/satellites/images/sentinel-1a.jpg' },
{ match: 'sentinel 1b', src: '/satellites/images/sentinel-1a.jpg' },
{ match: 'sentinel 1c', src: '/satellites/images/sentinel-1a.jpg' },
{ match: 'sentinel-1d', src: '/satellites/images/sentinel-1a.jpg' },
{ match: 'metop sg-a', src: '/satellites/images/metop-sg-a.jpg' },
{ match: 'metop-a', src: '/satellites/images/metop.jpg' },
{ match: 'metop-b', src: '/satellites/images/metop.jpg' },
{ match: 'metop-c', src: '/satellites/images/metop.jpg' },
{ match: 'sentinel 2a', src: '/satellites/images/sentinel-2a.jpg' },
{ match: 'sentinel 2b', src: '/satellites/images/sentinel-2a.jpg' },
{ match: 'sentinel-2c', src: '/satellites/images/sentinel-2a.jpg' },
{ match: 'sentinel 3a', src: '/satellites/images/sentinel-3a.jpg' },
{ match: 'sentinel 3b', src: '/satellites/images/sentinel-3a.jpg' },
{ match: 'sentinel 5p', src: '/satellites/images/sentinel-5p.jpg' },
{ match: 'esa/goes', src: '/satellites/images/esa-goes.jpg' },
{ match: 'himawari 1', src: '/satellites/images/himawari-1.jpg' },
{ match: 'himawari 2', src: '/satellites/images/himawari-1.jpg' },
{ match: 'himawari 3', src: '/satellites/images/himawari-1.jpg' },
{ match: 'himawari 4', src: '/satellites/images/himawari-1.jpg' },
{ match: 'himawari 5', src: '/satellites/images/himawari-1.jpg' },
{ match: 'himawari 6', src: '/satellites/images/himawari-6.jpg' },
{ match: 'himawari 7', src: '/satellites/images/himawari-6.jpg' },
{ match: 'himawari-8', src: '/satellites/images/himawari-8.jpg' },
{ match: 'himawari-9', src: '/satellites/images/himawari-8.jpg' },
{ match: 'meteor 1', src: '/satellites/images/meteor-1.jpg' },
{ match: 'meteor 2', src: '/satellites/images/meteor-1.jpg' },
{ match: 'meteor 3', src: '/satellites/images/meteor-3.jpg' },
{ match: 'meteor priroda', src: '/satellites/images/meteor-3.jpg' },
{ match: 'meteor-m', src: '/satellites/images/meteor-m.jpg' },
{ match: 'noaa 21', src: '/satellites/images/noaa15.jpg' },
{ match: 'noaa 20', src: '/satellites/images/noaa15.jpg' },
{ match: 'noaa 15', src: '/satellites/images/noaa15.jpg' },
{ match: 'noaa 16', src: '/satellites/images/noaa15.jpg' },
{ match: 'noaa 17', src: '/satellites/images/noaa15.jpg' },
{ match: 'noaa 18', src: '/satellites/images/noaa15.jpg' },
{ match: 'noaa 19', src: '/satellites/images/noaa15.jpg' },
{ match: 'noaa 10', src: '/satellites/images/noaa6.jpg' },
{ match: 'noaa 11', src: '/satellites/images/noaa6.jpg' },
{ match: 'noaa 12', src: '/satellites/images/noaa6.jpg' },
{ match: 'noaa 13', src: '/satellites/images/noaa6.jpg' },
{ match: 'noaa 14', src: '/satellites/images/noaa6.jpg' },
{ match: 'noaa 1', src: '/satellites/images/noaa.jpg' },
{ match: 'noaa 2', src: '/satellites/images/noaa.jpg' },
{ match: 'noaa 3', src: '/satellites/images/noaa.jpg' },
{ match: 'noaa 4', src: '/satellites/images/noaa.jpg' },
{ match: 'noaa 5', src: '/satellites/images/noaa.jpg' },
{ match: 'noaa 6', src: '/satellites/images/noaa6.jpg' },
{ match: 'noaa 7', src: '/satellites/images/noaa6.jpg' },
{ match: 'noaa 8', src: '/satellites/images/noaa6.jpg' },
{ match: 'noaa 9', src: '/satellites/images/noaa6.jpg' },
{ match: 'noaa b', src: '/satellites/images/noaa6.jpg' },
{ match: 'goes 19', src: '/satellites/images/goes16.jpg' },
{ match: 'goes 18', src: '/satellites/images/goes16.jpg' },
{ match: 'goes 17', src: '/satellites/images/goes16.jpg' },
{ match: 'goes 16', src: '/satellites/images/goes16.jpg' },
{ match: 'goes 15', src: '/satellites/images/goes15.jpg' },
{ match: 'goes 14', src: '/satellites/images/goes15.jpg' },
{ match: 'goes 13', src: '/satellites/images/goes15.jpg' },
{ match: 'goes 12', src: '/satellites/images/goes15.jpg' },
{ match: 'goes 11', src: '/satellites/images/goes15.jpg' },
{ match: 'goes 10', src: '/satellites/images/goes15.jpg' },
{ match: 'goes 9', src: '/satellites/images/goes15.jpg' },
{ match: 'goes 8', src: '/satellites/images/goes8.jpg' },
{ match: 'goes 7', src: '/satellites/images/goes8.jpg' },
{ match: 'goes 6', src: '/satellites/images/goes8.jpg' },
{ match: 'goes 5', src: '/satellites/images/goes8.jpg' },
{ match: 'goes 4', src: '/satellites/images/goes8.jpg' },
{ match: 'goes 3', src: '/satellites/images/goes8.jpg' },
{ match: 'goes 2', src: '/satellites/images/goes8.jpg' },
{ match: 'goes 1', src: '/satellites/images/goes8.jpg' },
{ match: 'landsat 9', src: '/satellites/images/landsat4.jpg' },
{ match: 'landsat 8', src: '/satellites/images/landsat4.jpg' },
{ match: 'landsat 7', src: '/satellites/images/landsat3.jpg' },
{ match: 'landsat 6', src: '/satellites/images/landsat8.jpg' },
{ match: 'landsat 5', src: '/satellites/images/landsat2.jpg' },
{ match: 'landsat 4', src: '/satellites/images/landsat2.jpg' },
{ match: 'landsat 3', src: '/satellites/images/landsat1.jpg' },
{ match: 'landsat 2', src: '/satellites/images/landsat1.jpg' },
{ match: 'landsat 1', src: '/satellites/images/landsat1.jpg' },
{ match: 'dove 4', src: '/satellites/images/dove1.jpg' },
{ match: 'dove 3', src: '/satellites/images/dove1.jpg' },
{ match: 'dove 2', src: '/satellites/images/dove2.jpg' },
{ match: 'dove 1', src: '/satellites/images/dove3.jpg' },
{ match: 'dove pioneer', src: '/satellites/images/dove3.jpg' },
{ match: 'flock', src: '/satellites/images/flock.jpg' },
{ match: 'skysat', src: '/satellites/images/skysat.jpg' },
{ match: 'globalstar', src: '/satellites/images/globalstar.jpg' },
{ match: 'intelsat 6b', src: '/satellites/images/intelsat6b.jpg' },
{ match: /intelsat 1\d{3}/, src: '/satellites/images/intelsat1000.jpg' }, // 1000+
{ match: /intelsat 9\d{2}/, src: '/satellites/images/intelsat900.jpg' },  // 900s
{ match: /intelsat 8\d{2}/, src: '/satellites/images/intelsat800.jpg' },  // 800s
{ match: /intelsat 7\d{2}/, src: '/satellites/images/intelsat700.jpg' },  // 700s
{ match: /intelsat 6\d{2}/, src: '/satellites/images/intelsat600.jpg' },  // 600s
{ match: /intelsat 5\d{2}/, src: '/satellites/images/intelsat500.jpg' },  // 500s
{ match: 'intelsat 4', src: '/satellites/images/intelsat4.jpg' },
{ match: 'intelsat 39', src: '/satellites/images/intelsat39.jpg' },
{ match: 'intelsat 37e', src: '/satellites/images/intelsat37e.jpg' },
{ match: 'intelsat 35e', src: '/satellites/images/intelsat35e.jpg' },
{ match: 'intelsat 32e', src: '/satellites/images/intelsat32e.jpg' },
{ match: 'intelsat 33e', src: '/satellites/images/intelsat33e.jpg' },
{ match: 'intelsat 36', src: '/satellites/images/intelsat36.jpg' },
{ match: 'intelsat 30', src: '/satellites/images/intelsat30.jpg' },
{ match: 'intelsat 31', src: '/satellites/images/intelsat30.jpg' },
{ match: 'intelsat 34', src: '/satellites/images/intelsat34.jpg' },
{ match: 'intelsat 3-f', src: '/satellites/images/intelsat3-f.jpg' },
{ match: 'o3b mpower', src: '/satellites/images/o3b_mpower.jpg' },
{ match: 'o3bf', src: '/satellites/images/o3b_mpower.jpg' },
{ match: 'o3b fm', src: '/satellites/images/o3b_f.jpg' },
{ match: 'o3b pfm', src: '/satellites/images/o3b_f.jpg' },

{ match: /iridium \d{3}/, src: '/satellites/images/iridium_next.jpg' }, // 100-181
{ match: /iridium \d{1,2}$/, src: '/satellites/images/iridium_old.jpg' }, // 1-99
{ match: 'iridium', src: '/satellites/images/iridium_old.jpg' }, // fallback

{ match: 'kuiper', src: '/satellites/images/kuiper.jpg' },

{ match: 'intelsat 2', src: '/satellites/images/intelsat2.jpg' },
{ match: 'intelsat 3r', src: '/satellites/images/intelsat2.jpg' },
{ match: 'intelsat 7', src: '/satellites/images/intelsat7.jpg' },
{ match: 'intelsat 8', src: '/satellites/images/intelsat8.jpg' },
{ match: 'intelsat 10', src: '/satellites/images/intelsat10.jpg' },
{ match: 'intelsat 9', src: '/satellites/images/intelsat10.jpg' },
{ match: 'intelsat 1r', src: '/satellites/images/intelsat1r.jpg' },
{ match: 'intelsat 5', src: '/satellites/images/intelsat5.jpg' },

{ match: 'protostar 1', src: '/satellites/images/protostar1.jpg' },

// SAR / Earth Observation constellations
{ match: 'iceye',                   src: '' },
{ match: 'capella',                 src: '' },
{ match: /hawk\b/i,                 src: '' },   // HawkEye 360 RF monitoring
{ match: 'umbra',                   src: '' },
{ match: 'sar-lupe',                src: '' },
{ match: 'cosmo-skymed',            src: '' },
{ match: 'kompsat',                 src: '' },   // Korean EO
{ match: 'alos',                    src: '' },   // JAXA ALOS
{ match: 'seosat',                  src: '' },
{ match: 'prisma',                  src: '' },   // Italian hyperspectral
{ match: 'iride',                   src: '' },   // Italian constellation
{ match: 'nusat',                   src: '' },
{ match: 'pelican',                 src: '' },   // Planet Labs Pelican

// Space-Domain Awareness / Military
{ match: /sda t\d/i,                src: '' },   // SDA Tranche
{ match: 'praetorian',              src: '' },
{ match: 'sbirs',                   src: '' },
{ match: 'gssap',                   src: '' },
{ match: 'starlion',                src: '' },

// Commercial broadband / IoT
{ match: 'bluebird',                src: '' },   // AST SpaceMobile
{ match: /ast (fm|bluebird)/i,      src: '' },
{ match: 'aether',                  src: '' },
{ match: 'disksat',                 src: '' },
{ match: 'rassvet',                 src: '' },

// GEO communications
{ match: /ses-\d/i,                 src: '' },
{ match: /ses \d/i,                 src: '' },
{ match: /eutelsat \d/i,            src: '' },
{ match: 'hot bird',                src: '' },
{ match: /arabsat-\d/i,             src: '' },
{ match: /astra \d[a-z]/i,          src: '' },
{ match: /turksat \d/i,             src: '' },
{ match: /badr-\d/i,                src: '' },
{ match: /horizons \d/i,            src: '' },
{ match: /directv \d/i,             src: '' },
{ match: /echostar \d/i,            src: '' },
{ match: /galaxy \d/i,              src: '' },   // Intelsat Galaxy series
{ match: /loral \d/i,               src: '' },
{ match: /nimiq \d/i,               src: '' },
{ match: /telestar \d/i,            src: '' },
{ match: /optus \w/i,               src: '' },
{ match: /measat-\d/i,              src: '' },
{ match: /apstar-\d/i,              src: '' },
{ match: /asiasat \d/i,             src: '' },
{ match: /jcsat-\d/i,               src: '' },
{ match: /superbird-/i,             src: '' },
{ match: /koreasat \d/i,            src: '' },

// Russian Cosmos military/dual-use
{ match: /cosmos 2\d{3}/i,          src: '' },

// Debris category images
{ match: 'fengyun 1c deb',          src: '' },
{ match: 'iridium 33 deb',          src: '' },
{ match: 'cosmos 2251 deb',         src: '' },
]

function getImage(name: string, category: string): string | null {
  const n = name.toLowerCase()
  for (const entry of NAME_IMAGE) {
    if (typeof entry.match === 'string') {
      if (n.includes(entry.match)) return entry.src
    } else {
      if (entry.match.test(n)) return entry.src
    }
  }
  return CATEGORY_IMAGE[category] ?? null
}

export default function SatelliteImage({ name, category }: Props) {
  const src = getImage(name, category)

  if (!src) {
    return (
      <div style={{ height: 160, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ fontSize: 32, opacity: 0.3 }}>🛰</div>
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>NO IMAGE</span>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: 160, background: '#000', overflow: 'hidden', flexShrink: 0 }}>
      {/* Background flouté pour éviter les barres noires */}
      <img src={src} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(14px) brightness(0.35)', transform: 'scale(1.12)', pointerEvents: 'none' }} />
      {/* Image principale — contient l'image entière sans crop */}
      <img src={src} alt={name} style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', pointerEvents: 'none' }} />
    </div>
  )
}
