# RSSonar

<img src="static/logo-wordmark.svg" alt="RSSonar-Logo" width="420">

[English documentation](README.MD)

**Open-Source-Releases im Blick.** RSSonar sammelt Release-Einträge aus beliebig vielen RSS- und Atom-Feeds, zeigt sie chronologisch auf einer Webseite und stellt unter `/rss.xml` einen gemeinsamen Feed bereit. Neue Einträge können optional per Signal zugestellt werden.

## Funktionen

- Feeds über die Webseite hinzufügen, umbenennen, pausieren und entfernen. Sortierung nach Name (A–Z als Standard oder Z–A) oder Hinzufügung.
- Automatische Prüfung alle 15 Minuten (konfigurierbar) sowie manuelle Aktualisierung.
- Releases nach Anwendung filtern und durchsuchen. Die Anzahl der neuesten angezeigten Treffer ist **pro Feed** wählbar und speicherbar (1–500; Standard 20). Bei 5 und 14 Feeds erscheinen bis zu 70 Releases in einem chronologischen Stream. Jeder Eintrag führt zur Original-URL des Feeds, etwa zu GitHub oder Codeberg.
- Zwischen hellem, dunklem und System-Design sowie Englisch (Standard) und Deutsch umschalten. Anzeigeeinstellungen werden im Browser gespeichert.
- Zusammengefasster RSS-2.0-Feed unter `/rss.xml`.
- Deduplizierung über Feed und GUID; bereits gespeicherte Einträge überstehen Neustarts.
- Optionaler Signal-Versand über eine bereits vorhandene [signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api). RSSonar startet keinen Signal-Dienst.
- Keine Python-Pakete, Datenbank oder Build-Schritte nötig; Python 3.9+ genügt.

## Schnellstart mit Docker Compose

```sh
git clone https://github.com/netherwraith/rssonar.git
cd rssonar
cp .env.example .env
python3 -c 'import secrets; print(secrets.token_urlsafe(32))'
```

Den ausgegebenen Wert in `.env` als `ADMIN_TOKEN` eintragen. Anschließend:

```sh
docker compose up -d --build
```

Die Oberfläche ist unter <http://localhost:8765> erreichbar. Beim ersten Hinzufügen oder manuellen Aktualisieren fragt sie nach dem Admin-Token. Er bleibt nur für den aktuellen Browser-Tab in `sessionStorage`. Die Webseite und `/rss.xml` sind ohne Token lesbar. Daten liegen in `./data/state.json`; dieses Verzeichnis sichern, wenn die Feed-Liste und Historie erhalten bleiben sollen.

Von einem anderen Gerät aus `http://SERVER_IP:8765` öffnen und in `.env` `PUBLIC_URL=http://SERVER_IP:8765` setzen (oder die HTTPS-Domain verwenden). Docker veröffentlicht Port `8765` standardmäßig auf allen Netzwerkschnittstellen des Servers (`RSSONAR_BIND=0.0.0.0`). Alternativ kann `RSSONAR_BIND` auf die tatsächliche LAN-IP des Servers gesetzt werden. Für direkten Zugriff muss die Firewall den Port zulassen; für öffentlichen Zugriff empfiehlt sich ein HTTPS-Reverse-Proxy.

## Bestehenden Server aktualisieren

Im geklonten Repository auf dem Server ausführen:

```sh
cd /pfad/zu/rssonar
git pull --ff-only
docker compose up -d --build
docker compose ps
docker compose logs --tail=50 rssonar
```

Vor dem Neustart `.env` prüfen: Ein bisheriger Eintrag `RSSONAR_BIND=127.0.0.1` **überschreibt den neuen Standardwert**. Ihn auf `RSSONAR_BIND=0.0.0.0` oder die tatsächliche Server-IP ändern und `PUBLIC_URL` auf die von außen erreichbare URL setzen. Den vorhandenen `ADMIN_TOKEN` und das Verzeichnis `./data` beibehalten; `docker compose up -d --build` baut das Image neu und erstellt den Dienst bei Bedarf erneut, ohne die eingebundenen Daten zu löschen. Bei einer Installation aus dem Quellarchiv statt einem Git-Klon die Anwendungsdateien aus dem neuen Archiv ersetzen, `.env` und `./data` behalten und anschließend denselben Compose-Befehl ausführen.

Ohne Docker:

```sh
ADMIN_TOKEN='ein-langes-zufaelliges-geheimnis' python3 app.py
```

Für öffentlich erreichbare Installationen `PUBLIC_URL` auf die tatsächliche HTTPS-Adresse setzen und die Anwendung hinter einem Reverse Proxy betreiben.

## Reverse Proxy

RSSonar hört im Container auf Port `8765` und soll unter einer eigenen HTTPS-Domain wie `https://releases.example.org` am URL-Pfad `/` erreichbar sein. Die Oberfläche ruft `/api/state` auf; der kombinierte Feed liegt unter `/rss.xml`. Beide Pfade müssen unverändert zum selben Backend weitergeleitet werden. In `.env` `PUBLIC_URL=https://releases.example.org` setzen. Bei einem Proxy auf demselben Host ist das Ziel `http://127.0.0.1:8765` weiterhin erreichbar. Läuft der Proxy selbst in einem Container, müssen Proxy und RSSonar ein gemeinsames Docker-Netzwerk nutzen; dort lautet das Ziel `http://rssonar:8765`. Die Standardeinstellung `RSSONAR_BIND=0.0.0.0` veröffentlicht den Port auch auf den anderen Server-Schnittstellen; bei Bedarf Zugriff per Firewall beschränken oder in `.env` eine bestimmte Schnittstellen-IP angeben.

