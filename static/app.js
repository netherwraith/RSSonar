const $ = selector => document.querySelector(selector);
const translations = {
  en: {
    homeLabel: 'RSSonar home', monitorLabel: 'Feed monitor', themeLabel: 'Theme', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark', languageLabel: 'Language', rssOpenLabel: 'Copy combined RSS feed link', rssFeedLabel: 'Copy RSS link', feedCopied: 'RSS feed link copied.', copyFeedManually: 'Copy this RSS feed link:',
    heroEyebrow: 'YOUR OPEN-SOURCE UPDATE', heroLineOne: 'All the latest.', heroLineTwo: 'One clear view.', heroDescription: 'The latest releases from your RSS and Atom feeds, collected in one place. Go straight to the original announcement on GitHub or Codeberg.', viewReleases: 'View releases', refreshNow: 'Refresh now', overviewLabel: 'OVERVIEW', activeFeeds: 'active feeds', trackedReleases: 'tracked releases',
    latestEyebrow: 'LATEST UPDATES', releaseStream: 'Release stream', searchPlaceholder: 'Search releases', projectLabel: 'Project', filterLabel: 'Filter by project', allProjects: 'All projects',
    limitLabel: 'Latest per feed', limitAria: 'Number of latest releases per feed', saveLimit: 'Save', limitSaved: 'Display limit saved.', limitInvalid: 'Choose a whole number from 1 to 500 per feed.', showingCount: 'Showing {shown} of {total} entries',
    manageEyebrow: 'MANAGE SOURCES', yourFeeds: 'Your feeds', sortLabel: 'Sort feeds', sortNameAsc: 'Name A–Z', sortNameDesc: 'Name Z–A', sortNewest: 'Recently added', sortOldest: 'First added',
    addHeading: 'Add a feed', appNameLabel: 'Application name', appNamePlaceholder: 'e.g. Nextcloud', feedUrlLabel: 'RSS or Atom URL', addFeed: 'Add feed', oneFeedHeading: 'One feed for everything.', oneFeedDescription: 'Subscribe to the combined RSS feed in your reader. New entries appear after the next check.', rssOpenLink: 'Copy combined RSS feed link ⧉', signalHeading: 'Signal notifications', signalEnabled: 'Signal is configured. New releases are sent as messages.', signalDisabled: 'Signal is not configured. Set it up in the server configuration.',
    footerTagline: 'Open source in view.', rssSubscribe: 'Copy RSS link ⧉', unlockHeading: 'Unlock management', tokenHelp: 'Enter the admin token from the server configuration.', tokenLabel: 'Admin token', cancel: 'Cancel', continue: 'Continue',
    entrySingular: 'entry', entryPlural: 'entries', noMatches: 'No matching releases', noFeeds: 'No feeds configured yet', trySearch: 'Try another search term or filter.', addFirst: 'Add your first release feed below.', openOriginal: 'Open original release', noFeedsList: 'No feeds yet.', errorPrefix: 'Error', pausedStatus: 'Paused', lastChecked: 'Last checked: {date}', firstCheck: 'First check in progress…', pause: 'Pause', activate: 'Activate', rename: 'Rename', remove: 'Remove', removeConfirm: 'Remove feed “{name}” and its entries?', removed: 'Feed removed.', refreshStarted: 'Refresh started.', feedAdded: 'Feed added. The first check is running.', checkEvery: 'Checks every {minutes} minutes', loadFailed: 'Could not load data.',
    apiUnauthorized: 'Admin token missing or incorrect', apiInvalidFeed: 'Name and a valid HTTP(S) feed URL are required', apiDuplicate: 'Feed already exists', apiRefreshRunning: 'A refresh is already in progress', apiNotFound: 'Not found', apiFeedNotFound: 'Feed not found', apiNameMissing: 'Name is required', apiBodySize: 'Invalid request size'
  },
  de: {
    homeLabel: 'RSSonar Startseite', monitorLabel: 'Feed-Monitor', themeLabel: 'Design', themeSystem: 'System', themeLight: 'Hell', themeDark: 'Dunkel', languageLabel: 'Sprache', rssOpenLabel: 'Link zum gemeinsamen RSS-Feed kopieren', rssFeedLabel: 'RSS-Link kopieren', feedCopied: 'RSS-Feed-Link kopiert.', copyFeedManually: 'Diesen RSS-Feed-Link kopieren:',
    heroEyebrow: 'DEIN OPEN-SOURCE-UPDATE', heroLineOne: 'Alles Neue.', heroLineTwo: 'Ein Blick.', heroDescription: 'Die neuesten Releases deiner Anwendungen, gesammelt aus ihren RSS- und Atom-Feeds. Direkt zur Originalmeldung auf GitHub oder Codeberg.', viewReleases: 'Releases ansehen', refreshNow: 'Jetzt aktualisieren', overviewLabel: 'ÜBERSICHT', activeFeeds: 'aktive Feeds', trackedReleases: 'erfasste Releases',
    latestEyebrow: 'AKTUELLE MELDUNGEN', releaseStream: 'Release-Stream', searchPlaceholder: 'Releases durchsuchen', projectLabel: 'Projekt', filterLabel: 'Nach Projekt filtern', allProjects: 'Alle Projekte',
    limitLabel: 'Neueste pro Feed', limitAria: 'Anzahl der neuesten Releases pro Feed', saveLimit: 'Speichern', limitSaved: 'Anzeigelimit gespeichert.', limitInvalid: 'Bitte eine ganze Zahl von 1 bis 500 pro Feed wählen.', showingCount: '{shown} von {total} Einträgen',
    manageEyebrow: 'QUELLEN VERWALTEN', yourFeeds: 'Deine Feeds', sortLabel: 'Feeds sortieren', sortNameAsc: 'Name A–Z', sortNameDesc: 'Name Z–A', sortNewest: 'Zuletzt hinzugefügt', sortOldest: 'Zuerst hinzugefügt',
    addHeading: 'Neuen Feed hinzufügen', appNameLabel: 'Anwendungsname', appNamePlaceholder: 'z. B. Nextcloud', feedUrlLabel: 'RSS- oder Atom-URL', addFeed: 'Feed hinzufügen', oneFeedHeading: 'Ein Feed für alles.', oneFeedDescription: 'Abonniere den gemeinsamen RSS-Feed in deinem Reader. Neue Einträge erscheinen hier nach der nächsten Prüfung.', rssOpenLink: 'Link zum gemeinsamen RSS-Feed kopieren ⧉', signalHeading: 'Signal-Benachrichtigungen', signalEnabled: 'Signal ist eingerichtet. Neue Releases werden als Nachricht versendet.', signalDisabled: 'Signal ist nicht eingerichtet. Die Einrichtung erfolgt über die Server-Konfiguration.',
    footerTagline: 'Open Source im Blick.', rssSubscribe: 'RSS-Link kopieren ⧉', unlockHeading: 'Verwaltung freischalten', tokenHelp: 'Gib den Admin-Token aus der Server-Konfiguration ein.', tokenLabel: 'Admin-Token', cancel: 'Abbrechen', continue: 'Weiter',
    entrySingular: 'Eintrag', entryPlural: 'Einträge', noMatches: 'Keine passenden Releases', noFeeds: 'Noch keine Feeds eingerichtet', trySearch: 'Versuche einen anderen Suchbegriff oder Filter.', addFirst: 'Füge unten deinen ersten Release-Feed hinzu.', openOriginal: 'Originalmeldung öffnen', noFeedsList: 'Noch keine Feeds vorhanden.', errorPrefix: 'Fehler', pausedStatus: 'Pausiert', lastChecked: 'Zuletzt geprüft: {date}', firstCheck: 'Erste Prüfung läuft …', pause: 'Pausieren', activate: 'Aktivieren', rename: 'Umbenennen', remove: 'Entfernen', removeConfirm: 'Feed „{name}“ und seine Einträge entfernen?', removed: 'Feed entfernt.', refreshStarted: 'Aktualisierung gestartet.', feedAdded: 'Feed hinzugefügt. Die erste Prüfung läuft.', checkEvery: 'Prüfung alle {minutes} Minuten', loadFailed: 'Daten konnten nicht geladen werden.',
    apiUnauthorized: 'Admin-Token fehlt oder ist falsch', apiInvalidFeed: 'Name und gültige HTTP(S)-Feed-URL erforderlich', apiDuplicate: 'Feed ist bereits vorhanden', apiRefreshRunning: 'Aktualisierung läuft bereits', apiNotFound: 'Nicht gefunden', apiFeedNotFound: 'Feed nicht gefunden', apiNameMissing: 'Name fehlt', apiBodySize: 'Ungültige Anfragegröße'
  }
};
const apiErrors = {
  'Admin token missing or incorrect': 'apiUnauthorized',
  'Name and a valid HTTP(S) feed URL are required': 'apiInvalidFeed',
  'Feed already exists': 'apiDuplicate',
  'A refresh is already in progress': 'apiRefreshRunning',
  'Not found': 'apiNotFound',
  'Feed not found': 'apiFeedNotFound',
  'Name is required': 'apiNameMissing',
  'Invalid request size': 'apiBodySize',
  'Admin-Token fehlt oder ist falsch': 'apiUnauthorized',
  'Name und gültige HTTP(S)-Feed-URL erforderlich': 'apiInvalidFeed',
  'Feed ist bereits vorhanden': 'apiDuplicate',
  'Aktualisierung läuft bereits': 'apiRefreshRunning',
  'Nicht gefunden': 'apiNotFound',
  'Feed nicht gefunden': 'apiFeedNotFound',
  'Name fehlt': 'apiNameMissing',
  'Ungültige Anfragegröße': 'apiBodySize'
};
const sortChoices = new Set(['name-asc', 'name-desc', 'added-newest', 'added-oldest']);
let language = localStorage.getItem('rssonar-language') === 'de' ? 'de' : 'en';
let theme = ['system', 'light', 'dark'].includes(localStorage.getItem('rssonar-theme')) ? localStorage.getItem('rssonar-theme') : 'system';
let feedSort = sortChoices.has(localStorage.getItem('rssonar-feed-sort')) ? localStorage.getItem('rssonar-feed-sort') : 'name-asc';
const storedLimit = Number(localStorage.getItem('rssonar-release-limit'));
let releaseLimit = Number.isInteger(storedLimit) && storedLimit >= 1 && storedLimit <= 500 ? storedLimit : 20;
let snapshot = { feeds: [], releases: [], interval_minutes: 15, signal_enabled: false, public_feed_url: '' };
let stateLoaded = false;
let token = sessionStorage.getItem('rssonar-token') || '';
let pendingAction = null;
const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');

