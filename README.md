# Progetto Reti Di Calcolatori
Progetto per il corso di Reti di Calcolatori 2020/21 tenuto dal prof. Andrea Vitaletti.

## Configuration
L'applicazione richiede i seguenti servizi:
* CouchDB all'indirizzo localhost:5984;
* RabbitMQ all'indirizzo localhost:5672;  //docker run --name rabbitmq -p 5672:5672 rabbitmq

In particolare in CouchDB devono essere presenti i seguenti database:
* users, per memorizzare gli utenti;
* reviews, per memorizzare le recensioni
* cities, per memorizzare le città


-----------------

## Installation
***
Istruzioni per l'installazione:
```
$ git clone https://github.com/manualex98/Progetto-RetiDiCalcolatori.git
$ cd ../path/to/the/file
$ npm install
$ npm start
```
Aprire un altro terminale per far funzionare il feedback service consumer implementato con RabbitMQ
```
$ cd ../path/to/the/file
$ node feedback_consumer.js
```

-----------------


Utenti test per Facebook:
email: 	test_zreyrfg_user@tfbnw.net
password: Passtest1

-----------------


Link API da documentare:
- OpenTripMap:  https://opentripmap.io/docs#/ + organizzazione categorie: https://opentripmap.io/catalog
- Facebook Oauth: https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow?locale=it_IT