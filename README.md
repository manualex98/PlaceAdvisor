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
  - Le 3 tecnologie sopra citate soddisfano il requisito n°2;
- Google Photos: Per caricare foto nelle recensioni o nei feedback (con accesso Oauth);
  - Soddisfa il requisito n°3 e 4.
- Facebook: Per accesso al servizio con Oauth e condividere post;
  - Soddisfa il requisito n°4.
- RabbitMQ: Per inviare feedback al feedback consumer;
  - Soddisfa il requisito n°5.
- Web Socket: Logging;
  - Soddisfa il requisito n°5.
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
WINDOWS: Installare Docker Desktop cliccando su https://www.docker.com/products/docker-desktop e NodeJS su https://nodejs.org/it/download.
UBUNTU: Aprire un terminale ed eseguire sudo apt install docker e sudo apt install nodejs.
Una volta completati questi passaggi possiamo passare alla configurazione del servizio **PlaceAdvisor** (si assume che sia stato installato Git):
Apriamo il terminale ed eseguiamo i seguenti comandi:
```
$ git clone https://github.com/manualex98/PlaceAdvisor.git
$ cd PlaceAdvisor
$ npm install
$ npm start
```
Aprire un secondo terminale per avviare un docker container con l'immagine di CouchDB:
```
$ sudo docker run -d --name couchdb -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=admin couchdb
$ sudo docker container ps  //selezionare l'id del container di couchdb
$ sudo docker exec -it <container-name> /bin/bash
$ curl -X PUT http://admin:admin@127.0.0.1:5984/users
$ curl -X PUT http://admin:admin@127.0.0.1:5984/cities
$ curl -X PUT http://admin:admin@127.0.0.1:5984/reviews
$ exit

```
Aprire un terzo terminale per avviare un docker container con l'immagine Rabbit MQ:
```
$ docker run --name rabbitmq -p 5672:5672 rabbitmq

```
Questi comandi permetteranno di scaricare i file e di tutti i moduli di NodeJS necessari al funzionamento del servizio che sarà accessibile cliccando su https://localhost:8000, però prima di fare ciò dobbiamo lanciare il server che si occuperà di gestire i feedback degli utenti:
Aprire un quarto terminale per far funzionare il feedback service consumer implementato con RabbitMQ
```
$ cd PlaceAdvisor
$ node feedback_consumer.js
```
Ora non rimane che andare su https://localhost:8000 e godersi il servizio!

Per chiudere tutto:
```
$ sudo docker ps  
$ sudo docker rm <couchdb-container>
$ sudo docker rm <rabbitmq-container>
```



## Istruzioni per il test
Per effettuare un test loggarsi con le seguenti credenziali Facebook:
email: 	test_zreyrfg_user@tfbnw.net
password: Passtest1

Questo utente è uno user test creato direttamente da Facebook for Developers. 

-Il primo punto è quello di connettersi alla pagine https://localhost:8000/
-Una volta eseguito l'accesso e accettato le condizioni si verrà reindirizzati a una pagina che ci chiederà di scegliere un username. Una volta scelto, se questo sarà disponibile, si verrà reindirizzati alla Homepage con response status code 200 e verrà inoltre creato e firmato un jwt e un refresh jwt che verranno settati nei cookie, altrimenti verrà chiesto di scegliere un altro username. 
- Cliccando su *Il tuo Profilo* verranno visualizzate le informazioni di base e le recensioni/feedback effettuati. 
- Nella Homepage è presente una form per cercare dei punti d'interesse, inserendo la città (non è case sensitive), una categoria e il raggio limite di distanza da un punto d'interesse all'altro. Verremo dunque reindirizzati alla pagina /app che ci restituirà i primi 100 luoghi di interesse, ognuno dei quali ha un bottone 'dettagli'.
  - Cliccando su 'dettagli' verremo reindirizzati ad una pagina dettagliata del luogo (/details?xid=...). Avremo modo, quindi, di visualizzare l'immagine del luogo, un piccolo paragrafo di Wikipedia, l'indirizzo, il meteo in quel momento nella acittà in cui si trova il luogo, e tutte le recensioni effettuate dagli utenti su quel luogo. Sarà inoltre disponibile un form in cui si potrà aggiungere una recensione con testo e/o foto. Una volta inserito il testo e/o aver selezionato una foto), cliccando 'Aggiungi' verrà effettuata una POST su /review, che eseguirà il caricamento della recensione nel documento dei db User e Reviews. Verremo dunque reindirizzati alla precedente pagina (/details?xid=...) dove avremo modo di vedere la nostra nuova recensione che sarà visibile anche agli altri utenti del sito.
- Nella Homepage cliccando su *Inviaci un feedback* si aprirà una form in cui si può inviare il feedback con testo e/o foto.
- Una volta inviato il feedback, avremo modo anche di visualizzare dalla nostra pagina personale (/info) se il feedback sia stato letto o no.