function t(key, values = {}) {
  return (translations[language][key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
}

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

function publicFeedUrl() {
  return snapshot.public_feed_url || new URL('/rss.xml', window.location.href).href;
}

async function copyFeedUrl() {
  if (!stateLoaded) await load();
  const url = publicFeedUrl();
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      toast(t('feedCopied'));
      return;
    }
  } catch (_) {
    // The Clipboard API may be unavailable on an HTTP server address.
  }
  const field = document.createElement('textarea');
  field.value = url;
  field.readOnly = true;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  let copied = false;
  try {
    field.select();
    copied = typeof document.execCommand === 'function' && document.execCommand('copy');
  } catch (_) {
    // Leave the URL visible for manual copying if the fallback is blocked too.
  } finally {
    field.remove();
  }
  if (copied) toast(t('feedCopied'));
  else window.prompt(t('copyFeedManually'), url);
}

function applyTheme() {
  document.documentElement.dataset.theme = theme === 'system' ? (colorScheme.matches ? 'dark' : 'light') : theme;
  $('#theme-switch').value = theme;
}

function applyLanguage() {
  document.documentElement.lang = language;
  $('#language-switch').value = language;
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria]').forEach(node => { node.setAttribute('aria-label', t(node.dataset.i18nAria)); });
  document.querySelector('meta[name="description"]').content = language === 'en'
    ? 'Open-source releases from your RSS and Atom feeds in one place.'
    : 'Open-Source-Releases aus deinen RSS- und Atom-Feeds an einem Ort.';
  renderStatus();
  renderFeeds();
  renderReleases();
}

