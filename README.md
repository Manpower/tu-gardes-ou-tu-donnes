# Tu gardes ou tu donnes ?

Jeu de cartes pour le format vidéo, branché sur la base Supabase (lecture seule).

## Lancer en développement
    npm install
    npm run dev          # ouvre http://localhost:5173 avec rechargement automatique

## Générer
    npm run build:single # dist-single/index.html : un seul fichier, ouvrable par double-clic
    npm run build        # dist/ : version multi-fichiers à héberger (Netlify, Vercel, GitHub Pages…)

## Structure
    src/api.js           accès à la base (5 requêtes au démarrage, cache local si hors ligne)
    src/logic.js         règles du jeu (tirage des battles, choix, score), sans DOM
    src/ui/card.js       rendu d'une carte (face, dos, cercle magique généré par carte)
    src/ui/tilt.js       inclinaison 3D + reflet holographique au survol
    src/ui/drag.js       glisser la carte vers un joueur pour décider
    src/ui/fx.js         autocollants JE GARDE / JE DONNE, étincelles, secousse
    src/views/           écrans : accueil, table de jeu, deck
    src/styles/          un fichier CSS par écran + jetons communs (base.css)
    src/data/images.json illustration de chaque carte (chemin Fandom, type de correspondance, média local)
    public/media/        anciens GIF convertis : <slug>.webp (image fixe) + <slug>.mp4 (boucle, 500 Ko max)

## Branches
    main                 version stable, on n'y pousse jamais directement
    dev                  intégration : chaque fonctionnalité y arrive par pull request et y est testée
    feature/<nom>        une branche par fonctionnalité, partie de dev

Raccourcis en jeu : G = je garde, D = je donne, flèches = envoyer la carte à gauche ou à droite.
