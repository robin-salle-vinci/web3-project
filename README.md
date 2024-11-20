

# Discord Bots

## Objectifs

Ce projet est un ensemble de bots Discord permettant d'offrir diverses commandes utilitaires à un serveur Discord.
Parmis ces bots, nous pouvons retrouver un gestionnaire d'agenda, un modérateur de serveur, générateur de sondages et votes, un bot de notifications Youtube et un chatbot avec le modèle chatGPT3.5 inclus.

## Fonctionnalités

# Bot gestionnaire d'agenda
- Ajouter des événements avec une date, une heure et une description.
- Supprimer des événements existants.
- Lister tous les événements programmés.
- Envoyer des rappels pour les événements le jour même et la veille.

# Chatbot avec modèle chatGPT3.5
- converser avec le modèle chatGPT3.5 turbo.

# Bot de générateur de sondages et votes
- Création d'un sondage

# Bot de notifications Youtube
- récuperer les updates d'une chaîne youtube à partir de youtube api

# Bot de modération de serveur
- Modération des mots interdits
- Système de mute
- Système de réaction pour les règles
- Commande de configuration du canal de log
- Bienvenue et attribution de rôle par défaut

## Architecture

L'application utilise une architecture MPA (Multi-Page Application) avec du Server Side Rendering (SSR). Le serveur Express.js gère les requêtes HTTP et les interactions avec l'API Discord. Le rendu des pages et la gestion des événements se font côté serveur.
Les bots utilise l'API Discord pour recevoir des commandes slash ou ! et envoyer des notifications dans les canaux Discord.

## Technologies utilisées

- Node.js
- Express.js
- Discord.js
- discord-interactions
- node-cron
- moment-timezone
- Google APIs
- AI/ML API

## Installation

1. Clonez le dépôt :
    git clone https://github.com/robin-salle-vinci/web3-project
    cd web3-project
2. cd dans le dossier du Discord bot souhaité
3. Installez les dépendances :
    npm install
4. Créez un fichier .env et ajoutez vos variables d'environnement :
    DISCORD_TOKEN=your_discord_token
    PUBLIC_KEY=your_public_key
    PORT=3000 (sauf bot AI)
    API_KEY des technologies tierces(AI/ML, Youtube,...)
5. Démarrez l'application :
    npm run dev
    (+ngrok ?)

### Utilisation

## Bot de gestionnaire d'agenda
# Ajouter un événement

Utilisez la commande slash `/addevent` avec les options suivantes :

- `date` : La date de l'événement (format YYYY-MM-DD).
- `heure` : L'heure de l'événement (format HH:mm).
- `description` : La description de l'événement.

# Supprimer un événement

Utilisez la commande slash `/deleteevent` avec les options suivantes :

- `date` : La date de l'événement (format YYYY-MM-DD).
- `heure` : L'heure de l'événement (format HH:mm).

# Lister les événements

Utilisez la commande slash `/listevent` pour lister tous les événements programmés.

# Créer un sondage

Utilisez la commande slash `/poll` pour créer un sondage.

- `titre` : le sujet du sondage
- `option1` : première option
- `option2` : deuxième option
- `option3` : troisième option
- `option4` : quadrième option
- `option5` : cinquième option

## Chatbot avec le modèle chatGPT3.5

# Dialoguer avec le bot
Utilisez la commande `!chat` suivi de votre requête.

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## Réutilisation de code

| Chemin du fichier où se trouve le code réutilisé | Auteur du code source réutilisé | URL où le code réutilisé est disponible                           | Raison de la réutilisation du code                                  |
|--------------------------------|---------------------------------|---------------------------------------------------------------|-------------------------------------------------------------------|
| / | Discord.dev                    | https://discord.com/developers/docs/quick-start/getting-started | Tutoriel pour se lancer dans le développement des Discord bots   |
| /ai_bot/requests/aiml.js | AI/ML API documentation        | https://docs.aimlapi.com/quickstart/setting-up                | Mise en place de l'appel d'API pour interagir avec des modèles AI |