function translateApiError(message) {
  return apiErrors[message] ? t(apiErrors[message]) : message;
}

async function api(path, options = {}) {
  const headers = { 'X-Admin-Token': token };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(translateApiError(data.error || `HTTP ${response.status}`));
    error.status = response.status;
    throw error;
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
  return action().catch(error => {
    if (error.status === 401) {
      token = '';
      sessionStorage.removeItem('rssonar-token');
      showToken(action);
    } else toast(error.message);
  });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function sortedFeeds() {
  const collator = new Intl.Collator(language, { sensitivity: 'base', numeric: true });
  return snapshot.feeds.map((feed, index) => ({ feed, index })).sort((a, b) => {
    if (feedSort.startsWith('name-')) {
      const result = collator.compare(a.feed.name, b.feed.name);
      return (feedSort === 'name-asc' ? result : -result) || a.index - b.index;
    }
    // Older saved feeds have no created timestamp; their stored order is their addition order.
    const aTime = Date.parse(a.feed.created || '') || 0;
    const bTime = Date.parse(b.feed.created || '') || 0;
    const result = aTime - bTime || a.index - b.index;
    return feedSort === 'added-oldest' ? result : -result;
  }).map(item => item.feed);
}

function renderStatus() {
  $('#metric-feeds').textContent = snapshot.feeds.filter(feed => feed.enabled).length;
  $('#metric-releases').textContent = snapshot.release_count ?? snapshot.releases.length;
  $('#poll-label').textContent = t('checkEvery', { minutes: snapshot.interval_minutes });
  $('#signal-status').textContent = t(snapshot.signal_enabled ? 'signalEnabled' : 'signalDisabled');
}

function takeLatestPerFeed(releases, limit) {
  const counts = new Map();
  return releases.filter(release => {
    const count = counts.get(release.feed_id) || 0;
    if (count >= limit) return false;
    counts.set(release.feed_id, count + 1);
    return true;
  });
}

function renderReleases() {
  const query = $('#search').value.trim().toLocaleLowerCase(language);
  const feed = $('#filter').value;
  const filtered = snapshot.releases.filter(release => (!feed || release.feed_id === feed) &&
    (!query || `${release.app} ${release.title} ${release.summary || ''}`.toLocaleLowerCase(language).includes(query)));
  const entries = takeLatestPerFeed(filtered, releaseLimit);
  $('#result-count').textContent = filtered.length > entries.length
    ? t('showingCount', { shown: entries.length, total: filtered.length })
    : `${entries.length} ${t(entries.length === 1 ? 'entrySingular' : 'entryPlural')}`;
  const list = $('#release-list');
  list.replaceChildren();
  if (!entries.length) {
    const empty = el('div', 'empty');
    empty.append(el('strong', '', t(snapshot.feeds.length ? 'noMatches' : 'noFeeds')));
    empty.append(el('span', '', t(snapshot.feeds.length ? 'trySearch' : 'addFirst')));
    list.append(empty);
    return;
  }
  for (const release of entries) {
    const link = el('a', 'release-card');
    link.href = release.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${release.app}: ${release.title} – ${t('openOriginal')}`);
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
  const feeds = sortedFeeds();
  list.replaceChildren();
  if (!feeds.length) list.append(el('div', 'empty', t('noFeedsList')));
  for (const feed of feeds) {
    const row = el('div', 'feed-row');
    row.append(el('div', 'feed-icon', feed.name.slice(0, 1).toUpperCase()));
    const info = el('div', 'feed-info');
    info.append(el('span', 'feed-name', feed.name));
    info.append(el('span', 'feed-url', feed.url));
    const metaText = feed.error ? `${t('errorPrefix')}: ${feed.error}`
      : !feed.enabled ? t('pausedStatus')
      : feed.checked ? t('lastChecked', { date: formatDate(feed.checked) }) : t('firstCheck');
    info.append(el('span', `feed-meta${feed.error ? ' error' : ''}`, metaText));
    row.append(info);
    const toggle = el('button', 'text-button', t(feed.enabled ? 'pause' : 'activate'));
    toggle.type = 'button';
    toggle.addEventListener('click', () => withAdmin(async () => {
      await api(`/api/feeds/${encodeURIComponent(feed.id)}`, { method: 'PATCH', body: JSON.stringify({ enabled: !feed.enabled }) });
      await load();
    }));
    row.append(toggle);
    const rename = el('button', 'text-button', t('rename'));
    rename.type = 'button';
    rename.addEventListener('click', () => {
      const name = prompt(t('appNameLabel'), feed.name);
      if (!name || !name.trim() || name.trim() === feed.name) return;
      withAdmin(async () => {
        await api(`/api/feeds/${encodeURIComponent(feed.id)}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) });
        await load();
      });
    });
    row.append(rename);
    const remove = el('button', 'icon-button', '×');
    remove.type = 'button';
    remove.title = `${feed.name}: ${t('remove')}`;
    remove.setAttribute('aria-label', remove.title);
    remove.addEventListener('click', () => {
      if (!confirm(t('removeConfirm', { name: feed.name }))) return;
      withAdmin(async () => { await api(`/api/feeds/${encodeURIComponent(feed.id)}`, { method: 'DELETE' }); await load(); toast(t('removed')); });
    });
    row.append(remove);
    list.append(row);
  }
  const filter = $('#filter');
  const selected = filter.value;
  filter.replaceChildren(new Option(t('allProjects'), ''));
  feeds.forEach(feed => filter.add(new Option(feed.name, feed.id)));
  filter.value = selected;
}

