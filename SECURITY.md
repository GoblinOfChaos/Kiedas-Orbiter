# Security Policy

## Reporting a Vulnerability

If you find a security issue in Kieda's Orbiter — especially anything involving
the Warframe process memory scan, the warframe.market auth token, or the
in-app update mechanism — please report it privately rather than opening a
public issue.

Preferred: use GitHub's private vulnerability reporting for this repo
(**Security** tab → **Report a vulnerability**). This opens a private
advisory visible only to you and the maintainers until a fix is ready.

If that's not available, open a regular issue with as few technical details
as possible (just enough to confirm receipt) and ask for a private channel to
share the rest.

## Scope

Kieda's Orbiter reads Warframe's own process memory to extract a session
token, then calls Warframe's and warframe.market's own APIs with it. It does
not modify game memory, automate gameplay, or send data anywhere beyond those
two APIs and this project's own bundled data-export sources. Reports about
that memory-read mechanism itself, the local data it caches on disk, or the
warframe.market token/order flows are all in scope.

## Supported Versions

Only the latest released version is supported with security fixes. There is
no long-term support branch.
