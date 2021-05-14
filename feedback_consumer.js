//AMQP PROTOCOL
const amqp = require('amqplib');
var app = require('express');
var request = require('request')
let db
let id
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
            id = mex.id
            console.log('\r\n---------------------------------------------------')
            console.log('\r\nRicevuto feedback da '+mex.name+'\r\ntesto: '+mex.text);
            console.log('\r\n--------------------------------------------------')

            //ACK
            channel.ack(message);
            request({
                url: 'http://admin:admin@127.0.0.1:5984/users/'+mex.email,
                method: 'GET'
            }, function(error, response, body){
                if(error) {
                    console.log(error);
                } else {
                    db = JSON.parse(body);

                    updateRead(db)
                }
            })
            

        })

    
    console.log("Aspettando un feedback...")

    }
    catch(error){
        console.error(error);
    }

}

function updateRead(data){
    
    for(var i=0; i< data.feedbacks.length;i++){
        if(data.feedbacks[i].feedback_id == id){

            data.feedbacks[i].read=true
            request({
                url: 'http://admin:admin@127.0.0.1:5984/users/'+data.email,
                method: 'PUT',
                headers: {
                  'content-type': 'application/json'
                },
                body: JSON.stringify(data)
              
              }, function(error, response, body){
                if(error) {
                    console.log(error);
                } else {
                    console.log(response.statusCode, body);
                }
              });


        }
    }
  
    
  }