async function load() {
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error(t('loadFailed'));
    snapshot = await response.json();
    stateLoaded = true;
    renderStatus();
    renderFeeds();
    renderReleases();
  } catch (error) { toast(error.message); }
}

$('#search').addEventListener('input', renderReleases);
document.querySelectorAll('.copy-rss-link').forEach(button => button.addEventListener('click', copyFeedUrl));
$('#filter').addEventListener('change', renderReleases);
$('#release-limit').value = releaseLimit;
$('#save-limit').addEventListener('click', () => {
  const chosen = Number($('#release-limit').value);
  if (!Number.isInteger(chosen) || chosen < 1 || chosen > 500) return toast(t('limitInvalid'));
  releaseLimit = chosen;
  localStorage.setItem('rssonar-release-limit', String(releaseLimit));
  renderReleases();
  toast(t('limitSaved'));
});
$('#feed-sort').value = feedSort;
$('#feed-sort').addEventListener('change', event => {
  feedSort = sortChoices.has(event.target.value) ? event.target.value : 'name-asc';
  localStorage.setItem('rssonar-feed-sort', feedSort);
  renderFeeds();
  renderReleases();
});
$('#theme-switch').addEventListener('change', event => {
  theme = ['system', 'light', 'dark'].includes(event.target.value) ? event.target.value : 'system';
  localStorage.setItem('rssonar-theme', theme);
  applyTheme();
});
colorScheme.addEventListener('change', () => { if (theme === 'system') applyTheme(); });
$('#language-switch').addEventListener('change', event => {
  language = event.target.value === 'de' ? 'de' : 'en';
  localStorage.setItem('rssonar-language', language);
  applyLanguage();
});
$('#refresh').addEventListener('click', () => withAdmin(async () => {
  await api('/api/refresh', { method: 'POST' });
  toast(t('refreshStarted'));
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
    toast(t('feedAdded'));
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
  if (action) withAdmin(action);
});
$('#token-cancel').addEventListener('click', () => { pendingAction = null; $('#token-dialog').close(); });
applyTheme();
applyLanguage();
load();
setInterval(load, 60000);
