/* ============================================================
   TS-Suite · Zentrales Theme-System (ts-theme.js)
   ------------------------------------------------------------
   Steuert Hell-/Dunkelmodus suite-weit: liest/speichert die
   Wahl, setzt data-theme="dark|light" auf <html> und baut einen
   einheitlichen Umschalt-Button unten rechts ein.

   Einbindung (im <head>, MÖGLICHST WEIT OBEN, vor dem Tool-
   eigenen <style>-Block, damit das Theme vor dem ersten Render
   feststeht und nichts "aufblitzt"):
     <link rel="stylesheet" href="ts-theme.css">
     <script src="ts-theme.js"></script>

   API (global unter window.TSTheme):
     TSTheme.get()          -> 'dark' | 'light' (aktueller Wert)
     TSTheme.set('light')   -> Theme setzen + speichern
     TSTheme.toggle()       -> zwischen dark/light wechseln

   Events (auf document):
     'tstheme:change'  -> detail: { theme: 'dark' | 'light' }
     Nützlich für Tools mit hartkodierten Canvas-/SVG-Farben
     (z. B. ZuKo-Kabelplan), die bei einem Themewechsel neu
     gezeichnet werden müssen.

   Iframe-Verhalten (z.B. kunden-center.html):
     Läuft die Seite in einem <iframe> (window.self !== window.top),
     wird KEIN eigener Umschalt-Button gebaut - die einbettende Hülle
     stellt genau einen Button für alle eingebetteten Tools bereit.
     Ein Wechsel dort wird per localStorage-"storage"-Event automatisch
     an alle bereits geladenen Iframes weitergereicht (kein Reload nötig).

   Migrationshinweis für bestehende Tools:
     Diese Datei kollidiert mit nichts Bestehendem (eigene
     --ts-*-Variablen, eigener Button, eigener localStorage-Key
     "ts_theme"). Ein Tool kann sie also gefahrlos einbinden,
     OHNE sofort umgebaut zu werden. Der zweite Schritt pro Tool
     ist dann, die lokalen :root-Variablen schrittweise durch
     die var(--ts-*)-Tokens zu ersetzen (siehe ts-theme.css).

   Kompatibilität: Der Aufmaß-Konfigurator hatte bereits einen
   (nicht angeschlossenen) Ansatz mit dem localStorage-Key
   "tuersuite_theme". Dieses Modul liest diesen alten Key beim
   allerersten Aufruf als Fallback mit, damit eine dort evtl.
   schon gespeicherte Wahl nicht verloren geht, migriert sie
   aber sofort auf den neuen, suite-weiten Key "ts_theme".
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'ts_theme';
  var LEGACY_KEY = 'tuersuite_theme';
  var DEFAULT_THEME = 'dark'; // bewusst fest, nicht nach OS-Einstellung –
                               // entspricht dem bisherigen Look der meisten Tools
  var inIframe = (function () {
    try { return window.self !== window.top; } catch (e) { return true; }
  })();

  function readStored() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === 'dark' || v === 'light') return v;

      // Fallback: alte, nie aktive Aufmaß-Einstellung übernehmen und migrieren
      var legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy === 'dark' || legacy === 'light') {
        localStorage.setItem(KEY, legacy);
        return legacy;
      }
    } catch (e) {
      /* localStorage evtl. blockiert (privater Modus) - dann einfach Default */
    }
    return DEFAULT_THEME;
  }

  function apply(theme, opts) {
    opts = opts || {};
    var html = document.documentElement;

    if (opts.animate) {
      html.setAttribute('data-ts-theme-transition', '');
      window.setTimeout(function () {
        html.removeAttribute('data-ts-theme-transition');
      }, 220);
    }

    html.setAttribute('data-theme', theme);

    try {
      localStorage.setItem(KEY, theme);
    } catch (e) { /* ignore */ }

    nudgeRepaint();

    document.dispatchEvent(new CustomEvent('tstheme:change', {
      detail: { theme: theme }
    }));
  }

  // WebKit-Darstellungsfehler: position:sticky/fixed-Elemente mit
  // color-mix()-Hintergrund (z.B. Backbars, untere Tab-Leisten, Fußleisten)
  // werden bei einer reinen CSS-Custom-Property-Änderung (data-theme wechselt,
  // --ts-bg etc. ändern sich) manchmal nicht neu gezeichnet, obwohl der Wert
  // korrekt ist - sichtbar z.B. als "hängengebliebene" dunkle Kopf-/Fußleiste
  // nach dem Umschalten auf Hell. Kurzes Anstoßen einer Compositing-Eigenschaft
  // erzwingt zuverlässig ein Neuzeichnen.
  function nudgeRepaint() {
    var els = document.querySelectorAll(
      '.ts-backbar, nav, header, footer, footer.toolbar, .summary-bar, #ts-toast, .toast'
    );
    els.forEach(function (el) {
      el.style.transform = 'translateZ(0)';
      requestAnimationFrame(function () { el.style.transform = ''; });
    });
  }

  // Theme SOFORT setzen (synchron, vor DOMContentLoaded), damit die Seite
  // nie kurz im falschen Theme aufblitzt.
  var current = readStored();
  apply(current, { animate: false });

  function buildToggle() {
    if (document.getElementById('ts-theme-toggle')) return;

    var btn = document.createElement('button');
    btn.id = 'ts-theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Hell-/Dunkelmodus umschalten');

    function render() {
      var isLight = document.documentElement.getAttribute('data-theme') === 'light';
      btn.innerHTML =
        '<span class="ts-theme-icon">' + (isLight ? '\u2600' : '\u263D') + '</span>' +
        '<span class="ts-theme-label">' + (isLight ? 'Hell' : 'Dunkel') + '</span>';
    }

    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      apply(next, { animate: true });
      render();
    });

    document.addEventListener('tstheme:change', render);

    document.body.appendChild(btn);
    render();
  }

  // In Iframes keinen eigenen Button bauen - die einbettende Hülle stellt
  // bereits einen für alle eingebetteten Tools gemeinsam bereit.
  if (!inIframe) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildToggle);
    } else {
      buildToggle();
    }
  }

  // Wechselt jemand das Theme in einem anderen, gleichzeitig offenen Fenster/
  // Tab/Iframe derselben Seite, kommt hier ein "storage"-Event an (Browser-
  // Standardverhalten, kein Zutun nötig) - so bleiben z.B. mehrere in
  // kunden-center.html eingebettete Tools ohne Neuladen synchron.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY && (e.newValue === 'dark' || e.newValue === 'light')) {
      apply(e.newValue, { animate: true });
    }
  });

  window.TSTheme = {
    get: function () {
      return document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
    },
    set: function (theme) {
      if (theme !== 'dark' && theme !== 'light') return;
      apply(theme, { animate: true });
    },
    toggle: function () {
      var next = this.get() === 'light' ? 'dark' : 'light';
      apply(next, { animate: true });
    }
  };
})();
