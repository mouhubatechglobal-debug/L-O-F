# Love Or Freindship

Salon de jeux pour l'amour, l'amitié, et ce qu'il y a entre les deux. L'interface React déjà construite est conservée. Le serveur est l'autorité pour les comptes, les messages, les salons et les résultats en ligne.

Le code peut tourner en local avec Docker, ou être connecté à Vercel avec une base PostgreSQL managée, un stockage objet et Redis. Il n'a pas été déployé depuis cet environnement. Voir [DEPLOYMENT.md](DEPLOYMENT.md).

## Lancer ici

PostgreSQL doit tourner, avec une base `lof` et un utilisateur dédié.

```sh
cp .env.example .env
npm install
npm run server
npm run dev
```

Le navigateur parle uniquement à Vite sur `0.0.0.0:5173`. Vite proxifie `/api` et `/socket.io` vers le serveur `127.0.0.1:8787`. Ne pas appeler ce port depuis le navigateur.

## Scripts

- `npm run dev` — client Vite
- `npm run server` — API et Socket.IO
- `npm start` — production locale : site construit et API dans le même processus
- `npm run db:migrate` — applique les migrations, sans les rejouer à chaque requête
- `npm run db:seed` — migrations, puis profils du salon
- `npm test` — moteur de jeu, stockage, API PostgreSQL, deux clients temps réel
- `npm run test:e2e` — statut du test deux navigateurs. Il échoue tant que Playwright n'a pas été exécuté.
- `npm run lint`, `npm run typecheck`, `npm run build`

# Deployment on Vercel

Ce n'est pas un déploiement effectué. C'est la procédure pour le faire sur ton compte.

### Étape 1 — PostgreSQL

Crée une base PostgreSQL managée (Neon, Render, Supabase Postgres, ou équivalent). Copie son URL dans `DATABASE_URL`. Elle doit accepter SSL (`sslmode=require`). N'ouvre pas le port 5432 sur Internet sans TLS.

### Étape 2 — Stockage objet

Crée un bucket S3 compatible (Cloudflare R2, AWS S3, ou MinIO). Renseigne `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_ENDPOINT` et `STORAGE_REGION`. En production Vercel, `STORAGE_DRIVER` ne doit pas rester `local` : le dossier `server/uploads` n'est pas conservé.

### Étape 3 — Redis

Crée une base Redis (Upstash ou équivalent) et mets son URL TCP dans `REDIS_URL`. Socket.IO s'en sert pour que les salons et le chat ne dépendent pas d'une seule instance. Le rate limit l'utilise aussi. `UPSTASH_REDIS_REST_URL` ne remplace pas `REDIS_URL` pour les salons.

### Étape 4 — GitHub

Pousse le dépôt, sans fichier `.env`. Dans Vercel : Add New → Project → importe le dépôt. Le framework détecté est Vite.

### Étape 5 — Variables

Dans Vercel → Project → Settings → Environment Variables, ajoute les variables de `.env.example` marquées production. Fais-le pour Production et Preview. Ne mets aucun secret dans une variable `VITE_*`, sauf le chemin public `VITE_SOCKET_PATH=/api/socket.io` si le domaine n'est pas `*.vercel.app`.

Obligatoires en production :

- `DATABASE_URL`
- `DATABASE_SSL=1`
- `COOKIE_SECURE=1`
- `REDIS_URL`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_ENDPOINT`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`
- `STORAGE_FORCE_PATH_STYLE=1` pour R2 ou MinIO

### Étape 6 — Migrations

Depuis ta machine, une seule fois, avec la même `DATABASE_URL` :

```sh
npm run db:migrate
npm run db:seed
```

Elles ne partent pas à chaque visite. Les relancer est sans effet si elles ont déjà été appliquées.

### Étape 7 — Déployer

Lance le déploiement depuis Vercel, ou `npx vercel --prod` une fois connecté à ton compte. Le build est `npm run build`. L'API est la fonction `api/[[...path]].js`. Le client parle en chemins relatifs, jamais à `localhost`.

### Étape 8 — Tester

- `GET /api/health` doit répondre `{ "ok": true, "db": true }`.
- Crée un compte, déconnecte-toi, reconnecte-toi.
- Ouvre deux navigateurs, un salon en ligne, un message.
- Change un fond d'écran : il doit revenir après rechargement.
- Le mode hors ligne de l'application reste « bientôt ».

### Checklist

```text
[ ] dépôt sans .env
[ ] DATABASE_URL distante
[ ] migrations exécutées une fois
[ ] Redis connecté
[ ] bucket objet connecté
[ ] COOKIE_SECURE=1
[ ] /api/health ok
[ ] compte, salon, message, image testés
```

## Documents

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [SECURITY.md](SECURITY.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [DATABASE.md](DATABASE.md)
- [TESTING.md](TESTING.md)
