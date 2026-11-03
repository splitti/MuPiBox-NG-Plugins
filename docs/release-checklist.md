# Veröffentlichungssperre – MuPi Community-Spiele

**Status: NICHT FREIGEGEBEN.** Ticket: [#1 – Marken-/Urheberrechtsprüfung](https://github.com/splitti/MuPiBox-NG-Plugins/issues/1).

Diese Freigabe ist **vor dem Hochladen offizieller GitHub-Release-Assets**, vor jedem
neuen Eintrag in `catalog/apps.json` und vor der Werbung mit den neuen Namen
verpflichtend. Ein erfolgreicher Build oder eine rohe GitHub-Actions-Testdatei
stellt keine rechtliche Freigabe dar.

## Betroffene Spielnamen

| Spiel | Anzeige (de) | Technischer Bezeichner |
| --- | --- | --- |
| 3×3-Kreuze/Kreise | **MuPi Kreuz & Kreis** | `community.tictactoe` (bestehende ID bleibt!) |
| Viererreihe | **MuPi 4er-Reihe** | `community.mupi-four-in-a-row` |
| Wurm mit Krümeln | **MuPi Krümelwurm** | `community.mupi-kruemelwurm` |

Bei Übersetzungen auch die sichtbaren Titel prüfen:
fr, en, es, it, nl, sv. **Vorläufige Arbeitsnamen; nicht als freie Marken bestätigt.**

## Pflichthäkchen VOR Release

- [ ] Identitätsrecherche in **DPMAregister** für alle drei Namen.
- [ ] Ähnlichkeitsrecherche (Schreibvarianten, Lautähnlichkeiten, übersetzte Titel)
      in **EUIPO/TMview und WIPO**; insbesondere Spiele/Software/Unterhaltung
      (je nach Angebot regelmäßig Klassen 9 und 41).
- [ ] Relevante Handelsbezeichnungen, Werktitel und Benutzungsmarken im Web,
      in App-Stores und Spielekatalogen ergänzend prüfen.
- [ ] Nachweise mit Datum, Links, gefundenen Rechten und Freigabeentscheidung in
      [Issue #1](https://github.com/splitti/MuPiBox-NG-Plugins/issues/1)
      dokumentieren. Bei Risiken: neuen Namen wählen oder juristischen Rat einholen.
- [ ] Originalität prüfen: ausschließlich eigener Go-/JS-Code, eigens gestaltete
      Symbole/Farben/Icons, keine fremden Assets/Audio/Logos, keine bekannte
      Produktverpackung/typische Marketinggestaltung imitieren.
- [ ] Lizenznachweise prüfen, einschließlich mitgelieferter Go-WASM-Laufzeit.
- [ ] Sprachtest mit Boxsprache `de/en/fr/es/it/nl/sv`, Touch, Controller und
      800×480; Easy/Normal/Hard und 2P testen.
- [ ] Versionen und Manifestmetadaten bestätigen, `mupiapp.py validate` und CI
      erfolgreich, Release-Datei nach Veröffentlichung neu herunterladen.
- [ ] SHA-256 **der echten hochgeladenen Release-Datei** bestimmen und
      `catalog/apps.json` erst anschließend mit identischer ID, Manifestname,
      Version, Asset und Berechtigungen aktualisieren.
- [ ] Für `community.tictactoe` den alten Katalog-Anzeigenamen erst gleichzeitig
      mit dem aktualisierten, nachweislich publizierten Release-Asset auf
      „MuPi Kreuz & Kreis“ ändern; App-ID NICHT ändern, sonst gehen Upgrades
      und vorhandene Daten verloren.
- [ ] Verantwortliche Person dokumentiert endgültige Freigabe in Issue #1.

Die Quellcodeentwicklung kann auf einem Feature-Branch stattfinden;
ein Merge/Branch/CI-Build wird **nicht** als offizielle App im Katalog publiziert.

Rechtliche Grundlagen (keine Rechtsberatung):
- [§ 69a (2) UrhG](https://www.gesetze-im-internet.de/urhg/__69a.html):
  Spielideen und Programmprinzipien sind als solche nicht geschützt,
  der konkrete Code kann aber geschützt sein.
- [DPMA – Markenrecherche](https://www.dpma.de/marken/markenrecherche/index.html):
  ältere identische **und ähnliche** Marken sowie weitere Kennzeichen prüfen.
- [EUIPO/TMview](https://www.tmdn.org/tmview/),
  [WIPO](https://branddb.wipo.int/): Schutzrechte außerhalb des DPMAregister
  und mit Wirkung für Deutschland/Europa berücksichtigen.

**Keine automatisierte Internet-Suche kann eine vollständige Markenfreigabe ersetzen.**
