-- ============================================================
-- TS-Suite · Storage-Bucket für das Firmenlogo anlegen
-- ------------------------------------------------------------
-- Im Supabase-Dashboard ausführen: SQL Editor -> New query
-- (oder alternativ manuell: Storage -> New bucket -> Name "branding",
--  Häkchen bei "Public bucket" setzen - dann sind nur die Policies
--  weiter unten noch nötig)
-- ============================================================

-- 1) Bucket anlegen, öffentlich lesbar (wie "angebote"/"berichte-medien")
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- 2) Lesezugriff für alle (auch ohne Login) - nötig, damit die erzeugten
--    PDFs das Logo laden können, und für die Vorschau in Admin.
create policy "branding: öffentlich lesbar"
on storage.objects for select
using (bucket_id = 'branding');

-- 3) Hochladen/Ersetzen (Upsert) erlauben.
--    Hinweis: Die eigentliche Admin-Prüfung (nur Rolle "admin" darf den
--    Firmenlogo-Tab in admin.html überhaupt sehen/nutzen) passiert schon
--    vorher in der App über die mitarbeiter-Edge-Function - hier auf
--    Datenbankebene wird nur generell erlaubt, in diesen einen Bucket zu
--    schreiben (genau wie bei euren bestehenden Buckets "angebote" und
--    "berichte-medien" - falls die andere Policies haben, bitte dort
--    orientieren statt an dieser Vorlage).
create policy "branding: hochladen"
on storage.objects for insert
with check (bucket_id = 'branding');

create policy "branding: ersetzen"
on storage.objects for update
using (bucket_id = 'branding');

-- 4) Entfernen (für den "Logo entfernen"-Button in Admin)
create policy "branding: löschen"
on storage.objects for delete
using (bucket_id = 'branding');
