# AEGIS Earth Mobile

Application géospatiale **mobile-first** pour Android (PWA / Capacitor) et navigateur, inspirée de [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view).

## GitHub Pages

**Site prévu :** https://nikoju1977.github.io/aegis-earth-mobile/

Cette URL devient accessible après activation de Pages et réussite du workflow. La publication n'est pas active automatiquement par la seule création des fichiers.

1. Ouvrir **Settings → Pages** dans ce dépôt.
2. Sous **Build and deployment → Source**, sélectionner **GitHub Actions**.
3. Ouvrir **Actions → Deploy AEGIS Earth to GitHub Pages**. Si aucune exécution réussie n'a suivi le réglage, lancer **Run workflow**.
4. Vérifier l'URL dans l'onglet Pages ou dans l'exécution du workflow.

Le workflow se trouve dans [.github/workflows/pages.yml](.github/workflows/pages.yml) et republie automatiquement après les mises à jour de main.

## Fonctions Pages (édition statique)

- Globe 3D CesiumJS avec imagerie Esri et navigation tactile.
- Séismes USGS (magnitudes 2,5+ sur 24 h) et événements ouverts NASA EONET.
- Position ISS via Where The ISS At, selon disponibilité et politiques CORS.
- Activation des couches, radar trié par distance, recherche de lieux par Photon.
- Géolocalisation après consentement, mesure de routes en kilomètres.
- Enregistrement/export de lieux via le stockage local.
- PWA installable en raccourci depuis Chrome Android ; mise en cache limitée des assets de l'application.

**Important : GitHub Pages est statique.** Les requêtes aux API ont lieu directement depuis le navigateur, donc les fournisseurs peuvent refuser CORS, limiter les requêtes ou être indisponibles. L'application indique alors l'indisponibilité (ou une archive temporaire de session) ; elle ne simule pas de données « temps réel ». Le chargement des tuiles et du moteur Cesium nécessite Internet et dépend de services tiers. Les mentions « SOURCES » indiquent des réponses réussies, pas un flux continu seconde par seconde.

La **V2 complète avec serveur Node**, fournie antérieurement dans l'archive de la conversation, n'est **pas intégralement copiée dans ce dépôt** : cette publication est une édition web autonome adaptée à Pages. Les fonctionnalités avec proxy telles que les avions ADS-B, certains indices météo, les fonctions spécifiques du serveur et le suivi avancé requièrent encore l'intégration du backend.

## Android

Un projet Capacitor est paramétré (dossier www/). Pour compiler manuellement :

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

Android Studio et le SDK Android doivent être installés.

Le workflow [Android Debug APK](.github/workflows/android-debug-apk.yml) peut aussi être lancé depuis **Actions → Android Debug APK → Run workflow**. Il compile une application de développement utilisant l'édition statique. L'APK n'est pas signé pour le Play Store ; aucune compilation réussie n'est affirmée tant que les logs GitHub Actions ne la confirment.

## Parité Android / GitHub Pages (v0.4)

Le **site public à la racine** (`index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg`) est la source unique des fichiers web. Le dossier `www/` est une copie synchronisée destinée à Capacitor. Ne pas modifier manuellement `www/`.

```bash
npm install
npm run sync:web
npm run check:web
npm test
npm run android:add
npm run android:sync
```

Le workflow [Android Debug APK](.github/workflows/android-debug-apk.yml) exécute ces vérifications avant `assembleDebug` lorsque les sources Android/web changent sur `main`, ou manuellement via **Actions → Android Debug APK → Run workflow**. Si la compilation réussit, récupérez l'artefact `aegis-earth-mobile-debug-apk` dans le workflow réussi, extrayez `app-debug.apk`, puis installez-le sur Android après autorisation d'installation depuis cette source.

**APK de test uniquement** : signé avec la clé de développement de GitHub Actions, sans mise en production Play Store. La clé debug peut varier entre compilations ; une future installation par-dessus l'ancienne peut nécessiter une désinstallation. Sauvegardez les favoris avant toute désinstallation : leurs données sont conservées sur l'appareil.

**Périmètre identique, pas de backend magique** : Android utilise la même édition statique que Pages. Les avions ADS-B, navires AIS, caméras live et autres flux qui exigent un serveur ne sont pas ajoutés par ce workflow. Les services web externes (notamment Cesium et les API publiques) nécessitent Internet.

## Sources et limites

CesiumJS : moteur de globe ; Esri World Imagery : fond de carte (crédits sur la carte) ; USGS : séismes ; NASA EONET : événements ; Where The ISS At : ISS ; Photon / OpenStreetMap : recherche. Les sources sont soumises à leurs licences, quotas et conditions d'utilisation. Les couches ne sont pas exhaustives.

Aucune donnée privée n'est collectée par le projet. Les favoris restent dans le stockage du navigateur. Le GPS exige une autorisation explicite. Cette application ne fournit ni système de surveillance ni accès à des caméras privées.

**Licence :** adapter/clarifier les licences des dépendances et des fonds de cartes avant toute diffusion commerciale. Le code de cette édition est fourni ici à des fins de développement et de test.
