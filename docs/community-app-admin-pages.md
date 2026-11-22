# Community-Apps: eigene lokale Admin-Seiten (Entwicklerleitfaden / RFC)

**Status: VORSCHLAG – die beschriebenen Host-Routen und MuPiBoxAdminSDK-Methoden existieren auf main noch nicht. Nicht als bereits verfügbar bewerben.** Der Paket-Validator lehnt das vorgeschlagene Manifest-Feld admin derzeit mit „unknown manifest fields: admin“ ab; Host und Validator müssen gemeinsam erweitert werden.
Host-Spezifikation: MuPiBox-NG/docs/community-app-admin-pages-rfc.md.

## Für wen?

Jede Community-App kann künftig optional eine eigene Webseite bereitstellen, die im MuPiBox-NG-Adminbereich unter **Community-Apps → Installierte Apps → Einstellungen** erscheint. Sie benötigt **keinen** separaten Webserver und keinen zusätzlichen Port. Die normale Web-/Qt-Community-App kann weiterhin ohne Admin-Seite betrieben werden.

Die Admin-Seite soll ausschließlich von authentifizierten Administratoren im Browser geöffnet werden. Die normale App, der Kinder-Touchscreen und die reguläre Browser-Vorschau bleiben in ihren bisherigen SDK-Rechten.

## Deklaration im Manifest (geplanter Vertrag)

~~~json
{
  "apiVersion": "1",
  "id": "community.buecherkiste",
  "name": "Bücherkiste",
  "version": "1.1.0",
  "runtime": "web",
  "entry": "index.html",
  "permissions": ["shared-assets", "audio"],
  "sharedDirectories": ["books"],
  "admin": {
    "entry": "admin/index.html",
    "capabilities": [
      "settings.read", "settings.write",
      "files.list", "files.read", "files.write", "files.trash"
    ],
    "directories": ["books"]
  }
}
~~~

admin.entry = einziger Einstiegspunkt der Administrationsseite; admin.capabilities = genau benötigte, deklarierte Features; admin.directories = Teilmenge bereits genehmigter sharedDirectories. Ohne admin-Feld läuft die App unverändert. Eine Admin-Seite ist kein Ersatz für eine Manifest-Berechtigung und kein automatischer Admin-Zugriff für die normale App.

## Struktur des App-Pakets

~~~text
community.buecherkiste/
├── manifest.json
├── index.html                 # Kinder-/Lesemodus
├── app.js
└── admin/
    ├── index.html             # Browser-Verwaltung
    ├── admin.js
    └── admin.css
~~~

Die **Daten** liegen nicht im App-Paket, sondern persistent unter CommunityApps/community.buecherkiste/books/ bzw. in privaten, durch den Host verwalteten App-Einstellungen. Dadurch überstehen sie ein Update der .mupiapp-Datei.

## Geplante Methoden im separaten Admin-SDK

~~~js
const admin = window.MuPiBoxAdminSDK;

// Einstellungen (app-privates JSON)
const {value, revision} = await admin.settings.get();
const saved = await admin.settings.set(
  {...value, readingSpeed: 1.0},
  {expectedRevision: revision}
);

// Dateiliste, app-gebundene freigegebene Verzeichnisse
const listing = await admin.files.list("books");
// listing = {entries:[{name,path,isDir,size,modified}], truncated:false}

// Datei mit Revision lesen
const {blob, revision: fileRevision} =
  await admin.files.read("books/mein-buch/book.json");
const json = JSON.parse(await blob.text());

// Neue Datei nur anlegen, wenn sie noch nicht existiert
const created = await admin.files.write(
  "books/neues-buch/book.json",
  new Blob([JSON.stringify({title:"Neues Buch"}, null, 2)],
           {type:"application/json"}),
  {expectedRevision:null}
);

// Bestehende Datei nur überschreiben, falls Revision unverändert ist
await admin.files.write(
  "books/mein-buch/book.json",
  new Blob([JSON.stringify({...json, title:"Neuer Titel"})],
           {type:"application/json"}),
  {expectedRevision:fileRevision}
);

// Vollständigen eigenen Buchordner nach klarer Nutzerbestätigung
// in den hostverwalteten Papierkorb verschieben:
await admin.files.trash("books/mein-buch");
~~~

