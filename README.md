# Progetto Reti Di Calcolatori
Progetto per il corso di Reti di Calcolatori 2020/21 tenuto dal prof. Andrea Vitaletti.
Studenti: Alessi Manuel e Fortunato Francesco

## Scopo del progetto
La nostra web application **PlaceAdvisor** nasce con l'idea di facilitare la ricerca di punti d'interesse in una determinata zona o città. Un utente dopo aver ottenuto tutte le informazioni utili su un punto d'interesse (indirizzo, mappa, cenni storici e molto altro) può anche visualizzare le recensioni degli altri utenti ed eventualmente aggiungerne una propria.

## Architettura di riferimento e tecnologie usate

### Requisiti di progetto
- [x] 1. Il servizio REST che implementate deve offrire a terze parti delle API documentate;
- [x] 2. Il servizio si deve interfacciare con almeno due servizi REST di terze parti;
- [x] 3. Almeno uno dei servizi REST esterni deve essere “commerciale”;
- [x] 4. Almeno uno dei servizi REST esterni deve richiedere oauth;
- [x] 5. La soluzione deve prevedere l'uso di protocolli asincroni.

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
  - Soddisfa il requisito n°3 e 4.
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
![Presentazione senza titolo (1)](https://user-images.githubusercontent.com/50673340/124521837-40dcc880-ddf1-11eb-8a11-64c961c7d262.png)



## Istruzioni per l'installazione
<ins>WINDOWS</ins>: Installare Docker Desktop cliccando su https://www.docker.com/products/docker-desktop e NodeJS su https://nodejs.org/it/download.

<ins>UBUNTU</ins>: Aprire un terminale ed eseguire sudo apt install nodejs, sudo apt install docker e sudo apt install docker-compose.
Una volta completati questi passaggi possiamo passare alla configurazione del servizio **PlaceAdvisor** (si assume che sia stato installato Git):
Apriamo il terminale, rechiamoci nella directory in cui vogliamo clonare la repo ed eseguiamo i seguenti comandi:
```
$ git clone https://github.com/manualex98/PlaceAdvisor.git
$ cd /PlaceAdvisor
$ sudo docker-compose up --build
```
A questo punto, eseguendo sudo docker ps, dovremmo visualizzare la lista dei nostri 3 container (placeadvisor_nodejs, rabbitmq e couchdb).

Se i db users, cities e reviews non sono ancora stati inseriti in couchdb, inserirli utilizzando la GUI al sito http://127.0.0.1:5984/_utils (loggarsi con user: admin, pass: admin), oppure eseguire il tutto da terminale:
```
$ sudo docker container ps  //selezionare l'id del container di couchdb
$ sudo docker exec -it <container-name> /bin/bash
$ curl -X PUT http://admin:admin@127.0.0.1:5984/users
$ curl -X PUT http://admin:admin@127.0.0.1:5984/cities
$ curl -X PUT http://admin:admin@127.0.0.1:5984/reviews
$ curl -X PUT http://admin:admin@127.0.0.1:5984/_users
$ curl -X PUT http://admin:admin@127.0.0.1:5984/_replicator
$ curl -X PUT http://admin:admin@127.0.0.1:5984/_global_changes
$ exit
```
Questi comandi permetteranno di scaricare i file, di configurare il nostro db se è il primo avvio e di scaricare tutti i moduli di NodeJS necessari al funzionamento del servizio che sarà accessibile cliccando [qui](https://localhost:8000).
Aprire un terzo terminale per far funzionare il feedback service consumer implementato con RabbitMQ eseguire:
```
$ cd PlaceAdvisor
$ node feedback_consumer.js
```
Ora non rimane che andare su https://localhost:8000 e godersi il servizio!

Per chiudere tutto:
```
$ ^[C]
$ sudo docker-compose down --remove
```
E, sul terminale in cui è in running il file feedback_consumer.js, digitare  ` $ ^[C] `


## Istruzioni per il test
Per effettuare un test loggarsi con le seguenti credenziali Facebook:

email: 	harry_ewleruo_valtchanovwitz@tfbnw.net

password: testtest1

Questo utente è uno user test creato direttamente da Facebook for Developers. 


- Il primo punto è quello di connettersi alla pagina https://localhost:8000/. Verrà visualizzata la pagina di accesso: 

![image](https://user-images.githubusercontent.com/50673340/124497558-4ae3d480-ddbb-11eb-859b-6c6e44392392.png)

- Una volta eseguito l'accesso e accettato le condizioni si verrà reindirizzati a una pagina che ci chiederà di scegliere un username.

![image](https://user-images.githubusercontent.com/50673340/124497876-d1001b00-ddbb-11eb-94f6-a557ce7e76f6.png)

- Una volta scelto, se questo sarà disponibile, si verrà reindirizzati alla Homepage con response status code 200 e verrà inoltre creato e firmato un jwt e un refresh jwt che verranno settati nei cookie, altrimenti verrà chiesto di scegliere un altro username. 

![Homepage](https://user-images.githubusercontent.com/50673340/123555798-42bae200-d788-11eb-906c-4531dcad3d16.png)

- Cliccando su *Accedi con Google Photos* partirà il flusso OAuth di Google. Si potrà dunque accedere con il proprio account Google e si dovrà dare la propria autorizzazione per poter accedere in modalità sola lettura alle proprie foto presenti nel proprio archivio di Google Photos. Questo passaggio è indispensabile per poter condividere le proprie foto nelle recensioni (o nei feedback). Se l'accesso andrà a buon fine, verrà settato un cookie criptato: il google access token. Verrà utilizzato per accedere alle risorse presenti su google photos.
- Cliccando su *Il tuo Profilo* verranno visualizzate le informazioni di base e le recensioni e/o feedback effettuati. 
- Nella Homepage è presente una form per cercare dei punti d'interesse, inserendo la città (non è case sensitive), una categoria e il raggio limite di distanza dal centro della città. Verremo dunque reindirizzati alla pagina list_places.ejs che ci restituirà i primi 100 luoghi di interesse, ognuno dei quali ha un bottone *dettagli*.
  - Cliccando su *dettagli* verremo reindirizzati ad una pagina dettagliata del luogo (/details?xid=...). Avremo modo, quindi, di visualizzare l'immagine del luogo, un piccolo paragrafo di Wikipedia, l'indirizzo, il meteo in quel momento nella città in cui si trova il luogo, e tutte le recensioni effettuate dagli utenti su quel luogo. Sarà inoltre disponibile una form in cui si potrà aggiungere una recensione con testo e/o foto. Una volta inserito il testo (e aver selezionato una foto), cliccando *Aggiungi* verrà effettuata una POST su /review, che eseguirà il caricamento della recensione nel documento dei db *users* e *reviews*. Verremo dunque reindirizzati alla precedente pagina (/details?xid=...) dove avremo modo di vedere la nostra nuova recensione che sarà visibile anche agli altri utenti del sito.
- Nella Homepage cliccando su *Inviaci un feedback* si aprirà una form in cui si può inviare il feedback con testo e/o foto.
- Una volta inviato il feedback, avremo modo anche di visualizzare dalla nostra pagina personale (/info) se il feedback sia stato letto o no.


