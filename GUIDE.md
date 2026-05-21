# Application de Coworking - Guide d'utilisation

## Fonctionnalités

Cette application de coworking offre les fonctionnalités suivantes:

### Pour tous les utilisateurs
- 🗺️ **Carte interactive** - Explorez tous les espaces de coworking disponibles
- 📅 **Réservations** - Réservez, modifiez ou annulez vos réservations
- 📊 **Dashboard personnalisé** - Statistiques et vue d'ensemble de vos activités

### Pour les Managers
- ➕ **Gestion des espaces** - Créer, modifier et supprimer des espaces de coworking
- 📈 **Analytics** - Statistiques sur vos espaces et réservations
- 💰 **Suivi des revenus** - Voir les revenus générés par vos espaces

### Pour les Administrateurs
- 👥 **Gestion des utilisateurs** - Gérer tous les utilisateurs et leurs rôles
- 🔐 **Gestion des rôles** - Promouvoir des utilisateurs en managers ou admins
- 📊 **Analytics globales** - Vue complète de toute la plateforme

## Connexion

### Compte de test
- **Email**: admin@cowork.com
- **Mot de passe**: password123
- **Rôle**: Administrateur

### Créer un nouveau compte
1. Cliquez sur "Créer un compte" sur la page de connexion
2. Remplissez vos informations
3. Choisissez votre rôle (Utilisateur ou Manager)
4. Validez

## Utilisation

### Réserver un espace
1. Allez sur la page "Carte"
2. Cliquez sur un espace pour voir ses détails
3. Cliquez sur "Réserver cet espace"
4. Sélectionnez les dates et la durée
5. Confirmez votre réservation

### Créer un espace (Manager uniquement)
1. Allez sur la page "Espaces"
2. Cliquez sur "Ajouter un espace"
3. Remplissez les informations:
   - Nom de l'espace
   - Adresse
   - Coordonnées GPS (latitude/longitude)
   - Capacité
   - Tarif par heure
   - Équipements
   - Note
4. Validez

### Gérer les utilisateurs (Admin uniquement)
1. Allez sur la page "Utilisateurs"
2. Voir la liste de tous les utilisateurs
3. Modifier le rôle d'un utilisateur en cliquant sur l'icône d'édition
4. Supprimer un utilisateur si nécessaire

## Architecture technique

- **Frontend**: React + Tailwind CSS + Motion (animations)
- **Backend**: Supabase Edge Functions avec Hono
- **Base de données**: Supabase KV Store
- **Authentification**: Supabase Auth
- **Routing**: React Router v7

## Rôles et permissions

| Fonctionnalité | Utilisateur | Manager | Admin |
|---------------|------------|---------|-------|
| Voir la carte | ✅ | ✅ | ✅ |
| Réserver un espace | ✅ | ✅ | ✅ |
| Gérer ses réservations | ✅ | ✅ | ✅ |
| Créer des espaces | ❌ | ✅ | ✅ |
| Gérer ses espaces | ❌ | ✅ | ✅ |
| Voir toutes les réservations | ❌ | ❌ | ✅ |
| Gérer les utilisateurs | ❌ | ❌ | ✅ |
| Modifier les rôles | ❌ | ❌ | ✅ |
