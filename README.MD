# RSSonar

<img src="static/logo-wordmark.svg" alt="RSSonar logo" width="420">

**Keep open-source releases in view.** RSSonar collects releases from any number of RSS and Atom feeds, displays them in chronological order, and publishes one combined feed at `/rss.xml`. It can optionally forward new releases to an existing, separately hosted Signal API.

[Deutsche Anleitung](README.de.md)

## Features

- Add, rename, pause, and remove feeds in the web interface. Sort feeds by name (A–Z by default, or Z–A) or by when they were added.
- Import subscriptions from a `.opml` file, with a preview and explicit confirmation before merging or replacing the feed list.
- Export the entire configured feed list as an OPML file, including paused feeds.
- Check feeds every 15 minutes by default, with a manual refresh option.
- Search releases and filter by application. Set and save how many of the latest matching releases to display **per feed** (1–500; 20 by default). With 5 selected and 14 feeds, up to 70 releases appear in one chronological stream. Each entry links to the original release URL from its feed, such as a GitHub or Codeberg release page.
- Switch between light, dark, and system themes and between English (default) and German. Display preferences are saved in the browser.
- Copy the full URL of the combined RSS 2.0 feed with any RSS button. The feed remains available at `/rss.xml`; clicking the buttons does not download it.
- Deduplicate entries by feed and GUID; stored releases survive restarts.
- Optionally send new entries through an existing [signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api). RSSonar does not start or bundle a Signal service.
- Run without Python packages, a database, or a build step; Python 3.9+ is sufficient.

## Quick start with Docker Compose

```sh
git clone https://github.com/netherwraith/RSSonar.git
cd RSSonar
(
  umask 077
  RSSONAR_ADMIN_TOKEN=$(openssl rand -hex 32) || exit 1
  sed "s/^ADMIN_TOKEN=.*/ADMIN_TOKEN=${RSSONAR_ADMIN_TOKEN}/" .env.example > .env || exit 1
  printf 'Admin token: %s\n' "$RSSONAR_ADMIN_TOKEN"
)
```

This writes the generated 64-character hex token to `.env` as `ADMIN_TOKEN` and prints it once in the terminal. Save the displayed value for administration. Run this setup only for a new installation: it overwrites `.env` and would replace an existing token. Then start RSSonar:

```sh
docker compose up -d --build
```

Open <http://localhost:8765>. The Compose container is named `rssonar-app`. The interface asks for the admin token when you first add a feed or trigger a manual refresh. It keeps the token in `sessionStorage` for the current browser tab only. The dashboard and `/rss.xml` are readable without a token. Application data lives in `./data/state.json`; back up this directory if you want to preserve the feed list and history.

Click **Copy RSS link** to copy the complete feed URL. Without `PUBLIC_FEED_URL`, RSSonar uses the address currently shown in your browser, followed by `/rss.xml`. On HTTP addresses where the browser blocks the Clipboard API, RSSonar tries a compatibility copy method and offers the URL for manual copying if that also fails. The feed URL itself is not stored in browser storage.

For access from another device, open `http://SERVER_IP:8765` and set `PUBLIC_URL=http://SERVER_IP:8765` in `.env` (or use your HTTPS hostname). By default, Docker publishes port `8765` on all server interfaces (`RSSONAR_BIND=0.0.0.0`). You can set `RSSONAR_BIND` to the server's actual LAN IP to restrict it to that interface. Allow the port through the server firewall if you want direct access; prefer an HTTPS reverse proxy for public access.

## RSS readers on another device

`http://localhost:8765/rss.xml` works only when the reader fetches the feed from the same machine as RSSonar. On another device, `localhost` points to that device, not your RSSonar server. Subscribe to a URL that opens from the reader device: `http://SERVER_IP:8765/rss.xml` on your LAN or `https://releases.example.org/rss.xml` through your reverse proxy. In your **existing** `.env`, set both values to the actual reachable address, for example:

