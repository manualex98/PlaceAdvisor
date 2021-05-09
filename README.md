# Progetto-RetiDiCalcolatori
Progetto Reti di Calcolatori 2020/21

## Configuration
L'applicazione richiede i seguenti servizi:
* CouchDB all'indirizzo localhost:5984;
* RabbitMQ all'indirizzo localhost:5672;

In particolare in CouchDB devono essere presenti i seguenti database:
* users, per memorizzare gli utenti;
* reviews, per memorizzare le recensioni;
* feedback, per memorizzare i feedback.


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
