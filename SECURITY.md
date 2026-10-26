# Sécurité du projet

## Signaler un problème en privé

Ne pas divulguer publiquement les failles exploitables, secrets, données d'utilisateurs ou médias privés. Utiliser la fonction de signalement privé de vulnérabilité GitHub lorsqu'elle est disponible ; sinon, contacter le mainteneur par un moyen privé depuis son profil. Ne jamais transmettre de clés API ou d'informations personnelles réelles.

Décrire avec des **données fictives** le composant, les étapes minimales de reproduction, la version concernée et l'impact estimé. Aucun délai de prise en charge n'est garanti.

## Risques spécifiques

Géolocalisation, données cartographiques et tiers : valider les permissions explicites, limiter les positions conservées, contrôler les URL et ne jamais exposer de jetons de fournisseurs. Les flux publics (caméras, ADS-B, météo) peuvent être soumis à des restrictions et une donnée affichée ne constitue pas un signal opérationnel garanti.

## Avant déploiement

- Garder clés, jetons et fichiers `.env` hors de l'historique Git et des interfaces publiques.
- Vérifier l'accès, l'origine des dépendances, les traitements côté serveur, les appels réseau et les autorisations navigateur.
- Tester sur une branche dédiée, examiner le diff et consigner les limitations.
- Ne pas confondre une démonstration publiée avec une application auditée ou certifiée.

[Catalogue Studio Niko Design](https://github.com/Nikoju1977).
