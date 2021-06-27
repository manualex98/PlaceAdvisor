//AMQP PROTOCOL
const amqp = require('amqplib');
var app = require('express');
var request = require('request')


connect();
async function connect() {
    
    try {
        const connection = await amqp.connect("amqp://localhost:5672")
        const channel = await connection.createChannel();
        const result = channel.assertQueue("feedback")

        channel.prefetch(1);

        channel.consume("feedback", message => {
            //messaggio:
            const mexdb = message.content.toString();
            const mex = JSON.parse(message.content.toString());

           
            //info.push(item)
            console.log('\r\n---------------------------------------------------')
            console.log('\r\nRicevuto feedback da '+mex.name+'\r\ntesto: '+mex.text +'  con id: '+mex.id);
            console.log('\r\n--------------------------------------------------')

            update(mex.email,mex.id,channel,message) 
            
            
            //ACK
            
            
            
            
            
            
    })

    
    console.log("Aspettando un feedback...")

    }
    catch(error){
        console.error(error);
    }

}

function update(email,id,channel,message){
    request.get('http://admin:admin@127.0.0.1:5984/users/'+email,function callback(error, response, body){
        var data = JSON.parse(body)
            
        for(var i=0; i<data.feedbacks.length;i++){
            if(data.feedbacks[i].feedback_id == id){

                console.log("\r\nModifica dell'id : "+id+"\r\n")

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
                            channel.ack(message)
                        }
                    });
                    
                      
                    
                    
    
            }
        }
    })

}