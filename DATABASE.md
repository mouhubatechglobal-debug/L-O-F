# Base de données

PostgreSQL 17. Schéma versionné dans `server/migrations/`. Au démarrage, le serveur applique les fichiers absents de `schema_migrations`.

## Tables principales

- `users`, `sessions` — comptes et sessions. Les profils du salon (`is_seed`) n'ont pas de mot de passe et ne peuvent pas se connecter.
- `friend_requests`, `chats`, `chat_members`, `messages`, `blocks`, `reports`
- `rooms`, `room_members`, `room_invites`, `game_events`, `game_results`
- `feedback`, `archives`, `admin_actions`, `login_attempts`, `media`

`game_results` est écrit seulement quand le moteur serveur termine la partie. Le client ne l'insère pas.

## Sauvegarde

```sh
DATABASE_URL=postgres://lof:SECRET@127.0.0.1:5432/lof sh scripts/backup.sh
```

Le fichier `backups/lof-*.dump` est un dump custom `pg_dump`. Le dossier `backups/` n'est pas versionné.

## Restauration

Restaurer vers une base vide, jamais vers la base de production sans arrêt d'écriture.

```sh
createdb lof_restore
DATABASE_URL=postgres://lof:SECRET@127.0.0.1:5432/lof_restore sh scripts/restore.sh backups/lof-YYYYMMDDTHHMMSSZ.dump
```

Vérifier ensuite `SELECT count(*) FROM users;` puis, seulement si c'est voulu, remplacer la base de service. Conserver le dump précédent.

## Plan de reprise

1. Arrêter l'API pour figer les écritures.
2. Restaurer le dernier dump validé dans une nouvelle base.
3. Pointer `DATABASE_URL` vers elle.
4. Relancer l'API et contrôler `GET /api/health`.
5. Ne pas réutiliser un dump sans avoir noté son horodatage.

La sauvegarde locale de cet environnement est décrite dans TESTING.md avec le résultat réellement obtenu.