```dotenv
PUBLIC_URL=https://releases.example.org
PUBLIC_FEED_URL=https://releases.example.org/rss.xml
```

Keep your existing `ADMIN_TOKEN` and other settings. Run `docker compose up -d` to apply the changed environment, then open the exact feed URL in a browser on the reader device before adding it to Reeder. If the URL does not return RSS XML there, check the server IP, port/firewall, reverse-proxy route for `/rss.xml`, and any proxy login. A reader cannot use a localhost URL from another device or from a remote feed-fetching service.

## Updating an existing server

Run these commands in the cloned repository on the server:

```sh
cd /path/to/RSSonar
git pull --ff-only
docker compose up -d --build
```

Before restarting, check `.env`: an existing `RSSONAR_BIND=127.0.0.1` **overrides the new default**. Change it to `RSSONAR_BIND=0.0.0.0` or the server's actual IP, and set `PUBLIC_URL` to the externally reachable URL. For a reverse proxy, also add `PUBLIC_FEED_URL` with the complete external `/rss.xml` URL. Keep your existing `ADMIN_TOKEN` and `./data` directory; `docker compose up -d --build` rebuilds the image and recreates the service as needed without deleting its bind-mounted data. If you deployed from a source archive instead of a Git clone, replace the application files with the new archive while retaining `.env` and `./data`, then run the same Compose command.

Without Docker:

```sh
ADMIN_TOKEN='use-a-long-random-secret-here' python3 app.py
```

## Reverse proxy

RSSonar listens on port `8765` inside its container. Serve it at the root of a dedicated HTTPS hostname such as `https://releases.example.org`. Forward `/`, `/api/`, and `/rss.xml` unchanged to the same backend. In `.env`, set `PUBLIC_URL` to the public website address used in the RSS channel metadata and `PUBLIC_FEED_URL` to the **complete** external feed URL copied by the buttons:

```dotenv
PUBLIC_URL=https://releases.example.org
PUBLIC_FEED_URL=https://releases.example.org/rss.xml
```

`PUBLIC_FEED_URL` overrides the browser-derived link, which is useful when access through a reverse proxy uses a different hostname or path. It must be an absolute HTTP(S) URL reachable by your RSS readers. For an existing installation, add the variable to your current `.env`; copying the new `.env.example` over it would replace your admin token.

A reverse proxy running on the same host can reach RSSonar at `http://127.0.0.1:8765`. If the proxy itself runs in a container, attach it and RSSonar to the same Docker network and use `http://rssonar:8765` as the upstream. A container's `127.0.0.1` refers to that container, not to the RSSonar host. The default `RSSONAR_BIND=0.0.0.0` also publishes the port on the server's other interfaces; restrict access with your firewall or bind to a specific interface in `.env` if appropriate.

