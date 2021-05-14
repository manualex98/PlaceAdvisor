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
            id=mex.id
            
            console.log('\r\n---------------------------------------------------')
            console.log('\r\nRicevuto feedback da '+mex.name+'\r\ntesto: '+mex.text +'  con id: '+id);
            console.log('\r\n--------------------------------------------------')

            //ACK
            channel.ack(message);
            update()

    })

    
    console.log("Aspettando un feedback...")

    }
    catch(error){
        console.error(error);
    }

}


function update(email,id){
    request.get('http://admin:admin@127.0.0.1:5984/users/'+email,function callback(error, response, body){
            var data = JSON.parse(body)
            
            for(var i=0; i<data.feedbacks.length;i++){
                if(data.feedbacks[i].feedback_id == id){
                    console.log("\r\nSI\r\n")
                    data.feedbacks[i].read=true
                    request({
                        url: 'http://admin:admin@127.0.0.1:5984/users/'+email,
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
    })
    
}