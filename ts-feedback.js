/* ============================================================
   TS-Suite · Zentrales Feedback-System (ts-feedback.js)
   ------------------------------------------------------------
   Stellt drei global verfügbare Bausteine bereit, die native
   Browser-Popups ersetzen. Baut sein DOM selbst auf - kein
   Markup in der Seite nötig.

   Einbindung (im <head>, NACH ts-theme.js):
     <link rel="stylesheet" href="ts-feedback.css">
     <script src="ts-feedback.js"></script>

   API:
     TSToast.show(text, kind?)
       Kurze, nach ~2,6s selbst verschwindende Statusmeldung.
       kind: 'ok' | 'error' | undefined (neutral)
       Ersatz für: schnelle Status-Updates ("Gespeichert ✓").

     TSConfirm.ask(text, opts?) -> Promise<boolean>
       Ja/Abbrechen-Rückfrage. Löst mit true (bestätigt) oder
       false (abgebrochen/Backdrop/Escape) auf.
       opts: { confirmLabel, cancelLabel, danger }
       Ersatz für: confirm('...'). WICHTIG: der Aufruf ist async -
       Aufrufer muss "await TSConfirm.ask(...)" verwenden, die
       umschließende Funktion braucht also "async".

     TSNotice.show(text, opts?) -> Promise<void>
       Hinweis mit einem OK-Button, der aktiv weggeklickt werden
       muss (wie alert(), aber gestylt). Löst auf, sobald die
       Person bestätigt hat.
       opts: { title, icon }
       Ersatz für: die WENIGEN alert()-Aufrufe, bei denen es
       bewusst wichtig ist, dass die Meldung nicht "einfach
       vorbeirauscht" (z.B. Ergebnis eines Netzwerk-Vorgangs).
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- Toast ---------------- */
  function ensureToastEl() {
    var el = document.getElementById('ts-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ts-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  var toastTimer = null;
  function toastShow(text, kind) {
    var el = ensureToastEl();
    el.textContent = text;
    if (kind) { el.setAttribute('data-kind', kind); } else { el.removeAttribute('data-kind'); }
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  window.TSToast = { show: toastShow };

  /* ---------------- Modal-Basis (für Confirm & Notice) ---------------- */
  function buildModal(innerHtml) {
    var backdrop = document.createElement('div');
    backdrop.className = 'ts-modal-backdrop';
    backdrop.innerHTML = '<div class="ts-modal-box" role="dialog" aria-modal="true">' + innerHtml + '</div>';
    document.body.appendChild(backdrop);
    // Reflow abwarten, damit die CSS-Transition greift
    requestAnimationFrame(function () { backdrop.classList.add('show'); });
    return backdrop;
  }

  function closeModal(backdrop) {
    backdrop.classList.remove('show');
    setTimeout(function () {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    }, 180);
  }

  // Erkennt ein führendes Emoji in der Nachricht (z.B. "✅ ...") und trennt
  // es als eigenes Icon ab, statt es mitten im Fließtext stehen zu lassen.
  function splitLeadingEmoji(text) {
    var m = /^([\u2190-\u2BFF\u{1F000}-\u{1FAFF}\u2600-\u27BF]+)\s*/u.exec(text);
    if (m) return { icon: m[1], rest: text.slice(m[0].length) };
    return { icon: null, rest: text };
  }

  /* ---------------- Confirm ---------------- */
  function confirmAsk(text, opts) {
    opts = opts || {};
    var confirmLabel = opts.confirmLabel || 'Ja';
    var cancelLabel = opts.cancelLabel || 'Abbrechen';
    var danger = !!opts.danger;

    return new Promise(function (resolve) {
      var html =
        '<div class="ts-modal-msg"></div>' +
        '<div class="ts-modal-actions">' +
        '<button type="button" class="ts-modal-btn ts-cancel">' + cancelLabel + '</button>' +
        '<button type="button" class="ts-modal-btn ' + (danger ? 'danger' : 'primary') + ' ts-confirm">' + confirmLabel + '</button>' +
        '</div>';
      var backdrop = buildModal(html);
      backdrop.querySelector('.ts-modal-msg').textContent = text;

      var done = false;
      function finish(result) {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', onKey);
        closeModal(backdrop);
        resolve(result);
      }
      function onKey(e) { if (e.key === 'Escape') finish(false); }
      document.addEventListener('keydown', onKey);

      backdrop.querySelector('.ts-confirm').addEventListener('click', function () { finish(true); });
      backdrop.querySelector('.ts-cancel').addEventListener('click', function () { finish(false); });
      backdrop.addEventListener('click', function (e) { if (e.target === backdrop) finish(false); });

      backdrop.querySelector('.ts-confirm').focus();
    });
  }

  window.TSConfirm = { ask: confirmAsk };

  /* ---------------- Notice ---------------- */
  function noticeShow(text, opts) {
    opts = opts || {};
    var split = splitLeadingEmoji(text);
    var icon = opts.icon || split.icon;

    return new Promise(function (resolve) {
      var html =
        (icon ? '<div class="ts-modal-icon">' + icon + '</div>' : '') +
        (opts.title ? '<div style="font-weight:700;font-size:15px;margin-bottom:4px;">' + opts.title + '</div>' : '') +
        '<div class="ts-modal-msg"></div>' +
        '<div class="ts-modal-actions">' +
        '<button type="button" class="ts-modal-btn primary ts-ok">OK</button>' +
        '</div>';
      var backdrop = buildModal(html);
      backdrop.querySelector('.ts-modal-msg').textContent = split.rest;

      var done = false;
      function finish() {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', onKey);
        closeModal(backdrop);
        resolve();
      }
      function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter') finish(); }
      document.addEventListener('keydown', onKey);

      backdrop.querySelector('.ts-ok').addEventListener('click', finish);
      // Bewusst KEIN Schließen per Backdrop-Klick - die Meldung soll aktiv
      // bestätigt werden (das war ja der Grund, warum hier kein Toast reicht).

      backdrop.querySelector('.ts-ok').focus();
    });
  }

  window.TSNotice = { show: noticeShow };
})();
