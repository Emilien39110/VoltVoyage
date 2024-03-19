var express = require('express');

const { time } = require('console');
var soap = require('soap');
var axios = require('axios');
const bodyParser = require('body-parser');
const e = require('express');
const app = express();
var http = require('http').Server(app);

var itineraire = null;

const url = 'http://127.0.0.1:8000/?wsdl';
var temps_trajet = 0;
var vehicleList = [];

soap.createClient(url, function(err, client) {
    if (err) {
        console.log(err);
    } else {
        client.temps_trajet({
            distance: 100.0,
            moyenne: 75.0,
            points: 1.0
        }, function(err, result) {
            if (err) {
                console.log(err);
            } else {
                temps_trajet = result.temps_trajetResult;
                //console.log(result.temps_trajetResult);
            }
        });
    }
});

app.use(express.urlencoded({ extended: true }));

app.get('/', function(req, res){
    // res.send('<h1>Hello world</h1>');
    //res.sendFile(__dirname + '/increment.html');
    res.sendFile(__dirname + '/index.html');
});

// app.get('/temps_trajet', function (req, res) {
//     res.status(200).send(temps_trajet.toString());
// });

http.listen(80, function(){
    console.log('listening on *:80');
});

//-------------------------
app.post('/calculer-itineraire', async (req, res) => {
    const depart = req.body.depart;
    const arrivee = req.body.arrivee;
    console.log(depart, arrivee);
    //console.log(depart, arrivee);
    const apiKey = process.env.API_KEY_OPRS;
    const apiUrlDep = `https://api.openrouteservice.org/geocode/search/structured?api_key=${apiKey}&locality=${depart}`;
    const apiUrlArr = `https://api.openrouteservice.org/geocode/search/structured?api_key=${apiKey}&locality=${arrivee}`;

    //Récupération des coordonnées de départ
    const reponse = await axios.get(apiUrlDep);
    const dataDep = reponse.data;
    const coordDep = dataDep.features[0].geometry.coordinates;
    //console.log(coordDep);

    //Récupération des coordonnées d'arrivée
    const reponseArr = await axios.get(apiUrlArr);
    const dataArr = reponseArr.data;
    const coordArr = dataArr.features[0].geometry.coordinates;

    // Appel à l'API OpenRouteService
    const apiUrl = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;
    
    try {
        const openRouteHeader = {
            headers:{
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                'Authorization': apiKey
            },
            body : {
                "coordinates": [
                    coordDep,
                    coordArr
                ]
            }
        };
        const response = await axios.post(apiUrl, openRouteHeader.body, { headers: openRouteHeader.headers });
        const data = response.data;
        //console.log("data : ",data.features[0]);
        const geoPoint = data.features[0].geometry.coordinates;
        itineraire = geoPoint;
        //console.log(itineraire);
        //console.log(geoPoint);
        
        
        const cheminFichierJSON = "bornes-irves.json";
        const nombreDeBornes = 20; 

        const bornesDeRecharge = chargerBornesDeRecharge(cheminFichierJSON);
        const bornesProches = trouverBornesLesPlusProches(itineraire, bornesDeRecharge, nombreDeBornes);
        res.json({
            infoIti : data.features[0],
            bornesProche : bornesProches,
            time_trip : temps_trajet
        });

    } catch (error) {
        console.error('Erreur lors du calcul de l\'itinéraire:', error.message);
        res.status(500).send('Erreur lors du calcul de l\'itinéraire');
    }
});


//-------------------------
// Récupération des modèles de voitures
app.use(bodyParser.json());
app.get('/recuperer-modeles-voitures', async (req, res) => {
    const apiUrl = 'https://api.chargetrip.io/graphql';

    // Définir votre requête GraphQL
    const graphqlQuery = `
        query {
            vehicleList (size:100){
                naming{
                    make
                    model
                    version
                }
                media {
                    image {
                        url
                    }
                }
                range {
                    chargetrip_range {
                        best
                        worst
                    }
                }
            }
        }
    `;

    try {
        // Effectuer une requête POST vers l'API GraphQL de ChargeTrip
        const response = await axios.post(apiUrl, { query: graphqlQuery}, {
            headers: {
                'x-app-id':process.env.APP_ID_CHARGETRIP,
                'x-client-id':process.env.CLIENT_ID_CHARGETRIP
            },
        });

        // Récupérer les données de la réponse
        const data = response.data.data;    
        res.json(data);
        //console.log(data)
    } catch (error) {
        console.error('Erreur lors de la récupération des modèles de voitures:', error.message);
        res.status(500).send('Erreur lors de la récupération des modèles de voitures');
    }
});

