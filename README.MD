# RSSonar

**Keep open-source releases in view.** RSSonar collects releases from any number of RSS and Atom feeds, displays them in chronological order, and publishes one combined feed at `/rss.xml`. It can optionally forward new releases to an existing, separately hosted Signal API.

[Deutsche Anleitung](README.de.md)

## Features

- Add, rename, pause, and remove feeds in the web interface. Fourteen feeds require no special setup.
- Check feeds every 15 minutes by default, with a manual refresh option.
- Search releases and filter by application. Each entry links to the original release URL from its feed, such as a GitHub or Codeberg release page.
- Subscribe to the combined RSS 2.0 feed at `/rss.xml`.
- Deduplicate entries by feed and GUID; stored releases survive restarts.
- Optionally send new entries through an existing [signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api). RSSonar does not start or bundle a Signal service.
- Run without Python packages, a database, or a build step; Python 3.9+ is sufficient.

## Quick start with Docker Compose

```sh
cp .env.example .env
python3 -c 'import secrets; print(secrets.token_urlsafe(32))'
```

Put the generated value into `.env` as `ADMIN_TOKEN`, then start RSSonar:

```sh
docker compose up -d --build
```

Open <http://localhost:8765>. The interface asks for the admin token when you first add a feed or trigger a manual refresh. It keeps the token in `sessionStorage` for the current browser tab only. The dashboard and `/rss.xml` are readable without a token. Application data lives in `./data/state.json`; back up this directory if you want to preserve the feed list and history.

Without Docker:

```sh
ADMIN_TOKEN='use-a-long-random-secret-here' python3 app.py
```

## Reverse proxy

RSSonar listens on port `8765` inside its container. Serve it at the root of a dedicated HTTPS hostname such as `https://releases.example.org`. Forward `/`, `/api/`, and `/rss.xml` unchanged to the same backend, and set `PUBLIC_URL=https://releases.example.org` in `.env`.

A reverse proxy running on the same host can reach the default binding at `http://127.0.0.1:8765`. If the proxy itself runs in a container, attach it and RSSonar to the same Docker network and use `http://rssonar:8765` as the upstream. A container's `127.0.0.1` refers to that container, not to the RSSonar host. Change `RSSONAR_BIND` to `0.0.0.0` only when the proxy is on another host and has no private network path; this exposes the port on every host interface.

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

A GitHub release feed often has the form `https://github.com/OWNER/REPO/releases.atom`. For Codeberg, use the RSS or Atom URL offered by the repository's release page. RSSonar follows the link supplied by each feed entry; it does not fabricate a release URL. The first successful fetch imports existing entries **without Signal notifications**. Only entries found on later checks can trigger notifications.

## Existing Signal API (optional)

RSSonar does not include a Signal API container. If you already operate [signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api), RSSonar can call its documented `POST /v2/send` endpoint. Set the base URL reachable **from the RSSonar container** and the sender and recipient numbers in `.env`:

```dotenv
SIGNAL_API_URL=https://signal-api.example.org
SIGNAL_NUMBER=+491234567890
SIGNAL_RECIPIENTS=+491234567890
```

Separate multiple recipients with commas. The external API must be reachable from RSSonar and accept its requests. Keep that API on a private network or behind a suitably protected proxy: RSSonar currently does not send additional API credentials. If delivery fails, the notification remains queued for the next check. A crash between a successful send and saving its confirmation can rarely cause a duplicate message. Leave all three Signal variables empty to disable delivery.

## Operations and limitations

- Feeds are checked within the configured interval, not instantly when a release is published.
- The server process must keep running. Static HTML hosting or traditional PHP hosting without a background job cannot provide scheduled checks and Signal delivery.
- A feed may be at most 2 MB; RSSonar processes up to the first 100 entries on each fetch.
- The admin API requires `X-Admin-Token`. For a public installation, use HTTPS and appropriate access controls for administration. Only trusted admins should receive the token because they can configure feed URLs.
- The JSON state file is designed for a single application instance. Multiple replicas would need a shared database and coordinated polling.

## Development

```sh
python3 -m unittest discover -s tests -v
python3 -m py_compile app.py
```

License: MIT.
