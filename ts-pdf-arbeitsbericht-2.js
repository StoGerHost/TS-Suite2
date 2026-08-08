/* ============================================================
   TS-Suite · Gemeinsame PDF-Layout-Funktion für den Arbeitsbericht
   ------------------------------------------------------------
   Wird von arbeitsbericht.html (live bei Berichtserstellung) UND
   uebersicht.html ("PDF neu erzeugen" aus gespeicherten Daten)
   gleichermaßen eingebunden, damit beide Ausgaben garantiert
   identisch bleiben und nicht mehr wie bisher unabhängig
   voneinander gepflegt werden müssen.

   Bewusst eine REINE Zeichenfunktion — sie lädt selbst nichts
   nach (kein fetch, kein async): Fotos und Unterschrift müssen
   vom Aufrufer bereits als fertige data:-URLs übergeben werden.
   Grund: arbeitsbericht.html hat sie synchron im Speicher
   (Kamera-Fotos, Canvas-Unterschrift), uebersicht.html muss sie
   dagegen erst asynchron aus Supabase Storage nachladen — dieser
   Unterschied gehört zum jeweiligen Aufrufer, nicht ins gemeinsame
   Layout.

   Einbindung (nach dem jsPDF-CDN-Script, vor dem Haupt-Script):
     <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
     <script src="ts-pdf-arbeitsbericht.js"></script>

   Eingabeobjekt (siehe erzeugeArbeitsberichtPdf() unten):
     unterschriftDataUrl   fertige data:-URL oder null
     unterschriftLadefehler  true, wenn eine Unterschrift-URL vorhanden war,
                            das Laden aber fehlgeschlagen ist (andere Meldung
                            im PDF als "keine Unterschrift erfasst")
   ============================================================ */
