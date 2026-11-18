# MuPi Run – Wald & Flussbett (0.1.0)

Ein eigenständiges, vollständig offline spielbares **Endless-Runner-Spiel** für MuPiBox NG, optimiert für **800 × 480 Pixel** (5-Zoll-Display). Unser orangefarbener MuPi mit **drei Kiemenästen auf jeder Seite** läuft durch ein Wald-Flussbett mit drei ausweichbaren Strömungsspuren. Spiellogik und Kulissen wurden unabhängig entwickelt. Die freigestellte MuPi-Figur stammt aus dem bereits vorhandenen Projekt-Asset von **Funny MuPi**.

![MuPi Run: Waldfluss, orangefarbener MuPi und Distanzanzeige](screenshot-game.webp)

![Startbildschirm mit Controller-Hinweisen](screenshot-start.webp)

## Spielablauf

- **Ziel:** Möglichst weit laufen und den eigenen Distanzrekord übertreffen.
- **Hindernisse:** Überspringbare Baumstämme, Wurzeln, Steine, Spritzwasser und ein verlorener Schuh; tief hängende Äste, Ranken und Weidenzweige zum Ducken; große Felsen, Baumstümpfe, Schilf und ein zurückgelassener Korb zum Ausweichen.
- **Steigerung:** Tempo von 13 bis 29 Spieleeinheiten je Sekunde; ab 125 Metern zunehmend zwei Hindernisse pro Welle.
- **Fairness:** Pro Hinderniswelle höchstens zwei der drei Spuren blockiert; stets mindestens eine freie Spur.
- **Rekord:** Beste Distanz offline im MuPiBox-App-Speicher als 'bestMeters'; über Updates beständig.
- **Sprachen:** Deutsch, Englisch, Französisch, Spanisch, Italienisch, Niederländisch und Schwedisch (Box-Sprache).

## Bedienung

| Aktion | Controller | Tastatur | Touch |
| --- | --- | --- | --- |
| Spur links/rechts | Steuerkreuz links/rechts | Pfeile oder A / D | Richtungsknöpfe oder horizontal wischen |
| Springen | A / X / oben | ↑ / W / Leertaste | Gelber Knopf oder nach oben wischen |
| Ducken | B / Y / unten | ↓ / S | Türkiser Knopf oder nach unten wischen |
| Pause/Weiter | START | P | Pausenknopf |
| Zurück zur MuPiBox | BACK / SELECT | Escape | Pfeil oben links |
| Start/Neustart | A / START im Menü | Enter / Leertaste | Start-Knopf |

**Hinweis:** B ist während des Laufs zum Ducken reserviert. Zum Verlassen **BACK/SELECT** oder den Bildschirm-Pfeil verwenden. Die App pausiert im Hintergrund automatisch.

## Paket erstellen

Im Repository-Stammverzeichnis:

    python3 tools/build_mupi_run.py
    python3 tools/mupiapp.py validate dist/mupi-run.mupiapp
    node --test tests/mupi_run.test.cjs

Das Build-Skript übernimmt die aktuelle SDK-Datei und packt nur die zur Laufzeit erforderlichen Dateien. Keine Screenshots oder Dokumentation im App-Paket. Die Datei kann über die manuelle App-Installation im MuPiBox-Admin geladen werden. Eine Aufnahme in den offiziellen App-Katalog erfordert ein geprüftes GitHub-Release-Asset mit zugehöriger SHA-256.

## Screenshots

Die Screenshots liegen **direkt in diesem App-Verzeichnis**, nicht in einem separaten Screenshot-Ordner. Beide sind Browser-Aufnahmen mit Chromium bei **800 × 480**, keine echten Aufnahmen von Box 83.

    python3 tools/capture_mupi_run_screenshots.py

Screenshot-Generator benötigt Chromium sowie Python mit websockets und Pillow; das Spiel selbst benötigt diese Pakete nicht.

## Rechte & Datenschutz

- Eigenständiger Runner ohne fremde Spielgrafiken, Quellcode, kommerzielle Namen, Musik oder Leveldaten.
- Eigenständig gezeichnete Wald- und Flussbett-Kulisse, MuPi-Maskottchen basiert auf dem vorhandenen Projekt-Asset aus 'examples/funny-mupi/assets/mupi-laugh-refined.png'.
- Keine Werbung, Tracker, Online-Konten oder Netzwerkzugriffe; nur Berechtigungen 'controller' und 'storage'.
- Quellcode unter der Repository-Lizenz MIT; für vorhandene Projekt-Artworks gelten deren jeweilige Rechte.

## Prüfstand

- JavaScript-Syntaxprüfung und fünf automatisierte Spiellogiktests
- App-Paketierung und Validierung
- Chromium-Vorschau auf 800 × 480 mit erfolgreichem Spielstart
- **Noch nicht geprüft:** Controller-Hardware und native Qt-Integration auf MuPiBox 83
