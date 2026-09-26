# Architecture

## Choix

Le client existant est du JavaScript React/Vite. Le réécrire en TypeScript aurait remplacé l'interface, ce qui est hors mission. Le serveur est donc du Node.js ESM, avec Zod pour les entrées, `pg` pour PostgreSQL 17, bcrypt pour les mots de passe, et Socket.IO pour le temps réel. Ce n'est pas un portage aveugle de la suggestion TypeScript/Prisma : Prisma n'apporte rien que le SQL versionné ne fasse déjà, et un compilateur TypeScript supplémentaire n'était pas nécessaire pour rendre le serveur autoritaire.

Le navigateur ne doit jamais appeler `localhost` d'un autre service. Vite proxifie `/api` et `/socket.io`.

## Autorité

- Hors ligne, sur le même écran : le client joue encore la partie locale. Ce n'est pas un résultat officiel.
- En ligne : créer, rejoindre, lancer et jouer passent par `POST /api/rooms`. Le serveur tire le premier tour, refuse un coup hors tour, cache les choix secrets, calcule le gagnant, et l'écrit dans `game_results`. Un corps `{ type: "declare_winner" }` est rejeté.
- Le rôle `admin` est décidé en base. Le premier compte réel le reçoit. Un champ `role` envoyé par le client est ignoré.
- `localStorage` n'est plus qu'un cache sans mot de passe. Une migration unique hash les anciens mots de passe en clair, puis le client les efface.

## Temps réel

Socket.IO authentifie le cookie de session. Les sockets rejoignent `user:{id}`, `room:{id}` et `chat:{id}`. Les mutations HTTP émettent `state:dirty` et `room:state`. Le client rafraîchit l'état et la table.

## Fichiers

- `src/` — interface conservée, plus `api.js`, `realtime.js`, `online.jsx`
- `server/app.js` — HTTP, sessions, social, admin, salons
- `server/game.js` — règles pures, testées sans base
- `server/migrations/` — SQL versionné
- `public/sw.js` — le service worker n'intercepte plus `/api` ni `/socket.io`

## Ce qui n'est pas en place

- Pas de déploiement cloud exécuté.
- Pas de stockage objet S3. Les fonds d'écran validés sont des fichiers locaux servis par `/api/media/:id`.
- Pas de Playwright deux navigateurs exécuté dans cet environnement.
- Les 110 jeux de bibliothèque restent des fiches. Les six jeux de la table ont un moteur en ligne.