- **[Pangolin](https://docs.pangolin.net/manage/resources/public/targets):** Create a public HTTP resource for the hostname and set its target to a host reachable from the Pangolin site on port `8765`.
- **[Traefik](https://doc.traefik.io/traefik/providers/docker/):** Put both containers on the same Docker network. Route ``Host(`releases.example.org`)`` to the RSSonar service on port `8765`, using your existing HTTPS entry point and certificate resolver.
- **[Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html):** In an HTTPS `server` block, forward requests to RSSonar. For a proxy on the same host:

  ```nginx
  location / {
      proxy_pass http://127.0.0.1:8765;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
  }
  ```

  For separate containers, use the internal service name instead of the loopback address.
- **[Nginx Proxy Manager (NPM)](https://nginxproxymanager.com/guide/):** Create a Proxy Host for the hostname with scheme `http`, forward hostname `rssonar` on a shared Docker network (or another reachable host address), and forward port `8765`. Enable an SSL certificate and HTTPS in the SSL tab.

The public dashboard and `/rss.xml` do not require the admin token. If you put an additional login in front of the entire hostname, RSS readers will also need to support that login. Do not put the admin token in proxy labels or URLs.

## Feed URLs

A GitHub release feed has the form `https://github.com/OWNER/REPO/releases.atom`. Forgejo release feeds use `https://HOST/OWNER/REPO/releases.rss`, for example `https://git.deuxfleurs.fr/Deuxfleurs/garage/releases.rss` for Garage or `https://codeberg.org/superseriousbusiness/gotosocial/releases.rss` for GoToSocial. A `/releases` page is HTML; RSSonar converts such repository release pages to `.rss` (or `.atom` on GitHub), including previously saved URLs on their next successful check. RSSonar follows each entry's original link rather than fabricating a release URL. The first successful fetch imports existing entries **without Signal notifications**. Only entries found on later checks can trigger notifications.

## Importing OPML

Under **Manage sources → Import & export OPML**, choose an exported `.opml` file and an import mode, then click **Preview import**. RSSonar reads feed URLs from nested OPML folders and shows how many are valid, already configured, or duplicated. The admin token is required; no changes are made until you confirm the preview.

- **Add missing feeds** keeps all existing feeds and release history. Feed URLs already present are skipped; imported feed names come from the OPML `title` or `text` attribute.
- **Replace all feeds** replaces the entire configured feed list and **deletes its stored release history**, including pending notifications. The confirmation shows both counts. Back up `./data` first if you may need to undo a replacement.

Only HTTP(S) feed URLs are imported; invalid entries are counted and skipped. Empty or malformed OPML files are rejected without changing existing data. The file is limited to 1 MiB and 500 unique feeds; a merge cannot bring the total above 500. The OPML content is processed for this request and is not stored. RSSonar checks newly imported feeds in the background; OPML does not prove that a URL is a release feed, so check the feed status after import. If a reverse proxy rejects the upload, allow request bodies up to 2 MiB for the import API.

## Exporting OPML

Under **Manage sources → Import & export OPML**, click **Export all feeds · OPML ↓** to download `rssonar-feeds.opml`. The file contains every configured feed in its saved order, including paused feeds. It contains feed names and URLs, but no release history, admin token, or other secrets. The export requires the admin token and is generated from current state on each request; the server does not store another copy. You can import the file back into RSSonar or another OPML-compatible reader. Through a reverse proxy, forward `/api/feeds/export` with the other `/api/` routes.

## Existing Signal API (optional)

RSSonar does not include a Signal API container. If you already operate [signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api), RSSonar can call its documented `POST /v2/send` endpoint. Set the base URL reachable **from the RSSonar container** and the sender and recipient numbers in `.env`:

```dotenv
SIGNAL_API_URL=https://signal-api.example.org
SIGNAL_NUMBER=+491234567890
SIGNAL_RECIPIENTS=+491234567890
```

Separate multiple recipients with commas. The external API must be reachable from RSSonar and accept its requests. Keep that API on a private network or behind a suitably protected proxy: RSSonar currently does not send additional API credentials. If delivery fails, the notification remains queued for the next check. A crash between a successful send and saving its confirmation can rarely cause a duplicate message. Leave all three Signal variables empty to disable delivery.

## Operations and limitations

- Feeds are checked within the configured interval, not instantly when a release is published. Each fetch has a 30-second network timeout.
- The server process must keep running. Static HTML hosting or traditional PHP hosting without a background job cannot provide scheduled checks and Signal delivery.
- A feed may be at most 10 MiB; RSSonar processes up to the first 100 entries on each fetch. This accommodates large release notes such as GoToSocial's Codeberg feed.
- The admin API requires `X-Admin-Token`. For a public installation, use HTTPS and appropriate access controls for administration. Only trusted admins should receive the token because they can configure feed URLs.
- The JSON state file is designed for a single application instance. Multiple replicas would need a shared database and coordinated polling.

## Development

```sh
python3 -m unittest discover -s tests -v
python3 -m py_compile app.py
node tests/test_frontend.js
```

License: MIT.
