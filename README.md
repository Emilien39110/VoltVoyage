# VOLTVoyage
## PROJET INFO802 - Architectures orientées Services - Mini-projet 2024  
Emilien BOITOUZET - M1 Informatique - Université Savoie Mont Blanc 2023-2024
  
### Présentation du projet
Le projet consiste à développer une application pour la planification d'un trajet en voiture électrique. L'application doit indiquer les villes dans lequel le conducteur doit s'arréter pour recharger sa voiture.

#### Services utilisés
1. Service Soap qui calcul un temps de trajet en fonction de la distance, de l'autonomie et du temps de charge de la voiture.
2. Service REST qui retourne la liste des prise de rechargement disponnible à proximité de coordonnées GPS.
3. Service REST de cartographie pour afficher le trajet; 
4. Service en GraphQL qui fournit la liste des véhicules avec leur caractéristiques.

Le Front est deployé sur Vercel : https://volt-voyage.vercel.app/
