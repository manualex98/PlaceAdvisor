# Progetto Reti Di Calcolatori
Progetto per il corso di Reti di Calcolatori 2020/21 tenuto dal prof. Andrea Vitaletti.

## Configuration
L'applicazione richiede i seguenti servizi:
* CouchDB all'indirizzo localhost:5984;   //sudo docker run -d --name couchdb -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=admin couchdb
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
$ sudo docker-compose up -d
$ sudo docker container ps  //selezionare l'id del container di couchdb
$ sudo docker exec -it <container-name> /bin/bash
$ curl -X PUT http://admin:admin@127.0.0.1:5984/users
$ curl -X PUT http://admin:admin@127.0.0.1:5984/cities
$ curl -X PUT http://admin:admin@127.0.0.1:5984/reviews

```
Per far funzionare anche il feedback
```
$ sudo docker container ps 
$ sudo docker exec -it <container-name> /bin/bash
$ node feedback_consumer.js
```
Per chiudere tutto:
```
$ sudo docker-compose down --remove 
```



-----------------


Utenti test per Facebook:
email: 	test_zreyrfg_user@tfbnw.net
password: Passtest1

-----------------


Link API da documentare:
- OpenTripMap:  https://opentripmap.io/docs#/ + organizzazione categorie: https://opentripmap.io/catalog
- Facebook Oauth: https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow?locale=it_IT
- Google Oauth & Google Photos: https://developers.google.com/photos/library/guides/get-started
- HERE API: https://developer.here.com/documentation/maps/3.1.25.0/dev_guide/topics/get-started.html
- OpenWeatherMap API: https://openweathermap.org/current
