# Déploiement

État : PRÊT À CONNECTER, NON DÉPLOYÉ. Aucun hébergeur n'a reçu cette application depuis cet environnement.

Deux chemins existent. Docker reste le serveur unique. Vercel est le chemin cloud, avec PostgreSQL, Redis et un bucket objet. Supabase Auth n'est pas connecté.

## Une machine

1. Copier le dépôt sur le serveur.
2. Choisir un mot de passe Postgres, hors du dépôt : `POSTGRES_PASSWORD=...`
3. Derrière HTTPS, ajouter `COOKIE_SECURE=1`. Sans HTTPS, laisser `0`.
4. `docker compose up -d --build`
5. Le site et l'API sont sur le même port, par défaut `8787`.
6. Santé : `GET /api/health` doit répondre `{ "ok": true, "db": true }`.

Le conteneur sert `dist/` et l'API. Le navigateur ne doit pas appeler un second port.

## Sans Docker

```sh
npm ci
npm run build
NODE_ENV=production HOST=0.0.0.0 PORT=8787 DATABASE_URL=postgres://lof:MOT_DE_PASSE@127.0.0.1:5432/lof COOKIE_SECURE=1 npm start
```

`npm start` sert le site construit et l'API dans le même processus.

## À ne pas faire

- Ne pas committer `.env`.
- Ne pas exposer Postgres sur Internet.
- Ne pas mettre le mot de passe en clair dans le dépôt.
- Les sauvegardes restent dans [DATABASE.md](DATABASE.md).
- En local, les images restent dans `server/uploads`. Sur Vercel, elles doivent aller dans le bucket (`STORAGE_*`).
- La procédure Vercel est dans [README.md](README.md), section Deployment on Vercel.

## CI

`.github/workflows/ci.yml` n'a pas été lancé sur GitHub depuis cet environnement : NON EXÉCUTÉ. Le job navigateurs échoue tant que Playwright n'a pas été exécuté.
