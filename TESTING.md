# Tests

Ne pas lire un résultat qui n'est pas dans ce fichier comme un succès. Les commandes ci-dessous ont été lancées dans l'environnement de travail le 2026-09-25.

## VALIDÉ

`DATABASE_URL=postgres://lof:lof_local_dev_only@127.0.0.1:5432/lof_test BCRYPT_ROUNDS=6 npx vitest run`

12 tests, 3 fichiers, sortie `12 passed` :

- moteur pur : morpion, refus d'un gagnant déclaré par le client, choix de pierre caché, paires de mémoire cachées, score de vérité calculé par les votes
- API : en-tête anti-CSRF, mot de passe absent de la réponse, pseudo unique, rôle admin non injectable, réponse admin refusée à un joueur, journal d'audit, suspension qui révoque la session et bloque le login, suppression pour tout le monde limitée à l'auteur, morpion en ligne dont le gagnant est relu dans `game_results`
- deux clients Socket.IO : les deux rejoignent la room et reçoivent l'état serveur après le lancement

`npm run lint` et `npm run typecheck` vérifient la syntaxe Node des fichiers serveur. Ce n'est pas un typecheck TypeScript. Le client reste en JavaScript pour ne pas réécrire l'interface.

## NON TESTÉ

`npm run test:e2e` quitte avec le code 2. Il n'y a pas de Chromium ici. Un test Playwright deux navigateurs n'a pas été exécuté, et aucun succès n'a été inventé. Le test deux clients Socket.IO ne le remplace pas : il prouve le protocole, pas deux vrais navigateurs.

Le workflow GitHub Actions n'a pas été exécuté sur GitHub.

## SIMULÉ / NON CONNECTÉ

- stockage objet cloud : non connecté. Le disque local valide le type et la taille, ce n'est pas S3.
- déploiement : non exécuté.
- parties hors ligne sur un seul écran : toujours résolues dans le client. Elles ne sont pas des résultats officiels.

## Sauvegarde

VALIDÉ le 2026-09-25.

`DATABASE_URL=postgres://lof:lof_local_dev_only@127.0.0.1:5432/lof_test sh scripts/backup.sh`

a écrit `backups/lof-20260925T164645Z.dump`.

Restauration vers une base neuve `lof_restore_check` : `restored`, puis `SELECT count(*) FROM users` a renvoyé 10. `game_results` valait 0 dans ce dump, parce que la suite de tests avait vidé les résultats avant la sauvegarde. La restauration a recopié le dump, elle ne l'a pas inventé.
