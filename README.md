# Discord Bot

## Objectifs

Ce projet est un ensemble de bots Discord permettant d'offrir diverses commandes utilitaires à un serveur Discord. 
Parmi ces bots, nous pouvons retrouver un gestionnaire d'agenda, un modérateur de serveur, un générateur de sondages et de votes, un bot de notifications YouTube et un chatbot avec le modèle chatGPT3.5 inclus.

## Fonctionnalités

### Bot gestionnaire d'agenda

- Ajouter des événements avec une date, une heure et une description.
- Supprimer des événements existants.
- Lister tous les événements programmés.
- Envoyer des rappels pour les événements le jour même et la veille.

### Chatbot avec le modèle chatGPT3.5

- Converser avec le modèle chatGPT3.5 turbo.

### Bot générateur de sondages et votes

- Création d'un sondage

### Bot de notifications YouTube

- Récupérer les mises à jour d'une chaîne YouTube à partir de YouTube API

### Bot de modération de serveur

- Modération des mots interdits
- Système de mute
- Système de réaction pour les règles
- Commande de configuration du canal de log
- Bienvenue et attribution de rôle par défaut

## Architecture

L'application utilise une architecture MPA (Multi-Page Application) avec du Server Side Rendering (SSR).
Le serveur Express.js gère les requêtes HTTP et les interactions avec l'API Discord.
Le rendu des pages et la gestion des événements se font côté serveur.
Les bots utilisent l'API Discord pour recevoir des commandes slash ou ! et envoyer des notifications dans les canaux Discord.

## Technologies utilisées

- Node.js
- Express.js
- Discord.js
- discord-interactions
- node-cron
- moment-timezone
- Google APIs
- AI/ML API
- Katabump

### Installation

1. Clonez le dépôt :
   - git clone https://github.com/robin-salle-vinci/web3-project
   - cd web3-project
2. cd dans le dossier du Discord bot souhaité
3. Installez les dépendances :
   - npm install
4. Créez un fichier .env et ajoutez vos variables d'environnement :
   - DISCORD_TOKEN=your_discord_token
   - PUBLIC_KEY=your_public_key
   - PORT=3000 (sauf bot AI)
   - API_KEY des technologies tierces(AI/ML, Youtube,...)
5. Démarrez l'application :
   - npm run dev
6. Mettre en place ngrok en se référant au tutoriel (Step 3: Handling interactivity) : https://discord.com/developers/docs/quick-start/getting-started

### Utilisation

#### Bot de gestionnaire d'agenda

##### Ajouter un événement

Utilisez la commande slash `/addevent` avec les options suivantes :

- `date` : La date de l'événement (format YYYY-MM-DD).
- `heure` : L'heure de l'événement (format HH:mm).
- `description` : La description de l'événement.

##### Supprimer un événement

Utilisez la commande slash `/deleteevent` avec les options suivantes :

- `date` : La date de l'événement (format YYYY-MM-DD).
- `heure` : L'heure de l'événement (format HH:mm).

##### Lister les événements

Utilisez la commande slash `/listevent` pour lister tous les événements programmés.

#### Bot pour la création de sondages et votes

##### Créer un sondage

Utilisez la commande slash `/poll` pour créer un sondage.

- `titre` : le sujet du sondage
- `option1` : première option
- `option2` : deuxième option
- `option3` : troisième option
- `option4` : quatrième option
- `option5` : cinquième option

#### Chatbot avec le modèle chatGPT3.5

##### Dialoguer avec le bot

Utilisez la commande `!chat` suivi de votre requête.

#### Bot pour la modération

##### Filtre de mots interdits

Le bot possède une liste de mots interdits qui sont instantanément supprimés.

##### Lister les possibilités du bot

Utilisez la commande `!help` pour lister toutes les possibilités du bot.

##### Attribution d'un rôle mute après 3 infractions

Après avoir commis 3 infractions, le bot vous attribue le rôle qui vous enlève la capacité de pouvoir écrire dans n'importe quel canal de discussion.

##### Message de bienvenue et attribution de rôle par défaut

Lorsqu'un nouvel utilisateur rejoint le serveur, il reçoit automatiquement un rôle défini par les modérateurs du serveur sans qu'ils doivent le faire manuellement, et un message de bienvenue est envoyé dans le canal "bienvenue".

##### Choix du canal où se trouvent les logs de modération

Avec le rôle Admin, on peut utiliser la commande `!setlogchannel [nom du canal]` avec laquelle on définit le canal dans lequel les actions de modération seront enregistrées.

##### Système de réaction pour les règles

Dans le canal "chartes-et-regles", un utilisateur peut obtenir le rôle de membre en réagissant au message qui répertorie les règles.
Cela donnera un accès global au serveur hormis les canaux réservés aux administrateurs.

#### Bot de notifications YouTube

Ce bot permet de recevoir toutes les notifications d'une chaine Youtube dans le channel de votre choix.

### Licence

Ce projet est sous licence MIT.
Voir le fichier [LICENSE](LICENSE) pour plus de détails.

### Réutilisation de code

|Chemin du fichier où se trouve le code réutilisé|Auteur du code source réutilisé|URL où le code réutilisé est disponible|Raison de la réutilisation du code|
|-|-|-|-|
|/|Discord.dev|https://discord.com/developers/docs/quick-start/getting-started|Tutoriel pour se lancer dans le développement des Discord bots|
|/ai_bot/requests/aiml.js|AI/ML API documentation|https://docs.aimlapi.com/quickstart/setting-up|Mise en place de l'appel à l'API AI/ML pour interagir avec le modèle IA|
|/|chatGPT|https://openai.com/chatgpt/overview/| Aide pour la production de code|
|/|Github Copilot|https://github.com/github-copilot/signup/copilot_individual| Aide pour la production du code|