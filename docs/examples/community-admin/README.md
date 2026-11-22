# Admin-Seiten – eigenständiges Entwicklerbeispiel

**Noch nicht mit einem veröffentlichten NG-Host nutzbar.** Das optionale Manifest-Feld admin und MuPiBoxAdminSDK sind im Stand 22.11.2026 lediglich als RFC spezifiziert.

~~~text
community-admin/
├── manifest.json
├── index.html              # normaler Modus, ohne Admin-Methoden
└── admin/
    ├── index.html          # nur per Host-Admin-Runner zu öffnen
    └── admin.js
~~~

- manifest.json demonstriert den geplanten Einstiegspunkt, getrennte Capability-Liste und auf books beschränkte Dateiliste.
- Die normale index.html bekommt **keine** Verwaltungsrechte.
- admin/index.html und admin/admin.js demonstrieren settings.get/set mit Revision und files.list.
- Die Admin-Seite zeigt einen echten Fehler, wenn das Admin-SDK nicht zur Verfügung steht; sie darf keinen Speichererfolg simulieren.
- Das Beispiel verwaltet keine echten Bücher und enthält **keine** produktionsreife Datei-Upload-/Papierkorblogik.
- Es sind keine eigenen Admin-Webserver, lokalen Netzwerkports oder Secrets im Paket vorgesehen.

**Einbindung, sobald Host und SDK die neue Schnittstelle anbieten:** Eigenen Admin-Code unter admin/ ablegen, admin.entry im Manifest angeben, gewünschte capabilities und nur die zulässigen sharedDirectories deklarieren. Nach Installation mit Admin-Passwort die App unter Community-Apps → Installierte Apps → Einstellungen öffnen.

Vor der Umsetzung den Host-RFC und den [Entwicklerleitfaden](../../community-app-admin-pages.md) lesen. Produktionsfreigabe erst nach Auth-/Sandbox-/Datei-/Update-Tests.
