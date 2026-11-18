# MuPi Run – Wald-Flussbett (0.2.0)

Eigenständige, vollständig offline spielbare MuPiBox-NG-Community-App für **800 × 480 Pixel** (5 Zoll). MuPi läuft aus der **Rückansicht** durch ein flaches, sich windendes Wald-Flussbett: ein orangefarbenes Axolotl mit exakt **drei Kiemenästen links und drei rechts**, eigenem Schweif und Lauf-/Sprung-/Duckanimation. Es gibt keine Fremdspiele, gekauften Assets, CDN- oder Online-Abhängigkeiten.

## Echte Browser-Screenshots (800 × 480)

Die Aufnahmen liegen bewusst **direkt im Anwendungsverzeichnis**.

![MuPi Run mit orangefarbenem Axolotl von hinten und individuell illustrierten Waldobjekten](screenshot-game.webp)

![MuPi Run beim Sprung über das Flussbett](screenshot-jump.webp)

![MuPi Run Startmenü](screenshot-start.webp)

Die Screenshots wurden mit Chromium bei 800 × 480 erzeugt, **nicht** auf der MuPiBox-Hardware aufgenommen.

## Grafiken

Die Illustrationen sind **eigenständige, freigestellte** PNG-Sprites (transparentes Alpha) und werden als perspektivisch skalierte einzelne Elemente in den Game-Canvas eingesetzt. Sie sind **keine einfachen Canvas-Kreise oder -Rechtecke**:

- **MuPi-Rückansicht:** `art/mupi-back.png`, orangefarbene Haut, Rückenflecken, fransige Kiemen (3 je Seite), Schwanzflosse, Beine und Arme. Kein Gesicht, weil die Kamera hinter MuPi folgt.
- **Wald:** Laubbaum, Nadelbaum, Hängeweide, Farn, Schilf, Blumen, Pilze. Mehrschichtiger Waldhintergrund und Sonnenstrahlen.
- **Fluss:** Organisch gewundenes Wasserbett mit transparenter Steinstruktur, Strömung, Wellen, weichen Uferkanten und Parallax-Effekten.
- **Hindernisse:** Moosfelsen, umgestürzter Baumstamm, Wurzel/Ast, Wasserplatsch, Stiefel, Baumstumpf, Schilf, Korb sowie tief hängende Äste/Ranken.

Die reproduzierbar generierten, **offenen SVG-Quellen** liegen direkt neben ihren PNG-Pendants unter `art/`. Auf einer Box sind zur Laufzeit nur die PNGs erforderlich, weil Qt Chromium auf Raspberry Pi SVGs nicht zuverlässig für native Kacheln dekodiert.

Das Skript `python3 tools/generate_mupi_run_sprites.py` kann die Artwork-Dateien aus den Originalpfaden neu rendern (Pillow und `rsvg-convert` auf dem Entwicklungsrechner erforderlich). Es generiert auch das passende 512×512-Qt-/Admin-Cover und das 256×256-App-Icon. **Das alte nach vorne blickende MuPi-Bild ist nicht Bestandteil des Game-Pakets.**

## Spiel

- **Ziel:** Möglichst weit laufen; den Distanzrekord übertreffen.
- **Springen:** Baumstämme, Wurzeln, kleine Steine, Wasserwirbel und verlorene Stiefel.
- **Ducken:** Tief hängende Äste, Ranken und Weidenzweige.
- **Ausweichen:** Große Felsen, Baumstümpfe, Schilf und Körbe.
- **Tempo:** Von 13 bis 29 Einheiten je Sekunde steigend; ab 125 Metern mehr Hinderniskombinationen.
- **Fairness:** Höchstens zwei blockierte Spuren je Welle. Mindestens eine freie Spur bleibt vorhanden.
- **Offline-Rekord:** Gespeichert als `bestMeters` im MuPiBox-Plugin-Speicher und über Updates beibehalten.
- **Sprachen:** Deutsch, Englisch, Französisch, Spanisch, Italienisch, Niederländisch und Schwedisch (Box-Sprache).

## Steuerung

| Aktion | Controller | Tastatur | Touch |
| --- | --- | --- | --- |
| Spurwechsel | Steuerkreuz links/rechts | ← / → oder A / D | Pfeiltasten oder links/rechts wischen |
| Springen | A / X / ↑ | ↑ / W / Leertaste | Gelber Button oder nach oben wischen |
| Ducken | B / Y / ↓ | ↓ / S | Türkiser Button oder nach unten wischen |
| Pause/Weiter | START | P | Pausenknopf |
| Zurück zur MuPiBox | BACK / SELECT | Escape | Zurückpfeil oben links |
| Start/Neustart | A / START im Menü | Enter / Leertaste | Startknopf |

**Wichtig:** B dient in diesem Spiel dem Ducken. Verlassen mit BACK/SELECT beziehungsweise dem sichtbaren Zurückpfeil. Bei Verlust des App-Fokus wird der Lauf pausiert.

## Paket & Tests

Im Repository-Stamm:

```bash
python3 tools/generate_mupi_run_sprites.py
python3 tools/build_mupi_run.py
python3 tools/mupiapp.py validate dist/mupi-run.mupiapp
node --check examples/mupi-run/app.js
node --test tests/mupi_run.test.cjs
python3 tools/capture_mupi_run_screenshots.py
```

Das Build-Skript packt nur benötigte, rasterisierte `art/*.png` sowie HTML, CSS, JS, SDK, Manifest, Cover und Icon. **Keine SVG-Quelltexte oder Screenshots im .mupiapp-Paket.** Manuelle Installation über den Pluginmanager ist möglich. Der offizielle Katalog erfordert vor der Veröffentlichung ein geprüftes Release-Asset und dessen SHA-256.

## Technischer Status

- Automatisierte Spiellogiktests, JavaScript-Prüfung, Paketvalidierung und Chromium 800×480-Browser-Screenshots
- **Noch ausstehend:** Echter Controller-/Qt-Test auf Testbox 83; Freigabe für den offiziellen Community-App-Katalog

## Rechte und Datenschutz

Original-Spielmechanik, eigener Code und selbst illustrierte Grafiken unter der Repository-Lizenz MIT; keine übernommenen kommerziellen Assets. Die App fordert nur `controller` und `storage` an; kein Netzwerk, keine Werbung, keine Tracker, keine Online-Dienste.