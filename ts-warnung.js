/* ============================================================
   TS-Suite · Gemeinsame schwebende Warnmeldung (ts-warnung.js)
   ------------------------------------------------------------
   Zentrierte, schwebende Warnmeldung — bleibt stehen, bis der
   Nutzer sie über das X (oder Klick auf den abgedunkelten
   Hintergrund) wegklickt. Ersetzt Warnungen, die nur als Text
   irgendwo im Formular standen und dadurch leicht übersehen
   wurden (z. B. weil die betroffenen Felder weiter unten liegen).

   Einbindung (in jeder Datei, die schwebende Warnungen braucht):
     <script src="ts-warnung.js"></script>

   Aufruf:
     zeigeWarnung('Bitte ausfüllen: Kunde, Datum');
     zeigeWarnung('Flügelgewicht 90 kg überschreitet Maximum (65 kg) für ES 250 PRO T',
                   {titel:'Grenzwert überschritten'});

   Die zugrunde liegende Inline-Anzeige (roter Feldrahmen, alertBox()
   im Formular o. ä.) bleibt überall zusätzlich bestehen — die
   schwebende Meldung ist ein zusätzlicher, nicht zu übersehender
   Hinweis, kein Ersatz für die Kontext-Anzeige im Formular selbst.
   ============================================================ */
(function () {
  'use strict';
  var overlay = null;

  function baueOverlay() {
    if (overlay) return overlay;
    var css =
      '#tsWarnungOverlay{position:fixed;inset:0;z-index:99998;display:none;align-items:center;justify-content:center;' +
      'padding:20px;background:rgba(0,0,0,.6);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}' +
      '#tsWarnungOverlay.visible{display:flex;}' +
      '#tsWarnungBox{width:min(92vw,380px);background:#1a1d24;border:1.5px solid #e05a4e;border-radius:14px;' +
      'padding:24px 20px 20px;box-shadow:0 12px 48px rgba(0,0,0,.55);position:relative;}' +
      '#tsWarnungClose{position:absolute;top:10px;right:10px;width:30px;height:30px;border:none;border-radius:50%;' +
      'background:rgba(224,90,78,.15);color:#e05a4e;font-size:16px;font-weight:700;cursor:pointer;line-height:1;}' +
      '#tsWarnungClose:active{background:rgba(224,90,78,.3);}' +
      '#tsWarnungIcon{font-size:30px;text-align:center;margin-bottom:10px;}' +
      '#tsWarnungTitel{color:#fff;font-weight:800;font-size:15.5px;text-align:center;margin-bottom:8px;}' +
      '#tsWarnungText{color:rgba(255,255,255,.85);font-size:13.5px;line-height:1.55;text-align:center;white-space:pre-line;}' +
      '#tsWarnungOk{display:block;margin:18px auto 0;background:#e05a4e;color:#fff;border:none;border-radius:8px;' +
      'padding:10px 24px;font-weight:700;font-size:13.5px;cursor:pointer;}';
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    overlay = document.createElement('div');
    overlay.id = 'tsWarnungOverlay';
    overlay.innerHTML =
      '<div id="tsWarnungBox">' +
      '  <button id="tsWarnungClose" aria-label="Schließen">✕</button>' +
      '  <div id="tsWarnungIcon">⚠️</div>' +
      '  <div id="tsWarnungTitel"></div>' +
      '  <div id="tsWarnungText"></div>' +
      '  <button id="tsWarnungOk">Verstanden</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#tsWarnungClose').addEventListener('click', versteckeWarnung);
    overlay.querySelector('#tsWarnungOk').addEventListener('click', versteckeWarnung);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) versteckeWarnung(); });
    return overlay;
  }

  function zeigeWarnung(text, optionen) {
    optionen = optionen || {};
    var ov = baueOverlay();
    ov.querySelector('#tsWarnungIcon').textContent = optionen.icon || '⚠️';
    ov.querySelector('#tsWarnungTitel').textContent = optionen.titel || 'Bitte prüfen';
    ov.querySelector('#tsWarnungText').textContent = text;
    ov.classList.add('visible');
  }
  function versteckeWarnung() {
    if (overlay) overlay.classList.remove('visible');
  }

  window.zeigeWarnung = zeigeWarnung;
  window.versteckeWarnung = versteckeWarnung;
})();
