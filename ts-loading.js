/* ============================================================
   TS-Suite · Zentrales Lade-Feedback (ts-loading.js)
   ------------------------------------------------------------
   Zeigt einen Ladezustand direkt an einem Button an, während
   eine asynchrone Aktion läuft (Speichern, Senden, Export,
   Löschen, Server-Anfragen).

   Einbindung (im <head>, nach ts-loading.css):
     <link rel="stylesheet" href="ts-loading.css">
     <script src="ts-loading.js"></script>

   API (global unter window.TSLoading):

     TSLoading.start(button, opts?)
       Sperrt den Button, ersetzt seinen Text durch einen Spinner.
       opts: { ghost: true }  - für Buttons ohne farbigen Hintergrund
             (z.B. Rahmen-/Ghost-Buttons), damit der Spinner sichtbar bleibt.

     TSLoading.stop(button)
       Setzt den Button wieder in seinen normalen Zustand zurück
       (ursprünglicher Text, wieder klickbar).

     TSLoading.wrap(button, asyncFn, opts?) -> Promise
       Komfort-Variante für den Normalfall "Button klicken, warten,
       Ergebnis": ruft start(), führt asyncFn() aus, ruft in jedem
       Fall (auch bei Fehler) stop() auf und reicht das Ergebnis/
       den Fehler weiter durch.
       Beispiel:
         btn.addEventListener('click', () => TSLoading.wrap(btn, async () => {
           await speichern();
         }));
   ============================================================ */
(function () {
  'use strict';

  var STATE_KEY = '__tsLoadingOriginalHtml';

  function start(btn, opts) {
    if (!btn || btn.classList.contains('ts-loading')) return;
    opts = opts || {};
    btn[STATE_KEY] = btn.innerHTML;
    btn.classList.add('ts-loading');
    btn.disabled = true;
    if (opts.ghost) btn.setAttribute('data-ts-loading-variant', 'ghost');
  }

  function stop(btn) {
    if (!btn || !btn.classList.contains('ts-loading')) return;
    if (btn[STATE_KEY] !== undefined) {
      btn.innerHTML = btn[STATE_KEY];
      delete btn[STATE_KEY];
    }
    btn.classList.remove('ts-loading');
    btn.disabled = false;
    btn.removeAttribute('data-ts-loading-variant');
  }

  function wrap(btn, asyncFn, opts) {
    start(btn, opts);
    return Promise.resolve()
      .then(asyncFn)
      .finally(function () { stop(btn); });
  }

  window.TSLoading = { start: start, stop: stop, wrap: wrap };
})();
