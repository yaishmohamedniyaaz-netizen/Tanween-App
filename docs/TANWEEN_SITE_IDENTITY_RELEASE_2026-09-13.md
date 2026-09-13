# Tanween site and installed identity

Owner requested the Sites name and logo change after approving and publishing the header.

Sites display title updated to Tanween through the metadata tool. This does not change the public URL. Browser title, application name, Apple web-app title, manifest name/short name and install/update wording now use Tanween. Browser favicon SVG/16/32/192, installed 192/512, maskable 512 and Apple-touch 180 assets come from the supplied pack unchanged. The maskable and Apple-touch PNGs are square and fully opaque.

Retain manifest id/start_url/scope, origin, cache namespaces and local-data identifiers. Old icon files remain available for older clients; new references and the new precache use Tanween assets. The existing build hash changes the static shell version automatically; Mushaf downloads retain their cache names and versions.

Validation: production build passed; 381 app tests passed, one optional skip. PNG dimensions and exact source-pack bytes checked. Built manifest and precache reference existing new icons, and the built service worker has its normal unique app-v30 hash. No scoring/record/schema changes. Existing large-chunk build warning remains. Actual installed-device icon/name refresh timing is not proven by these checks.

Confidence: practicality 97/100; architecture/data safety 96/100; visual certainty 92/100 for the supplied icon assets. No site URL migration or broader copy rebrand is included.
