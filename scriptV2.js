//DEPENDENCIES
const request = require('request');
const moment = require('moment');
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}



//CONFIG
const DATELIMITE = moment('31/08/2017', 'DD/MM/YYYY');
let domains = [];



//FUNCTIONS
let redditCall = (after)=>{
    // /!\ Au premier appel, il n'y a pas d'argument.
    let arguments;
    if(after){
        arguments = '&&after='+after;
    }else{
        arguments = '';
    }
    let path = 'https://www.reddit.com/r/programming.json?t=day'+arguments;


    return new Promise((resolve, reject)=>{
        request(path, (err, res, content) => {
            if (err) reject(err);

            content = JSON.parse(content);
            resolve(content.data);
        });
    });
};


//EVENT
const loopRequest = new MyEmitter();
/*Boucle + Promesse = Evenement qui se rappel lui-même
 Si cette methode est moins efficace en terme de rapidité, elle permet de ne pas s'interroger
 sur la taille de mon tableau final par avance.*/

loopRequest.on('next', (after) => {
    /*CHANGEMENT V2 :
    Le resultat que je pousse est une promesse, je veux pouvoir vérifier qu'il est terminé*/
    domains.push(redditCall(after).then((res, err)=>{
        let isStop = true;
        let result = false;

        res.children.forEach((value)=>{
            if(moment(value.data.created*1000).isAfter(DATELIMITE, 'day')){
                /*Je n'ai pas réussi a obtenir un tri satisfaisant des pages de reddit,
                 les plage de dates restaient toujours différentes d'une page à l'autre,
                 j'ai décidé de continuer tant que dans la page courante je trouvais une date valide
                 et de n'afficher que les domains de ces dates*/
                isStop = false;
                result = value.data.domain;
            }
        });

        if(!isStop){
            loopRequest.emit('next', res.after);
        }else{
            loopRequest.emit('end');
        }

        return result
    }))
});


loopRequest.on('end', () => {
    /*CHANGEMENT V2 :
     Je dois vérifier que tous mes résultats ont terminé de charger !*/
    Promise.all(domains).then((result)=>{
        //Quand j'ai terminé, je supprime les domaines redondant de mon tableau.
        let display = result.filter((domain, i)=>{
            return result.indexOf(domain) == i;
        });

        //Je les affiche:
        display.forEach((domain)=>{
            if(domain != false){
                console.log(domain);
            }
        });
    });
});

//Pour lancer le premier évènement:
loopRequest.emit('next');

