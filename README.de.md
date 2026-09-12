# RSSonar

<img src="static/logo-wordmark.svg" alt="RSSonar-Logo" width="420">

[English documentation](README.MD)

**Open-Source-Releases im Blick.** RSSonar sammelt Release-Einträge aus beliebig vielen RSS- und Atom-Feeds, zeigt sie chronologisch auf einer Webseite und stellt unter `/rss.xml` einen gemeinsamen Feed bereit. Neue Einträge können optional per Signal zugestellt werden.

## Funktionen

- Feeds über die Webseite hinzufügen und entfernen; 14 Feeds sind kein Sonderfall.
- Automatische Prüfung alle 15 Minuten (konfigurierbar) sowie manuelle Aktualisierung.
- Releases nach Anwendung filtern und durchsuchen. Jeder Eintrag führt zur Original-URL des Feeds, etwa zu GitHub oder Codeberg.
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

Ohne Docker:

```sh
ADMIN_TOKEN='ein-langes-zufaelliges-geheimnis' python3 app.py
```

Für öffentlich erreichbare Installationen `PUBLIC_URL` auf die tatsächliche HTTPS-Adresse setzen und die Anwendung hinter einem Reverse Proxy betreiben. Standardmäßig bindet Docker nur an `127.0.0.1`; `RSSONAR_BIND=0.0.0.0` öffnet den Port im Netzwerk. Das ist nur nötig, wenn ein Proxy auf einem anderen Host keinen privaten Netzwerkpfad zu RSSonar hat.

## Reverse Proxy

RSSonar hört im Container auf Port `8765` und soll unter einer eigenen HTTPS-Domain wie `https://releases.example.org` am URL-Pfad `/` erreichbar sein. Die Oberfläche ruft `/api/state` auf; der kombinierte Feed liegt unter `/rss.xml`. Beide Pfade müssen unverändert zum selben Backend weitergeleitet werden. In `.env` `PUBLIC_URL=https://releases.example.org` setzen. Bei einem Proxy auf demselben Host ist das Standardziel `http://127.0.0.1:8765`. Läuft der Proxy selbst in einem Container, müssen Proxy und RSSonar ein gemeinsames Docker-Netzwerk nutzen; dort lautet das Ziel `http://rssonar:8765`.

- **[Pangolin](https://docs.pangolin.net/manage/resources/public/targets):** Eine öffentliche HTTP-Ressource für die Domain anlegen und einen von der Pangolin-Site erreichbaren Target-Host mit Port `8765` eintragen. `127.0.0.1` meint innerhalb eines Containers dessen eigenen Netzwerk-Namespace, nicht automatisch den RSSonar-Host.
- **[Traefik](https://doc.traefik.io/traefik/providers/docker/):** Beide Container in dasselbe Docker-Netzwerk aufnehmen. Am RSSonar-Dienst einen Router mit ``Host(`releases.example.org`)`` und den Service-Port `8765` konfigurieren; TLS über den vorhandenen Traefik-Entry-Point aktivieren.
- **[Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html):** Im HTTPS-`server`-Block `location / { proxy_pass http://127.0.0.1:8765; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }` verwenden. Bei getrennten Containern statt Loopback den internen Dienstnamen nutzen.
- **[Nginx Proxy Manager (NPM)](https://nginxproxymanager.com/guide/):** Einen Proxy Host für die Domain anlegen, Scheme `http`, Forward Hostname `rssonar` im gemeinsamen Docker-Netz oder die erreichbare Host-Adresse, Forward Port `8765`; im SSL-Reiter ein Zertifikat und HTTPS einschalten.

Die öffentliche Webseite und `/rss.xml` sind ohne Admin-Token lesbar. Falls der Proxy einen zusätzlichen Login vor die gesamte Domain setzt, ist auch der RSS-Feed nur für Reader erreichbar, die diesen Login beherrschen. Den Admin-Token nicht in Proxy-Labels oder URLs eintragen.

## Feed-URLs

Auf GitHub ist häufig `https://github.com/OWNER/REPO/releases.atom` geeignet. Bei Codeberg sollte die konkrete RSS-/Atom-URL der jeweiligen Release-Seite verwendet werden. RSSonar nutzt den Link aus jedem Feed-Eintrag als Ziel; es erfindet keine Release-URL. Der erste erfolgreiche Abruf übernimmt bestehende Einträge **ohne Signal-Meldungen**. Erst danach neu auftauchende Einträge lösen Benachrichtigungen aus.

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
```

Lizenz: MIT.
