/* Beispielcode zu einer vorgeschlagenen API, NICHT auf NG main lauffähig. */
(() => {
  'use strict';

  const el = id => document.getElementById(id);
  const status = message => { el('status').textContent = message; };
  const sdk = window.MuPiBoxAdminSDK;

  let revision = null;
  let currentSettings = {};
  if (!sdk || !sdk.settings || !sdk.files ||
      typeof sdk.settings.get !== 'function' ||
      typeof sdk.settings.set !== 'function' ||
      typeof sdk.files.list !== 'function') {
    status('Admin-SDK auf dieser MuPiBox-Version nicht verfügbar.');
    return;
  }

  async function loadSettings() {
    const result = await sdk.settings.get();
    currentSettings = result.value && typeof result.value === 'object' ? result.value : {};
    revision = result.revision ?? null;
    el('display-name').value = String(currentSettings.displayName ?? '');
    el('auto-read').checked = currentSettings.autoRead === true;
  }

  async function loadBooks() {
    const result = await sdk.files.list('books');
    const list = el('books');
    list.replaceChildren();
    for (const item of result.entries ?? []) {
      if (!item.isDir) continue;
      const li = document.createElement('li');
      li.textContent = item.name; // Nie untrusted Namen in innerHTML verwenden
      list.appendChild(li);
    }
    if (result.truncated) {
      status('Buchliste wurde begrenzt. Bitte Datenbestand prüfen.');
    }
  }

  el('settings-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = el('save');
    button.disabled = true;
    try {
      const next = {
        ...currentSettings,
        displayName: el('display-name').value.trim(),
        autoRead: el('auto-read').checked
      };
      const result = await sdk.settings.set(next, {expectedRevision: revision});
      currentSettings = next;
      revision = result.revision;
      status('Einstellungen sicher gespeichert.');
    } catch (error) {
      status('Speichern fehlgeschlagen (ggf. Versionskonflikt): ' + String(error.message || error));
    } finally {
      button.disabled = false;
    }
  });

  el('reload-books').addEventListener('click', async () => {
    el('reload-books').disabled = true;
    try {
      await loadBooks();
      status('Buchliste geladen.');
    } catch (error) {
      status('Bücher konnten nicht geladen werden: ' + String(error.message || error));
    } finally {
      el('reload-books').disabled = false;
    }
  });

  async function init() {
    try {
      await loadSettings();
      el('save').disabled = false;
      el('reload-books').disabled = false;
      await loadBooks();
      status('Einstellungen geladen.');
    } catch (error) {
      status('Admin-Daten nicht verfügbar: ' + String(error.message || error));
    }
  }
  void init();
})();
