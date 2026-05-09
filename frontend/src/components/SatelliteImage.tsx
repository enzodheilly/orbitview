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
const NAME_IMAGE: { match: string; src: string }[] = [
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























]

function getImage(name: string, category: string): string | null {
  const n = name.toLowerCase()
  for (const entry of NAME_IMAGE) {
    if (n.includes(entry.match)) return entry.src
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
      <img
        src={src}
        alt={name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', pointerEvents: 'none' }} />
    </div>
  )
}
