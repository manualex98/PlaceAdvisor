//AMQP PROTOCOL
const amqp = require('amqplib');
var app = require('express');
var request = require('request')

connect();
async function connect() {
    var ndocs;
    try {
        const connection = await amqp.connect("amqp://localost:5672")
        const channel = await connection.createChannel();
        const result = channel.assertQueue("feedback")
        channel.consume("feedback", message => {
            //messaggio:
            const mexdb = message.content.toString();
            const mex = JSON.parse(message.content.toString());
            console.log(mex.text);
            //ACK
            channel.ack(message);
            request({
                url: 'http://admin:admin@127.0.0.1:5984/feedback',
                method: 'GET'
            }, function(error, response, body){
                if(error) {
                    console.log(error);
                } else {
                    var body = JSON.parse(body);
                    ndocs = body.doc_count +1;
                    request({
                        url: 'http://admin:admin@127.0.0.1:5984/feedback/'+ndocs,
                        method: 'PUT',
                        headers: {
                          'content-type': 'application/json'
                        },
                        body: JSON.stringify(mex)
                        
                      }, function(error, response, body){
                          if(error) {
                              console.log(error);
                          } else {
                              console.log(response.statusCode, body);
                          }
                      });
                }
            })
            

        })
    console.log("Waiting for message. . .")

    }
    catch(error){
        console.error(error);
    }

}