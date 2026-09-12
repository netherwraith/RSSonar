const $ = selector => document.querySelector(selector);
let snapshot = { feeds: [], releases: [] };
let token = sessionStorage.getItem('rssonar-token') || '';
let pendingAction = null;

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function toast(message) {
  const box = $('#toast');
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove('show'), 4500);
}

async function api(path, options = {}) {
  const headers = { 'X-Admin-Token': token };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('rssonar-token');
      token = '';
      showToken(() => api(path, options));
    }
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function showToken(action) {
  pendingAction = action;
  $('#token-dialog').showModal();
  $('#token-input').focus();
}

function withAdmin(action) {
  if (!token) return showToken(action);
  return action().catch(error => toast(error.message));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function renderReleases() {
  const query = $('#search').value.trim().toLocaleLowerCase('de');
  const feed = $('#filter').value;
  const entries = snapshot.releases.filter(r => (!feed || r.feed_id === feed) &&
    (!query || `${r.app} ${r.title} ${r.summary}`.toLocaleLowerCase('de').includes(query)));
  $('#result-count').textContent = `${entries.length} ${entries.length === 1 ? 'Eintrag' : 'Einträge'}`;
  const list = $('#release-list');
  list.replaceChildren();
  if (!entries.length) {
    const empty = el('div', 'empty');
    empty.append(el('strong', '', snapshot.feeds.length ? 'Keine passenden Releases' : 'Noch keine Feeds eingerichtet'));
    empty.append(el('span', '', snapshot.feeds.length ? 'Versuche einen anderen Suchbegriff oder Filter.' : 'Füge unten deinen ersten Release-Feed hinzu.'));
    list.append(empty);
    return;
  }
  for (const release of entries) {
    const link = el('a', 'release-card');
    link.href = release.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${release.app}: ${release.title} – Originalmeldung öffnen`);
    link.append(el('span', 'app-avatar', release.app.slice(0, 1).toUpperCase()));
    const main = el('div', 'release-main');
    main.append(el('span', 'release-app', release.app));
    main.append(el('span', 'release-title', release.title));
    if (release.summary) main.append(el('p', 'release-summary', release.summary));
    link.append(main);
    const side = el('div', 'release-side');
    side.append(el('time', '', formatDate(release.published)));
    side.append(el('span', 'arrow', '↗'));
    link.append(side);
    list.append(link);
  }
}

function renderFeeds() {
  const list = $('#feed-list');
  list.replaceChildren();
  if (!snapshot.feeds.length) {
    list.append(el('div', 'empty', 'Noch keine Feeds vorhanden.'));
  }
  for (const feed of snapshot.feeds) {
    const row = el('div', 'feed-row');
    row.append(el('div', 'feed-icon', feed.name.slice(0, 1).toUpperCase()));
    const info = el('div', 'feed-info');
    info.append(el('span', 'feed-name', feed.name));
    info.append(el('span', 'feed-url', feed.url));
    const meta = el('span', `feed-meta${feed.error ? ' error' : ''}`,
      feed.error ? `Fehler: ${feed.error}` : feed.checked ? `Zuletzt geprüft: ${formatDate(feed.checked)}` : 'Erste Prüfung läuft …');
    info.append(meta);
    row.append(info);
    const toggle = el('button', 'text-button', feed.enabled ? 'Pausieren' : 'Aktivieren');
    toggle.type = 'button';
    toggle.addEventListener('click', () => withAdmin(async () => {
      await api(`/api/feeds/${encodeURIComponent(feed.id)}`, { method: 'PATCH', body: JSON.stringify({ enabled: !feed.enabled }) });
      await load();
    }));
    row.append(toggle);
    const rename = el('button', 'text-button', 'Umbenennen');
    rename.type = 'button';
    rename.addEventListener('click', () => {
      const name = prompt('Anwendungsname', feed.name);
      if (!name || !name.trim() || name.trim() === feed.name) return;
      withAdmin(async () => {
        await api(`/api/feeds/${encodeURIComponent(feed.id)}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) });
        await load();
      });
    });
    row.append(rename);
    const remove = el('button', 'icon-button', '×');
    remove.type = 'button';
    remove.title = `${feed.name} entfernen`;
    remove.setAttribute('aria-label', remove.title);
    remove.addEventListener('click', () => {
      if (!confirm(`Feed „${feed.name}“ und seine Einträge entfernen?`)) return;
      withAdmin(async () => { await api(`/api/feeds/${encodeURIComponent(feed.id)}`, { method: 'DELETE' }); await load(); toast('Feed entfernt.'); });
    });
    row.append(remove);
    list.append(row);
  }
  const filter = $('#filter');
  const selected = filter.value;
  filter.replaceChildren(new Option('Alle Projekte', ''));
  snapshot.feeds.forEach(feed => filter.add(new Option(feed.name, feed.id)));
  filter.value = selected;
}

async function load() {
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error('Daten konnten nicht geladen werden.');
    snapshot = await response.json();
    $('#metric-feeds').textContent = snapshot.feeds.filter(f => f.enabled).length;
    $('#metric-releases').textContent = snapshot.releases.length;
    $('#poll-label').textContent = `Prüfung alle ${snapshot.interval_minutes} Minuten`;
    $('#signal-status').textContent = snapshot.signal_enabled ? 'Signal ist eingerichtet. Neue Releases werden als Nachricht versendet.' : 'Signal ist nicht eingerichtet. Die Einrichtung erfolgt über die Server-Konfiguration.';
    renderFeeds();
    renderReleases();
  } catch (error) { toast(error.message); }
}

$('#search').addEventListener('input', renderReleases);
$('#filter').addEventListener('change', renderReleases);
$('#refresh').addEventListener('click', () => withAdmin(async () => {
  await api('/api/refresh', { method: 'POST' });
  toast('Aktualisierung gestartet.');
  setTimeout(load, 3000);
}));
$('#add-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('#feed-name').value.trim();
  const url = $('#feed-url').value.trim();
  withAdmin(async () => {
    await api('/api/feeds', { method: 'POST', body: JSON.stringify({ name, url }) });
    $('#add-form').reset();
    await load();
    toast('Feed hinzugefügt. Die erste Prüfung läuft.');
    setTimeout(load, 3000);
  });
});
$('#token-form').addEventListener('submit', event => {
  event.preventDefault();
  token = $('#token-input').value;
  sessionStorage.setItem('rssonar-token', token);
  $('#token-dialog').close();
  const action = pendingAction;
  pendingAction = null;
  if (action) action().then(load).catch(error => toast(error.message));
});
$('#token-cancel').addEventListener('click', () => $('#token-dialog').close());
load();
setInterval(load, 60000);
