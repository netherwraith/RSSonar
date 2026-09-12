# RSSonar

**Open-Source-Releases im Blick.** RSSonar sammelt Release-Einträge aus beliebig vielen RSS- und Atom-Feeds, zeigt sie chronologisch auf einer Webseite und stellt unter `/rss.xml` einen gemeinsamen Feed bereit. Neue Einträge können optional per Signal zugestellt werden.

## Funktionen

- Feeds über die Webseite hinzufügen und entfernen; 14 Feeds sind kein Sonderfall.
- Automatische Prüfung alle 15 Minuten (konfigurierbar) sowie manuelle Aktualisierung.
- Releases nach Anwendung filtern und durchsuchen. Jeder Eintrag führt zur Original-URL des Feeds, etwa zu GitHub oder Codeberg.
- Zusammengefasster RSS-2.0-Feed unter `/rss.xml`.
- Deduplizierung über Feed und GUID; bereits gespeicherte Einträge überstehen Neustarts.
- Optionaler Signal-Versand über [signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api).
- Keine Python-Pakete, Datenbank oder Build-Schritte nötig; Python 3.9+ genügt.

## Schnellstart mit Docker Compose

```sh
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

Für öffentlich erreichbare Installationen `PUBLIC_URL` auf die tatsächliche HTTPS-Adresse setzen und die Anwendung hinter einem HTTPS-Reverse-Proxy betreiben. Standardmäßig bindet Docker nur an `127.0.0.1`; `RSSONAR_BIND=0.0.0.0` öffnet den Port im Netzwerk. Den Signal-API-Port nicht öffentlich freigeben.

## Feed-URLs

Auf GitHub ist häufig `https://github.com/OWNER/REPO/releases.atom` geeignet. Bei Codeberg sollte die konkrete RSS-/Atom-URL der jeweiligen Release-Seite verwendet werden. RSSonar nutzt den Link aus jedem Feed-Eintrag als Ziel; es erfindet keine Release-URL. Der erste erfolgreiche Abruf übernimmt bestehende Einträge **ohne Signal-Meldungen**. Erst danach neu auftauchende Einträge lösen Benachrichtigungen aus.

## Signal einrichten (optional)

RSSonar verwendet nicht eine offizielle Signal-Push-API, sondern die selbst betriebene [signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api). Der Versand nutzt deren dokumentierten Endpunkt `POST /v2/send`. In `.env` eintragen:

```dotenv
SIGNAL_API_URL=http://signal-api:8080
SIGNAL_NUMBER=+491234567890
SIGNAL_RECIPIENTS=+491234567890
```

Mehrere Empfänger können kommasepariert angegeben werden. Den Dienst starten:

```sh
docker compose --profile signal up -d --build
```

Das Signal-Konto beziehungsweise Zweitgerät gemäß der [Projektanleitung](https://github.com/bbernhard/signal-cli-rest-api#-getting-started) verknüpfen. Die QR-Code-Seite ist lokal unter `http://localhost:8080/v1/qrcodelink?device_name=RSSonar` erreichbar. Die Signal-Daten werden in `./signal-data` gespeichert und sollten gesichert werden. Falls der Versand scheitert, bleibt die Nachricht zur erneuten Zustellung bei der nächsten Prüfung vorgemerkt. Bei einem Absturz zwischen erfolgreichem Versand und Speicherung der Bestätigung kann ausnahmsweise eine doppelte Nachricht entstehen.

Ein bereits vorhandener Signal-API-Dienst lässt sich statt des Compose-Profils über `SIGNAL_API_URL` anbinden.

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
