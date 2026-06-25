// ===== Mapa de códigos WMO → ícone + descrição (PT-BR) =====
const WMO = {
  0:  ['☀️', 'Céu limpo'],
  1:  ['🌤️', 'Predomínio de sol'],
  2:  ['⛅', 'Parcialmente nublado'],
  3:  ['☁️', 'Nublado'],
  45: ['🌫️', 'Névoa'],
  48: ['🌫️', 'Névoa com geada'],
  51: ['🌦️', 'Garoa fraca'],
  53: ['🌦️', 'Garoa moderada'],
  55: ['🌧️', 'Garoa intensa'],
  61: ['🌦️', 'Chuva fraca'],
  63: ['🌧️', 'Chuva moderada'],
  65: ['🌧️', 'Chuva forte'],
  71: ['🌨️', 'Neve fraca'],
  73: ['🌨️', 'Neve moderada'],
  75: ['❄️', 'Neve forte'],
  80: ['🌦️', 'Pancadas de chuva'],
  81: ['🌧️', 'Pancadas moderadas'],
  82: ['⛈️', 'Pancadas fortes'],
  95: ['⛈️', 'Tempestade'],
  96: ['⛈️', 'Tempestade com granizo'],
  99: ['⛈️', 'Tempestade forte'],
};
const wmo = (c) => WMO[c] || ['🌡️', 'Indefinido'];
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const $ = (id) => document.getElementById(id);
const statusEl = $('status'), weatherEl = $('weather');

function setStatus(msg) { statusEl.textContent = msg; statusEl.classList.remove('hidden'); weatherEl.classList.add('hidden'); }

// Fundo conforme temperatura
function setTheme(temp) {
  let grad;
  if (temp <= 5) grad = 'linear-gradient(160deg,#1e3c72,#2a5298,#6dd5fa)';
  else if (temp <= 15) grad = 'linear-gradient(160deg,#2c3e7b,#4a6fa5,#7b9acc)';
  else if (temp <= 25) grad = 'linear-gradient(160deg,#3b4d9e,#6a4ea0,#9d5ba0)';
  else grad = 'linear-gradient(160deg,#e96443,#cf5c54,#904e95)';
  document.body.style.background = grad;
  document.body.style.backgroundAttachment = 'fixed';
}

async function geocode(name) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=pt&format=json`);
  const j = await r.json();
  if (!j.results || !j.results.length) throw new Error('Cidade não encontrada');
  const g = j.results[0];
  return { lat: g.latitude, lon: g.longitude, label: `${g.name}, ${g.country_code}` };
}

async function getWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
  const r = await fetch(url);
  return r.json();
}

function render(label, data) {
  const c = data.current;
  const [icon, desc] = wmo(c.weather_code);
  $('curCity').textContent = label;
  $('curDesc').textContent = desc;
  $('curIcon').textContent = icon;
  $('curTemp').textContent = Math.round(c.temperature_2m);
  setTheme(c.temperature_2m);

  $('metrics').innerHTML = [
    ['🌡️', `${Math.round(c.apparent_temperature)}°`, 'Sensação'],
    ['💧', `${c.relative_humidity_2m}%`, 'Umidade'],
    ['💨', `${Math.round(c.wind_speed_10m)} km/h`, 'Vento'],
  ].map(([i, v, l]) => `
    <div class="metric"><div class="metric__ico">${i}</div>
      <div class="metric__val">${v}</div><div class="metric__lbl">${l}</div></div>`).join('');

  const d = data.daily;
  $('forecast').innerHTML = d.time.map((t, i) => {
    const [ic] = wmo(d.weather_code[i]);
    const dia = i === 0 ? 'Hoje' : DIAS[new Date(t + 'T00:00').getDay()];
    return `<div class="day">
      <div class="day__name">${dia}</div>
      <div class="day__ico">${ic}</div>
      <div class="day__max">${Math.round(d.temperature_2m_max[i])}°</div>
      <div class="day__min">${Math.round(d.temperature_2m_min[i])}°</div>
    </div>`;
  }).join('');

  statusEl.classList.add('hidden');
  weatherEl.classList.remove('hidden');
}

async function loadCity(name) {
  try {
    setStatus(`Buscando "${name}"...`);
    const g = await geocode(name);
    const w = await getWeather(g.lat, g.lon);
    render(g.label, w);
  } catch (e) { setStatus(`⚠️ ${e.message}`); }
}

async function loadCoords(lat, lon, label) {
  try {
    const w = await getWeather(lat, lon);
    render(label, w);
  } catch { setStatus('⚠️ Não foi possível carregar o clima.'); }
}

// Form
$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('city').value.trim();
  if (v) loadCity(v);
});

// Geolocalização inicial (com fallback para São Paulo)
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => loadCoords(pos.coords.latitude, pos.coords.longitude, 'Sua localização'),
    () => loadCity('São Paulo'),
    { timeout: 8000 }
  );
} else {
  loadCity('São Paulo');
}
