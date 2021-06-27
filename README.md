# Progetto Reti Di Calcolatori
Progetto per il corso di Reti di Calcolatori 2020/21 tenuto dal prof. Andrea Vitaletti.
Studenti: Alessi Manuel e Fortunato Francesco

## Scopo del progetto
La nostra web application **PlaceAdvisor** nasce con l'idea di facilitare la ricerca di punti d'interesse in una determinata zona o città. Un utente dopo aver ottenuto tutte le informazioni utili su un punto d'interesse (indirizzo, mappa, cenni storici e molto altro) può anche visuallizare le recensioni degli altri utenti ed eventualmente aggiurnene una propria.
## Configuration
L'applicazione richiede i seguenti servizi:
* CouchDB all'indirizzo localhost:5984;   //sudo docker run -d --name couchdb -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=admin couchdb
* RabbitMQ all'indirizzo localhost:5672;  //docker run --name rabbitmq -p 5672:5672 rabbitmq

## Architettura di riferimento e tecnologie usate

### Requisiti di progetto
1. Il servizio REST che implementate deve offrire a terze parti delle API documentate;
2. Il servizio si deve interfacciare con almeno due servizi REST di terze parti;
3. Almeno uno dei servizi REST esterni deve essere “commerciale”;
4. Almeno uno dei servizi REST esterni deve richiedere oauth;
5. La soluzione deve prevedere l'uso di protocolli asincroni.

### Tecnologie utilizzate
- Swagger: Per fornire API documentate;
  - Soddisfa il requisito n°1;
- OpenWeatherMap API: Per ottenere il meteo giornaliero di un certo punto d'interesse;
- HERE API: Per ottenere la mappa del punto d'interesse;
- OpenTripMap API: Principale API del servizio, ci permette di ottenere luoghi e dettagli di luoghi;
- Google Photos: Per caricare foto nelle recensioni o nei feedback (con accesso Oauth);
  - Soddisfa il requisito n°3 e insieme alle altre 3 tecnologie sopra il requisito n°2;;
- Facebook: Per accesso al servizio con Oauth e condividere post;
  - Soddisfa il requisito n°4.
- RabbitMQ: Per inviare feedback al feedback consumer;
  - Soddisfa il requisito n°5.
- Web Socket: Logging;
- CouchDB: Data storage;
- OpenSSL: Per ottenere una connessione sicura con https.

Link API usate:
- OpenTripMap:  https://opentripmap.io/docs#/ + organizzazione categorie: https://opentripmap.io/catalog
- Facebook Oauth: https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow?locale=it_IT
- Google Oauth & Google Photos: https://developers.google.com/photos/library/guides/get-started
- HERE API: https://developer.here.com/documentation/maps/3.1.25.0/dev_guide/topics/get-started.html
- OpenWeatherMap API: https://openweathermap.org/current

### Schema
![schema](https://user-images.githubusercontent.com/80718809/123552915-d1bffe00-d778-11eb-82da-a587dd4e50b3.jpg)
## Istruzioni per l'installazione
*!!DA VEDERE SE LASCIARE!!*

**NOTA BENE:** La procedura d'installazione è specifica per macchine con sistema operativo Windows.
Visitare il sito di [Apache CouchDB](https://couchdb.apache.org/), effettuare il download e seguire le procedure d'installazione. Una volta completata l'installazione accedere al servizio digitando in un browser o cliccando su questo link: http://127.0.0.1:5984/_utils. Accedere con username 'admin' e password 'admin' e creare tre database con questi nomi: users, reviews e cities.

*!!DA VEDERE SE LASCIARE!!*

Installare Docker Desktop cliccando su https://www.docker.com/products/docker-desktop e NodeJS su https://nodejs.org/it/download.
Una volta completati questi passaggi possiamo passare alla configurazione del servizio **PlaceAdvisor** (si assume che sia stato installato Git):
Apriamo il terminale ed eseguiamo i seguenti comandi:
```
$ git clone https://github.com/manualex98/PlaceAdvisor.git
$ cd PlaceAdvisor
$ npm install
$ npm start
$ sudo docker-compose up -d
$ sudo docker container ps  //selezionare l'id del container di couchdb
$ sudo docker exec -it <container-name> /bin/bash
$ curl -X PUT http://admin:admin@127.0.0.1:5984/users
$ curl -X PUT http://admin:admin@127.0.0.1:5984/cities
$ curl -X PUT http://admin:admin@127.0.0.1:5984/reviews

```
Questi comandi permetteranno di scaricare i file e di tutti i moduli di NodeJS necessari al funzionamento del servizio che sarà accedibile cliccando su https://localhost:8000, però prima di fare ciò dobbiamo lanciare il server che si occuperà di gestire i feedback degli utenti:
Apriamo un altro terminale per far funzionare il feedback service consumer implementato con RabbitMQ
```
$ cd PlaceAdvisor
$ docker run --name rabbitmq -p 5672:5672 rabbitmq
$ node feedback_consumer.js
```
Ora non rimane che andare su https://localhost:8000 e godersi il servizio!
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



## Istruzioni per il test
Per effettuare un test loggarsi con le seguenti credenziali Facebook:
email: 	test_zreyrfg_user@tfbnw.net
password: Passtest1

Questo utente è uno user test creato direttamente da Facebook for Developers. Una volta effettuato l'accesso e accettato le condizioni si verrà reindirizzati a una pagina che chiederà un username, una volta scelto si arriverà alla Homepage della nostra applicazione. Cliccando su *Il tuo Profilo* verranno visualizzate le informazioni di base e le recensioni/feedback effettuati. Nella Homepage è presente una form per cercare un punto d'interesse, cerchiamo 'Roma' (non è case sentitive), selezionando come categoria Interesting Places (default) e con un raggio di 10 KM da un punto d'interesse all'altro. Avremo come risultato i primi 100 riscontri con sotto ognuno un link che cliccato porta alla pagina dei dettagli del riscontro. 


