/* AEGIS Earth Mobile 0.5 — public source extensions.
   Requires window.AEGISBridge from index.html. No secrets, fake contacts or private cameras. */
(() => {
  'use strict';
  const B = window.AEGISBridge;
  if (!B) { console.warn('AEGIS extras: bridge missing'); return; }
  const {state:S,fly,centerCamera,toast,escapeHTML:esc,distance,refreshGlobe} = B;
  const $=s=>document.querySelector(s);
  const H={cameras:[],aircraft:[],vessels:[],weather:null,air:null,kp:null,
    mode:{cameras:false,aircraft:true,vessels:true},status:{cameras:'en attente',aircraft:'en attente',weather:'en attente',air:'en attente',kp:'en attente'},
    loaded:{},coord:null,cameraQuery:'',selected:null};
  const urls = Object.freeze({
    cameras:'https://api.tfl.gov.uk/Place/Type/JamCam/',
    aircraft:'https://api.airplanes.live/v2/point/',
    weather:'https://api.open-meteo.com/v1/forecast',
    air:'https://air-quality-api.open-meteo.com/v1/air-quality',
    kp:'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
  });
  const isNum=x=>Number.isFinite(Number(x));
  const validCoord=(lat,lon)=>isNum(lat)&&isNum(lon)&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180;
  const safeUrl=x=>{try{const u=new URL(String(x));return u.protocol==='https:'?u.href:null}catch{return null}};
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const coord=()=>{const p=centerCamera();return validCoord(p.lat,p.lon)?p:{lat:48.8566,lon:2.3522}};
  const formatDate=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'heure inconnue'};
  const badge=(name)=>'<span class="extraTag">'+esc(H.status[name]||'non chargé')+'</span>';
  function more(label,url){const u=safeUrl(url);return u?'<a class="btn" rel="noopener noreferrer" target="_blank" href="'+esc(u)+'">'+esc(label)+' ↗</a>':''}
  async function getJSON(url,timeout=13000){
    const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),timeout);
    try{const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}
    finally{clearTimeout(t)}
  }
  function setStatus(key,status){H.status[key]=status;if(['cameras','aircraft','weather','air','kp'].includes(key)&&['reçu','indisponible'].includes(status))H.loaded[key]=Date.now();if(S.tab==='cameras'||S.tab==='aviation'||S.tab==='marine'||S.tab==='meteo'||S.tab==='space')refreshPanel();}
  function refreshPanel(){if(S.tab==='cameras'||S.tab==='aviation'||S.tab==='marine'||S.tab==='meteo'||S.tab==='space')render(S.tab,$('#bodyPanel'));}
  function redraw(){refreshGlobe()}
  async function loadCameras(force=false){
    if(!force&&Date.now()-(H.loaded.cameras||0)<3*60*1000)return;
    setStatus('cameras','chargement');
    try{
      const raw=await getJSON(urls.cameras,18000);
      if(!Array.isArray(raw))throw Error('TfL response invalid');
      const list=raw.map(p=>{
        const props=Object.fromEntries((p.additionalProperties||[]).map(a=>[a.key,a.value]));
        if(!validCoord(p.lat,p.lon)||props.available==='false')return null;
        return {id:String(p.id||''),lat:Number(p.lat),lon:Number(p.lon),
          name:String(p.commonName||'Caméra publique'),image:safeUrl(props.imageUrl),
          video:safeUrl(props.videoUrl),view:String(props.view||''),source:'TfL · Londres'};
      }).filter(p=>p&&(p.image||p.video));
      H.cameras=list;setStatus('cameras','reçu');redraw();
    }catch(e){console.warn('TfL JamCam unavailable',e);H.cameras=[];setStatus('cameras','indisponible');redraw();}
  }
  async function loadAircraft(force=false){
    if(!force&&Date.now()-(H.loaded.aircraft||0)<90*1000)return;
    const c=coord();H.coord=c;setStatus('aircraft','chargement');
    try{
      const raw=await getJSON(urls.aircraft+encodeURIComponent(c.lat.toFixed(4))+'/'+encodeURIComponent(c.lon.toFixed(4))+'/150',13000);
      if(!Array.isArray(raw.ac))throw Error('Airplanes.live response invalid');
      H.aircraft=raw.ac.filter(p=>validCoord(p.lat,p.lon)).slice(0,220).map(p=>({
        id:String(p.hex||''),name:String(p.flight||p.r||p.hex||'Avion').trim(),lat:Number(p.lat),lon:Number(p.lon),
        altitude:isNum(p.alt_baro)?p.alt_baro:null,heading:isNum(p.track)?Number(p.track):null,
        gs:isNum(p.gs)?Number(p.gs):null,time:Date.now(),source:'Airplanes.live'
      }));
      setStatus('aircraft','reçu');redraw();
    }catch(e){console.warn('ADS-B unavailable (CORS/provider)',e);H.aircraft=[];setStatus('aircraft','indisponible');redraw();}
  }
  async function loadWeather(force=false){
    const c=coord(),same=H.coord&&distance(H.coord,c)<20;
    if(!force&&same&&Date.now()-(H.loaded.weather||0)<10*60*1000)return;
    H.coord=c;setStatus('weather','chargement');setStatus('air','chargement');
    const q='?latitude='+c.lat.toFixed(4)+'&longitude='+c.lon.toFixed(4);
    const weather=getJSON(urls.weather+q+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&timezone=auto')
      .then(v=>{if(!v.current)throw Error('missing current weather');H.weather={...v.current,at:v.current.time,lat:c.lat,lon:c.lon};setStatus('weather','reçu')})
      .catch(e=>{H.weather=null;setStatus('weather','indisponible');console.warn('Weather unavailable',e)});
    const air=getJSON(urls.air+q+'&current=us_aqi,pm2_5,pm10&timezone=auto')
      .then(v=>{if(!v.current)throw Error('missing air quality');H.air={...v.current,at:v.current.time,lat:c.lat,lon:c.lon};setStatus('air','reçu')})
      .catch(e=>{H.air=null;setStatus('air','indisponible');console.warn('Air unavailable',e)});
    await Promise.all([weather,air]);
  }
  async function loadSpace(force=false){
    if(!force&&Date.now()-(H.loaded.kp||0)<20*60*1000)return;
    setStatus('kp','chargement');
    try{
      const raw=await getJSON(urls.kp);
      if(!Array.isArray(raw))throw Error('NOAA response invalid');
      const a=raw.filter(x=>isNum(x.Kp)&&x.time_tag).sort((a,b)=>Date.parse(b.time_tag)-Date.parse(a.time_tag));
      if(!a.length)throw Error('No Kp available');
      H.kp={value:Number(a[0].Kp),time:a[0].time_tag};
      setStatus('kp','reçu');
    }catch(e){H.kp=null;setStatus('kp','indisponible');console.warn('NOAA unavailable',e)}
  }
  function iconPoint(lat,lon,color,size=8){
    if(!S.v||!window.Cesium)return;
    return S.v.entities.add({position:Cesium.Cartesian3.fromDegrees(lon,lat),
      point:{pixelSize:size,color:Cesium.Color.fromCssColorString(color),
        outlineColor:Cesium.Color.fromCssColorString('#071c26'),
        outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY}});
  }
  function drawEntities(){
    if(!S.v)return;
    if(H.mode.cameras)for(const c of H.cameras.slice(0,350)){const en=iconPoint(c.lat,c.lon,'#5bbefd',6);if(en)en.aegisExtra={tab:'cameras',entry:c}}
    if(H.mode.aircraft)for(const a of H.aircraft.slice(0,200)){const en=iconPoint(a.lat,a.lon,'#e7dd80',8);if(en)en.aegisExtra={tab:'aviation',entry:a}}
    if(H.mode.vessels)for(const s of H.vessels.slice(0,400)){const en=iconPoint(s.lat,s.lon,'#75e8b8',8);if(en)en.aegisExtra={tab:'marine',entry:s}}
  }
  function cameraCard(c){
    return '<div class="cam-card"><div class="cam-preview">'+(c.image?'<img loading="lazy" src="'+esc(c.image)+'" alt="Image publique de circulation, '+esc(c.name)+'" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">':'<span>Sans image</span>')+'</div><div class="cam-detail"><strong>'+esc(c.name)+'</strong><small>'+esc(c.view||'Londres')+' · TfL · images actualisées périodiquement</small><div class="cam-actions"><button class="btn" data-fly="'+esc(c.id)+'">Sur la carte</button><button class="btn primary" data-camera="'+esc(c.id)+'">Voir</button></div></div></div>';
  }
  function cams(box){
    const c=coord();
    const list=[...H.cameras].filter(x=>!H.cameraQuery||x.name.toLowerCase().includes(H.cameraQuery.toLowerCase())).sort((a,b)=>distance(c,a)-distance(c,b)).slice(0,36);
    box.innerHTML='<div class="eyebrow">CAMÉRAS PUBLIQUES / LONDRES</div><div class="split"><h2>Caméras de trafic.</h2>'+badge('cameras')+'</div><p class="muted">TfL JamCams : clichés et vidéos publiques de circulation, pas une surveillance privée ni une diffusion continue garantie. Jusqu’à 700+ emplacements selon le fournisseur.</p><div class="row"><button class="btn primary" data-action="cams-refresh">↻ Caméras</button><button class="btn" data-action="cams-layer">'+(H.mode.cameras?'Masquer':'Afficher')+' sur la carte</button></div><input id="cameraFilter" class="field" placeholder="Filtrer par rue ou quartier de Londres" value="'+esc(H.cameraQuery)+'" style="margin-top:12px" aria-label="Filtrer les caméras"><div class="list">'+(H.cameras.length?'<p class="muted">'+H.cameras.length+' caméras répertoriées · '+list.length+' affichées</p>'+list.map(cameraCard).join(''):'<p class="muted">Aucune caméra chargée. La source peut être momentanément indisponible ou bloquée par le navigateur.</p>')+'</div><h3>Autres caméras du monde</h3><p class="muted">Répertoires externes à consulter chez leurs éditeurs (images non intégrées sans autorisation/API).</p><div class="row">'+more('Webcams Windy','https://www.windy.com/webcams')+more('EarthCam','https://www.earthcam.com/network/')+'</div>';
  }
  function aviation(box){
    const c=H.coord||coord();
    box.innerHTML='<div class="eyebrow">TRAFIC AÉRIEN / ADS-B</div><div class="split"><h2>Avions proches.</h2>'+badge('aircraft')+'</div><p class="muted">Position ADS-B disponible dans un rayon de 150 milles nautiques autour de '+c.lat.toFixed(2)+'°, '+c.lon.toFixed(2)+'°. Couverture incomplète, latence et restrictions API possibles.</p><div class="row"><button class="btn primary" data-action="air-refresh">↻ Relever les avions</button><button class="btn" data-action="air-layer">'+(H.mode.aircraft?'Masquer':'Afficher')+' sur la carte</button></div><div class="list">'+(H.aircraft.length?H.aircraft.slice(0,60).map(a=>'<button class="item" data-air="'+esc(a.id)+'"><i class="dot" style="background:#e7dd80"></i><span class="contents"><strong>'+esc(a.name)+'</strong><small>'+esc(a.altitude==null?'Altitude non disponible':String(a.altitude)+' ft')+(a.gs!=null?' · '+Math.round(a.gs)+' kt':'')+'</small></span><span class="arrow">↗</span></button>').join(''):'<p class="muted">Aucun avion reçu. Si la source refuse les requêtes CORS, utilisez la carte officielle ci-dessous.</p>')+'</div><h3>Source externe</h3>'+more('Carte aérienne Airplanes.live','https://globe.airplanes.live/');
  }
  function marine(box){
    box.innerHTML='<div class="eyebrow">MARITIME / AIS</div><h2>Trafic maritime.</h2><p class="warning">Le vrai flux AISStream nécessite une clé privée et un relais serveur. Aucun navire n’est simulé sur cette carte.</p><div class="row">'+more('MarineTraffic','https://www.marinetraffic.com/en/ais/home')+more('VesselFinder','https://www.vesselfinder.com/')+'</div><h3>Importer des positions maritimes</h3><p class="muted">Import local GeoJSON Point avec latitude/longitude valides. Les données importées ne sont pas un suivi AIS direct.</p><label class="btn" style="display:inline-flex;align-items:center;gap:8px;cursor:pointer">Importer GeoJSON<input id="shipGeoJSON" type="file" accept=".json,.geojson,application/geo+json" hidden></label><div class="list">'+(H.vessels.length?H.vessels.slice(0,50).map((s,i)=>'<button class="item" data-vessel="'+i+'"><i class="dot" style="background:#75e8b8"></i><span class="contents"><strong>'+esc(s.name)+'</strong><small>'+s.lat.toFixed(4)+', '+s.lon.toFixed(4)+' · fichier local</small></span><span class="arrow">↗</span></button>').join(''):'<p class="muted">Aucune position maritime importée.</p>')+'</div>';
  }
  function reading(label,value,unit='',time=''){return '<div class="reading"><small>'+esc(label)+'</small><b>'+esc(value==null?'—':String(value))+'</b><small>'+esc(unit)+' '+esc(time)+'</small></div>'}
  function meteo(box){
    const c=H.coord||coord(),w=H.weather,a=H.air;
    box.innerHTML='<div class="eyebrow">MÉTÉO ET ATMOSPHÈRE</div><div class="split"><h2>Conditions locales.</h2><button class="btn primary" data-action="weather-refresh">↻ Actualiser</button></div><p class="muted">Zone '+c.lat.toFixed(3)+'°, '+c.lon.toFixed(3)+'°. Prévisions/modèles Open-Meteo ; ce ne sont pas des mesures instrumentales directes à cet emplacement.</p><h3>Météo '+badge('weather')+'</h3><div class="reading-grid">'+reading('Température',w?.temperature_2m,'°C')+reading('Ressenti',w?.apparent_temperature,'°C')+reading('Vent',w?.wind_speed_10m,'km/h')+reading('Humidité',w?.relative_humidity_2m,'%')+'</div><p class="muted">Référence météo : '+esc(w?.at||'indisponible')+'</p><h3>Qualité de l’air '+badge('air')+'</h3><div class="reading-grid">'+reading('Indice AQI (US)',a?.us_aqi)+reading('PM2.5',a?.pm2_5,'µg/m³')+reading('PM10',a?.pm10,'µg/m³')+'</div><p class="muted">Référence air : '+esc(a?.at||'indisponible')+'</p>'+more('Modèles Open-Meteo','https://open-meteo.com/en/docs');
  }
  function space(box){
    box.innerHTML='<div class="eyebrow">MÉTÉO SPATIALE / NOAA</div><div class="split"><h2>Indice géomagnétique.</h2><button class="btn primary" data-action="space-refresh">↻ NOAA</button></div><p class="muted">Indice planétaire Kp observé : échelle 0–9. Une valeur Kp ≥ 5 est associée à une tempête géomagnétique, mais l’indice ne donne pas une prédiction locale d’aurores.</p><div class="kp-block"><strong>'+(H.kp?H.kp.value.toFixed(2):'—')+'</strong><span>KP · '+esc(H.status.kp)+'</span></div><p class="muted">Observation : '+esc(H.kp?formatDate(H.kp.time):'indisponible')+'</p><p class="muted">La couche ISS existe déjà dans les couches principales d’AEGIS.</p>'+more('NOAA SWPC','https://www.swpc.noaa.gov/products/planetary-k-index');
  }
  const screens={cameras:cams,aviation,marine,meteo,space};
  function render(tab,box){if(!screens[tab])return false;screens[tab](box);return true}
  async function importShips(file){
    if(!file||file.size>3*1024*1024){toast('Fichier absent ou trop volumineux (3 Mo max)');return}
    try{
      const json=JSON.parse(await file.text()),features=json.type==='FeatureCollection'?json.features:(json.type==='Feature'?[json]:[]);
      if(!Array.isArray(features))throw Error('Type GeoJSON inconnu');
      const out=features.slice(0,1000).filter(f=>f.geometry?.type==='Point').map(f=>{
        const [lon,lat]=f.geometry.coordinates||[];
        if(!validCoord(lat,lon))return null;
        return {lat:Number(lat),lon:Number(lon),name:String(f.properties?.name||f.properties?.vessel_name||'Navire importé').slice(0,100),id:String(f.id||'')};
      }).filter(Boolean);
      if(!out.length)throw Error('Aucun Point maritime valide');
      H.vessels=out;redraw();refreshPanel();toast(out.length+' positions importées (non AIS direct)');
    }catch(e){toast('GeoJSON invalide : '+String(e.message||e))}
  }
  function showCamera(c){
    const pop=document.createElement('div');pop.id='aegisCamDialog';pop.className='cam-modal';
    pop.innerHTML='<div class="cam-dialog" role="dialog" aria-modal="true" aria-label="Caméra publique"><div class="split"><h2>'+esc(c.name)+'</h2><button class="iconBtn" id="camClose" aria-label="Fermer la caméra">✕</button></div><p class="muted">Caméra de circulation TfL · image/vidéo publique. Le fournisseur peut interrompre la diffusion.</p>'+ (c.video?'<video controls muted playsinline preload="none" poster="'+esc(c.image||'')+'"><source src="'+esc(c.video)+'" type="video/mp4">Vidéo indisponible</video>':c.image?'<img alt="Image de caméra TfL" src="'+esc(c.image)+'">':'<p>Pas d’image</p>')+'<div class="row" style="margin-top:12px">'+more('Voir chez TfL','https://tfl.gov.uk/traffic/status/')+'<button class="btn" id="camFly">Repérer sur la carte</button></div></div>';
    document.body.appendChild(pop);
    const close=()=>{const v=pop.querySelector('video');if(v)v.pause();pop.remove()};
    pop.querySelector('#camClose').onclick=close;
    pop.onclick=e=>{if(e.target===pop)close()};
    pop.querySelector('#camFly').onclick=()=>{fly(c.lat,c.lon,20000);close();B.closeSheet()};
  }
  function clicks(e){
    const b=e.target.closest('button');if(!b)return;
    const a=b.dataset.action;
    if(a==='cams-refresh')loadCameras(true);
    if(a==='cams-layer'){H.mode.cameras=!H.mode.cameras;redraw();refreshPanel()}
    if(a==='air-refresh')loadAircraft(true);
    if(a==='air-layer'){H.mode.aircraft=!H.mode.aircraft;redraw();refreshPanel()}
    if(a==='weather-refresh')loadWeather(true);
    if(a==='space-refresh')loadSpace(true);
    if(b.dataset.camera){const c=H.cameras.find(x=>x.id===b.dataset.camera);if(c)showCamera(c)}
    if(b.dataset.fly){const c=H.cameras.find(x=>x.id===b.dataset.fly);if(c){fly(c.lat,c.lon,25000);B.closeSheet()}}
    if(b.dataset.air){const a=H.aircraft.find(x=>x.id===b.dataset.air);if(a){fly(a.lat,a.lon,85000);B.closeSheet()}}
    if(b.dataset.vessel){const v=H.vessels[Number(b.dataset.vessel)];if(v){fly(v.lat,v.lon,65000);B.closeSheet()}}
  }
  const panel=$('#bodyPanel');panel.addEventListener('click',clicks);
  panel.addEventListener('input',e=>{if(e.target.id==='cameraFilter'){H.cameraQuery=e.target.value;const y=panel.scrollTop;render(S.tab,panel);panel.scrollTop=y;const el=$('#cameraFilter');if(el){el.focus();el.setSelectionRange(H.cameraQuery.length,H.cameraQuery.length)}}});
  panel.addEventListener('change',e=>{if(e.target.id==='shipGeoJSON')importShips(e.target.files?.[0])});
  const nav=$('#nav');nav.classList.add('nav-extended');
  const added=[
    ['cameras','◉ Caméras'],['aviation','✈ Avions'],['marine','≋ Navires'],
    ['meteo','☁ Météo'],['space','☀ Espace']
  ];
  for(const [tab,label] of added){const b=document.createElement('button');b.dataset.tab=tab;b.textContent=label;b.type='button';nav.appendChild(b)}
  nav.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;
    b.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
    const tab=b.dataset.tab;
    if(tab==='cameras')loadCameras();
    if(tab==='aviation')loadAircraft();
    if(tab==='meteo')loadWeather();
    if(tab==='space')loadSpace();
  });
  const prev=$('#globe');
  if(prev&&window.Cesium){ /* Entity click is handled by the original globe handler via AEGISBridge. */ }
  window.AEGISExtras={render,drawEntities,status:H.status,state:H,onEntityClick(e){
    if(e.tab==='cameras')showCamera(e.entry);
    if(e.tab==='aviation'){fly(e.entry.lat,e.entry.lon,80000);toast(e.entry.name)}
    if(e.tab==='marine'){fly(e.entry.lat,e.entry.lon,60000);toast(e.entry.name)}
  }};
  // Start with a safe low-frequency public camera lookup; the other services load on demand.
  loadCameras().catch(e=>console.warn(e));
})();