Die **Methodennamen sind noch nicht implementiert**. Für unbekannte/ältere Hosts muss die Oberfläche eine Fehlermeldung wie „Admin-SDK wird von dieser MuPiBox-Version nicht unterstützt“ zeigen und darf keine Pseudodaten speichern oder Erfolg vortäuschen.

## Beispiele für den Entwickler

Im Verzeichnis docs/examples/community-admin/ liegen:
- manifest.json: Beispiel-Deklaration (noch nicht installierbar als fertiges Feature).
- index.html: minimales Administrationsformular.
- admin.js: settings.get/set und Capability-/Fehlerbehandlung mit Revisionsschutz.

In einer realen App diese admin-Dateien ins Paket kopieren und den Manifest-Einstiegspunkt setzen. Die Webseite wird nicht separat über einen Port veröffentlicht; nach Einführung der Host-Funktion öffnet die MuPiBox-Administration sie über ihren „Einstellungen“-Button.

## Integration in die Bücherkiste

1. Den derzeitigen Entwickler-Stand des Buch-Editors sichern; **keine zweite Editorimplementierung beginnen**.
2. Editor aus der Kinder-Webansicht optional nach admin/index.html übernehmen. Die dreifache Tassen-Geste darf keine Admin-Rechte freischalten.
3. Beim Öffnen via admin.files.list("books") vorhandene Ordner auflisten; aus book.json und images/, tts/pages.json bzw. text/pages.json befüllen.
4. Bearbeitung von Titel, Bildern, Seitenreihenfolge und Texten über die bestehende UI; vor Speichern prüfen, ob der Buchdatensatz seit Öffnen verändert wurde.
5. Dateien innerhalb der Buch-Unterordner schreiben, erst danach den Index aktualisieren; fehlgeschlagenes Speichern nachvollziehbar melden.
6. Entfernen: eindeutige Bestätigung, anschließend files.trash des vollständigen eigenen Buchordners; eingebettete Demo-Bücher sind unveränderlich.
7. Nach erfolgreichem Speichern Regal neu laden; weder durch App- noch durch NG-Update dürfen persönliche SMB-Bücher verlorengehen.

## Sicherheitsgrenzen

- Die Admin-Cookies verbleiben im vertrauenswürdigen MuPiBox-Parent; iframe besitzt eine isolierte, **nicht same-origin** Sandbox.
- App-Code erhält keine System-/Dateipfade, keine Home-Assistant-/Spotify-/Music-Assistant-Tokens, keine freien HTTP-Anfragen mit Admin-Cookies.
- Dateifunktionen werden hostseitig bei **jeder** Operation authentifiziert, app-spezifisch begrenzt, über Erweiterung/Signatur validiert und atomar ausgeführt.
- V1: max. 8 MiB pro Bild, 256 KiB pro JSON, 64 KiB Einstellungen; app-bezogenes Gesamtkontingent und Trash-Retention vor Implementierung finalisieren.
- Nach Änderungen und Updates nur mit Admin-Login weiterarbeiten. Keine Speicherung von Nutzerdaten in LocalStorage als alleinige Datenquelle.
- Bei fehlender Berechtigung, Revisionskonflikt (409), beschädigter JSON oder fehlender Datei immer einen sichtbaren Fehler melden.

## Akzeptanzkriterien / Definition of Done

- Host enthält unterstützten Manifest-Parser, isolierten Admin-Runner, gesicherte Dateischnittstelle, persistenten Einstellungsdatenspeicher und Admin-UI-Button.
- SDK enthält eigenständiges MuPiBoxAdminSDK mit Tests und klarer Fehlerbehandlung.
- Kein app-admin-Zugriff vom normalen Plugin-iframe/Touchscreen.
- Bücherkiste kann eigene Bücher anlegen, neu laden, verändern und sicher entfernen, ohne Paket- oder andere App-Dateien zu verändern.
- Automatisierte Negativtests: Cross-App-Zugriff, Path Traversal, Symlink, CSRF, ohne Admin-Sitzung, ungültige Dateien, große Daten, Konflikte und Race Conditions.
- Dokumentation, reale Geräte-Tests und Update-/Restore-Test abgeschlossen. Erst dann als fertiges Feature ankündigen und veröffentlichen.