- **[Pangolin](https://docs.pangolin.net/manage/resources/public/targets):** Eine öffentliche HTTP-Ressource für die Domain anlegen und einen von der Pangolin-Site erreichbaren Target-Host mit Port `8765` eintragen. `127.0.0.1` meint innerhalb eines Containers dessen eigenen Netzwerk-Namespace, nicht automatisch den RSSonar-Host.
- **[Traefik](https://doc.traefik.io/traefik/providers/docker/):** Beide Container in dasselbe Docker-Netzwerk aufnehmen. Am RSSonar-Dienst einen Router mit ``Host(`releases.example.org`)`` und den Service-Port `8765` konfigurieren; TLS über den vorhandenen Traefik-Entry-Point aktivieren.
- **[Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html):** Im HTTPS-`server`-Block `location / { proxy_pass http://127.0.0.1:8765; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }` verwenden. Bei getrennten Containern statt Loopback den internen Dienstnamen nutzen.
- **[Nginx Proxy Manager (NPM)](https://nginxproxymanager.com/guide/):** Einen Proxy Host für die Domain anlegen, Scheme `http`, Forward Hostname `rssonar` im gemeinsamen Docker-Netz oder die erreichbare Host-Adresse, Forward Port `8765`; im SSL-Reiter ein Zertifikat und HTTPS einschalten.

Die öffentliche Webseite und `/rss.xml` sind ohne Admin-Token lesbar. Falls der Proxy einen zusätzlichen Login vor die gesamte Domain setzt, ist auch der RSS-Feed nur für Reader erreichbar, die diesen Login beherrschen. Den Admin-Token nicht in Proxy-Labels oder URLs eintragen.

## Feed-URLs

Auf GitHub ist häufig `https://github.com/OWNER/REPO/releases.atom` geeignet. Bei Codeberg/Forgejo lautet die Release-Feed-URL `https://codeberg.org/OWNER/REPO/releases.rss`; die Adresse mit nur `/releases` liefert HTML statt eines Feeds. RSSonar korrigiert Codeberg-Release-Seiten automatisch zu `.rss`, auch bei bereits gespeicherten Feeds nach dem nächsten erfolgreichen Abruf. Bei anderen Forgejo-Instanzen die tatsächliche `.rss`-Feed-URL eintragen. RSSonar nutzt den Link aus jedem Feed-Eintrag als Ziel; es erfindet keine Release-URL. Der erste erfolgreiche Abruf übernimmt bestehende Einträge **ohne Signal-Meldungen**. Erst danach neu auftauchende Einträge lösen Benachrichtigungen aus.

## Signal einrichten (optional)

RSSonar bringt keinen Signal-API-Dienst mit. Ist bereits eine [signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api) erreichbar, kann RSSonar deren dokumentierten Endpunkt `POST /v2/send` nutzen. In `.env` die aus dem RSSonar-Container erreichbare Basis-URL und die Nummern eintragen:

```dotenv
SIGNAL_API_URL=https://signal-api.example.org
SIGNAL_NUMBER=+491234567890
SIGNAL_RECIPIENTS=+491234567890
```

Mehrere Empfänger können kommasepariert angegeben werden. Der externe Dienst muss vom RSSonar-Container aus erreichbar und für dessen Anfragen freigegeben sein. Die Signal-API sollte nur über ein privates Netz oder einen passend abgesicherten Proxy zugänglich sein; RSSonar sendet derzeit keine zusätzlichen API-Zugangsdaten. Falls der Versand scheitert, bleibt die Nachricht zur erneuten Zustellung bei der nächsten Prüfung vorgemerkt. Bei einem Absturz zwischen erfolgreichem Versand und Speicherung der Bestätigung kann ausnahmsweise eine doppelte Nachricht entstehen. Ohne die drei Signal-Variablen bleibt der Versand deaktiviert.

## Betrieb und Grenzen

- RSSonar prüft die Feeds innerhalb des konfigurierten Intervalls, nicht sekundengenau beim Release.
- Der Serverprozess muss laufen. Reines statisches HTML oder klassischer PHP-Webspace ohne Hintergrundjob kann die regelmäßige Prüfung und Signal-Zustellung nicht leisten.
- Feeds dürfen höchstens 2 MB groß sein; je Feed werden höchstens die ersten 100 Einträge eines Abrufs verarbeitet.
- Die Admin-API akzeptiert nur Anfragen mit `X-Admin-Token`. Wer einen öffentlich erreichbaren Server betreibt, sollte zusätzlich HTTPS und üblichen Zugriffsschutz für die Verwaltung vorsehen. Admins können Feed-URLs konfigurieren; nur vertrauenswürdige Admins sollten den Token erhalten.
- Die JSON-Datei ist für eine einzelne Serverinstanz gedacht. Mehrere parallel laufende Instanzen benötigen eine gemeinsame Datenbank und koordinierte Jobs.

## Entwicklung

```sh
python3 -m unittest discover -s tests -v
python3 -m py_compile app.py
node tests/test_frontend.js
```

Lizenz: MIT.
