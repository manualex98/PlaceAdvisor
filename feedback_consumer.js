//AMQP PROTOCOL
const amqp = require('amqplib');
var app = require('express');
var request = require('request')
let db

connect();
async function connect() {
    var ndocs;
    try {
        const connection = await amqp.connect("amqp://localhost:5672")
        const channel = await connection.createChannel();
        const result = channel.assertQueue("feedback")
        channel.consume("feedback", message => {
            //messaggio:
            const mexdb = message.content.toString();
            const mex = JSON.parse(message.content.toString());

            console.log('\r\n---------------------------------------------------')
            console.log('\r\nRicevuto feedback da '+mex.name+'\r\ntesto: '+mex.text);
            console.log('\r\n--------------------------------------------------')

            //ACK
            channel.ack(message);
            request({
                url: 'http://admin:admin@127.0.0.1:5984/my_database/feedback',
                method: 'GET'
            }, function(error, response, body){
                if(error) {
                    console.log(error);
                } else {
                    var body = JSON.parse(body);
                    db = body
                    if(!body.error) updateFeedback(mex.name,mex.text)
                    else newFeedback(mex.name,mex.text)
                }
            })
            

        })

    
    console.log("Aspettando un feedback...")

    }
    catch(error){
        console.error(error);
    }

}


function updateFeedback(name,text){
    newItem = {
        "name": name,
        "text": text
      }
    db.feedbacks.push(newItem);

  request({
    url: 'http://admin:admin@127.0.0.1:5984/my_database/feedback',
    method: 'PUT',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(db)
    
  }, function(error, response, body){
      if(error) {
          console.log(error);
      } else {
          console.log(response.statusCode, body);
      }
  });
}

function newFeedback(name,text){
    newItem = {
        "feedbacks": [
            {
                "name": name,
                "text": text
            }
        ]
    }

  request({
    url: 'http://admin:admin@127.0.0.1:5984/my_database/feedback',
    method: 'PUT',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(newItem)
    
  }, function(error, response, body){
      if(error) {
          console.log(error);
      } else {
          console.log(response.statusCode, body);
      }
  });
}