const fs = require('fs');
function chargerBornesDeRecharge(cheminFichier) {
    const donnees = fs.readFileSync(cheminFichier);
    return JSON.parse(donnees);
}

// Fonction pour calculer la distance entre deux points géographiques (formule Haversine)
function calculerDistance(lon1, lat1, lat2, lon2) {
    //conversion de lon et lat en float
    const long1 = lon1 ? Number(lon1): NaN;
    const lati1 = lat1 ?Number(lat1): NaN;
    const long2 = lon2 ? Number(lon2): NaN;
    const lati2 = lat2 ?Number(lat2): NaN;
    // console.log(long1);
    // console.log(long2);
    // console.log(lati1);
    // console.log(lati2);


    const R = 6371; // Rayon de la Terre en km
    const dLat = (lati2 - lati1) * Math.PI / 180;

    const dLon = (long2 - long1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lati1 * Math.PI / 180) * Math.cos(lati2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

function trouverBornesLesPlusProches(itineraire, bornesDeRecharge, nombreDeBornes) {
    var bornesUniques = []; // Liste pour stocker les bornes uniques rencontrées
    const coordonneesRencontrees = new Set(); // Ensemble pour stocker les coordonnées déjà rencontrées
    var i = 0;
    // Parcourir les bornes de recharge
    for (const borne of bornesDeRecharge) {
        const coordonnees = (borne.ylatitude, borne.xlongitude);
        // Vérifier si les coordonnées sont déjà rencontrées
        if (!coordonneesRencontrees.has(coordonnees)) {
            i++;
            bornesUniques.push(borne); // Ajouter la borne à la liste des bornes uniques
            coordonneesRencontrees.add(coordonnees); // Mettre à jour les coordonnées rencontrées
            // console.log(coordonneesRencontrees);
        }
    }

    // Calculer les distances entre les points de l'itinéraire et les bornes uniques
    const distancesBorneItineraire = [];
    // console.log(bornesUniques);
    // for (const point of itineraire) {
    for (var i = 0 ; i < itineraire.length ; i += 20){
        for (const borneU of bornesUniques) {
            const distance = calculerDistance(itineraire[i][0], itineraire[i][1], borneU.ylatitude, borneU.xlongitude);
            distancesBorneItineraire.push({ borneU, distance });
        }
    }

    // Trier les distances par ordre croissant
    distancesBorneItineraire.sort((a,b) => a.distance - b.distance );
    var coordBorne = [];
    //console.log(distancesBorneItineraire.length);
    for(var i = 0; i < distancesBorneItineraire.length; i += 10 ){
        var lat = distancesBorneItineraire[i].borneU.ylatitude;
        var lon = distancesBorneItineraire[i].borneU.xlongitude;
        if(distancesBorneItineraire[i].distance<20){
            if(lat != distancesBorneItineraire[i+1].borneU.ylatitude && lon != distancesBorneItineraire[i+1].borneU.xlongitude){
                coordBorne.push(distancesBorneItineraire[i])
            }
        }
    }
    console.log(coordBorne.length);
    ///const bornesLesPlusProches = distancesBorneItineraire.
    // Sélectionner les x bornes les plus proches
    //const bornesLesPlusProches = distancesBorneItineraire.slice(0, nombreDeBornes).map(item => item.borne);
    return coordBorne;
}

app.get('/bornesData', async(req,res) => {
    try {
        const url = "https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/bornes-irve/exports/json?lang=fr&timezone=Europe%2FBerlin";

        const response = await axios.get(url);

        fs.writeFileSync('bornes-irves.json', JSON.stringify(response.data));

        res.send('JSON file downloaded successfully.');
        console.log('JSON file downloaded successfully.');
    }catch(error){
        console.error('Error downloading JSON file: ',error.message);
        res.status(500).send("Error while fecthing the bornes list.")
    }
});