function erzeugeArbeitsberichtPdf(eingabe){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'mm', format:'a4'});
  const pageW = 210, margin = 16;
  let y = 20;

  // Rundet auf 2 Nachkommastellen, zeigt aber keine unnötigen Nullen
  // (z.B. "2,5" statt "2,50", "3" statt "3,00").
  function stundenFmt(v){
    const n = parseFloat((v||'').toString().replace(',','.')) || 0;
    return n.toFixed(2).replace('.',',').replace(/,?0+$/,'').replace(/,$/,'') || '0';
  }

  doc.setFont('helvetica','bold'); doc.setFontSize(16);
  doc.text('Arbeitsbericht', margin, y); y += 10;

  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  const felder = [
    ['Kunde', eingabe.kunde],
    ['Bauvorhaben', eingabe.bauvorhaben],
    ['Angebots-/Auftragsnr.', eingabe.angebotsnr],
    [eingabe.datumLabel || 'Datum', eingabe.datumWert],
    ['Techniker', eingabe.techniker],
  ];
  felder.forEach(([label, value]) => {
    doc.setFont('helvetica','bold'); doc.text(label + ':', margin, y);
    doc.setFont('helvetica','normal'); doc.text(value || '-', margin + 55, y);
    y += 6.5;
  });
  if(eingabe.lieferanschrift){
    doc.setFont('helvetica','bold'); doc.text('Lieferanschrift:', margin, y);
    doc.setFont('helvetica','normal');
    const liefLines = doc.splitTextToSize(eingabe.lieferanschrift, pageW - margin - 55 - margin);
    doc.text(liefLines, margin + 55, y);
    y += Math.max(6.5, liefLines.length * 5);
  }
  y += 4;

  doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text('Zeiterfassung', margin, y); y += 7;
  doc.setFontSize(10);
  let gesamtStunden = 0, gesamtWegepauschalen = 0;
  (eingabe.zeiterfassung || []).forEach(block => {
    doc.setFont('helvetica','bold');
    doc.text(block.techniker + (block.primary ? ' (Gerät)' : ''), margin, y); y += 5.5;
    doc.setFont('helvetica','normal');
    let blockStunden = 0;
    (block.tage || []).forEach(t => {
      const std = parseFloat((t.stunden||'').toString().replace(',','.')) || 0;
      if(t.datum || std){
        const datumFmt = t.datum ? t.datum.split('-').reverse().join('.') : '-';
        const wegeText = t.wegepauschale ? '  ·  Wegepauschale' : '';
        doc.text(`  ${datumFmt}   ${stundenFmt(std)} Std.${wegeText}`, margin, y);
        y += 5.5;
        if(t.wegepauschale) gesamtWegepauschalen++;
      }
      blockStunden += std;
    });
    gesamtStunden += blockStunden;
    doc.setFont('helvetica','italic');
    doc.text(`  Zwischensumme: ${stundenFmt(blockStunden)} Std.`, margin, y);
    y += 7;
  });
  doc.setFont('helvetica','bold');
  doc.text('Gesamt: ' + stundenFmt(gesamtStunden) + ' Std.'
    + (gesamtWegepauschalen ? `  ·  Wegepauschalen: ${gesamtWegepauschalen}x` : ''), margin, y);
  y += 10;

  doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text('Tätigkeitsbeschreibung', margin, y); y += 7;
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  const taetLines = doc.splitTextToSize(eingabe.taetigkeit || '-', pageW - margin*2);
  doc.text(taetLines, margin, y);
  y += taetLines.length * 5 + 6;

  doc.setFont('helvetica','bold');
  doc.text('Status: ' + (eingabe.status === 'fortgesetzt' ? 'Arbeiten werden fortgesetzt' : 'Arbeiten beendet'), margin, y);
  y += 10;

  if(eingabe.internerBericht){
    if(y > 250){ doc.addPage(); y = 20; }
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.text('Interner Bericht (nicht für den Kunden)', margin, y); y += 7;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    const ibLines = doc.splitTextToSize(eingabe.internerBericht, pageW - margin*2);
    doc.text(ibLines, margin, y); y += ibLines.length * 5 + 8;
  }

  if(eingabe.hinweis){
    if(y > 250){ doc.addPage(); y = 20; }
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.text('Hinweis', margin, y); y += 7;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    const hLines = doc.splitTextToSize(eingabe.hinweis, pageW - margin*2);
    doc.text(hLines, margin, y); y += hLines.length * 5 + 8;
  }

  if(y > 240){ doc.addPage(); y = 20; }
  doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text('Materialverbrauch', margin, y); y += 7;
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  const materialText = (eingabe.materialZeilen && eingabe.materialZeilen.length) ? eingabe.materialZeilen.join('\n') : '-';
  const matLines = doc.splitTextToSize(materialText, pageW - margin*2);
  doc.text(matLines, margin, y);
  y += matLines.length * 5 + 8;

  const fotos = eingabe.fotoDataUrls || [];
  if(fotos.length){
    if(y > 230){ doc.addPage(); y = 20; }
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.text('Fotos', margin, y); y += 7;
    let x = margin;
    const imgW = 55, imgH = 55, gap = 6;
    fotos.forEach(f => {
      if(x + imgW > pageW - margin){ x = margin; y += imgH + gap; }
      if(y + imgH > 280){ doc.addPage(); y = 20; x = margin; }
      try{ doc.addImage(f.dataUrl, f.format || 'JPEG', x, y, imgW, imgH); }catch(e){}
      x += imgW + gap;
    });
    y += imgH + 12;
    if(eingabe.fotoFehlerAnzahl){
      doc.setFont('helvetica','italic'); doc.setFontSize(9);
      doc.text(`${eingabe.fotoFehlerAnzahl} von ${fotos.length + eingabe.fotoFehlerAnzahl} Foto(s) konnten nicht geladen werden.`, margin, y);
      y += 6;
    }
  }

  if(y > 230){ doc.addPage(); y = 20; }
  doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text('Kundenunterschrift', margin, y); y += 4;

  if(eingabe.keinAbnehmerVorOrt){
    y += 8;
    doc.setFont('helvetica','italic'); doc.setFontSize(10);
    doc.text('Unterschriftsberechtigter nicht vor Ort', margin, y);
    y += 8;
  } else {
    if(eingabe.unterschriftDataUrl){
      try{ doc.addImage(eingabe.unterschriftDataUrl, 'PNG', margin, y, 90, 40); }
      catch(err){
        console.error('Unterschrift konnte nicht eingefügt werden:', err);
        doc.setFont('helvetica','normal'); doc.setFontSize(10);
        doc.text('(Unterschrift konnte nicht geladen werden)', margin, y + 10);
      }
    } else if(eingabe.unterschriftLadefehler){
      // Datensatz hat eine gespeicherte Unterschrift, aber sie konnte beim
      // Aufruf nicht geladen werden (z.B. Netzwerkfehler) — bewusst eine
      // andere Meldung als "keine Unterschrift erfasst", weil die Ursache
      // eine andere ist (Ladefehler statt tatsächlich fehlender Erfassung).
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.text('(Unterschrift konnte nicht geladen werden)', margin, y + 10);
    } else {
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.text('(keine Unterschrift erfasst)', margin, y + 10);
    }
    y += 44;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text(eingabe.kundenname || '-', margin, y);
    doc.setDrawColor(180); doc.line(margin, y-1, margin+90, y-1);
    y += 8;
    if(eingabe.abnehmerFunktion){
      doc.text('Funktion: ' + eingabe.abnehmerFunktion, margin, y);
      y += 6;
    }
  }

  doc.save(eingabe.dateiname || 'Arbeitsbericht.pdf');
}
