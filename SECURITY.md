# Sécurité

## Sessions

Le mot de passe est hashé avec bcrypt. Le coût vient de `BCRYPT_ROUNDS` (12 hors tests). Le jeton de session est aléatoire, seul son SHA-256 est stocké. Le cookie `lof_session` est `HttpOnly`, `SameSite=Lax`, durée 14 jours. `COOKIE_SECURE=1` l'ajoute en `Secure` derrière HTTPS. La déconnexion révoque la session. Une suspension révoque les sessions et refuse le prochain login.

## Ce que le client ne peut pas décider

- rôle, score, gagnant, tour, récompense officielle
- suppression pour tout le monde d'un message qu'il n'a pas écrit
- réponse admin ou suspension sans `role = admin` en base
- résultat de partie via un champ `winnerId`

Les mutations exigent l'en-tête `x-lof-client: web`, en plus du cookie, pour bloquer un formulaire cross-site simple. `/socket.io` est exclu de ce contrôle parce que le transport polling n'envoie pas cet en-tête ; le cookie `SameSite` et l'authentification du handshake restent exigés.

## Abus

- limite sur les routes d'authentification
- 30 messages et 60 actions de jeu par minute et par compte, en mémoire du processus
- longueur maximale des textes
- blocage mutuel avant message
- signalement `POST /api/reports`
- suspension admin, journalisée dans `admin_actions`

La limite en mémoire ne survit pas à plusieurs instances. En production, il faut un limiteur partagé devant le processus. Ce n'est pas encore branché.

## Médias

Un fond d'écran `data:` est décodé, limité à 900 Ko, et accepté seulement si les octets sont JPEG, PNG ou WebP. Le fichier reçoit un nom aléatoire. Le répertoire n'est pas listé.

## Secrets

`.env` est ignoré par git. `.env.example` ne contient pas de secret réel. Les réponses JSON ne renvoient ni hash ni mot de passe. L'email des autres joueurs n'est inclus que pour l'admin, et pour soi-même.

## Journaux

Chaque requête API hors santé écrit une ligne JSON : méthode, chemin, statut, durée. Les mots de passe et jetons sont retirés avant l'écriture. `GET /api/health` vérifie PostgreSQL et ne renvoie pas de secret.
