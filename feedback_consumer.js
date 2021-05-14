//AMQP PROTOCOL
const amqp = require('amqplib');
var app = require('express');
var request = require('request')

let info = []
connect();
async function connect() {
    
    try {
        const connection = await amqp.connect("amqp://localhost:5672")
        const channel = await connection.createChannel();
        const result = channel.assertQueue("feedback")
        channel.consume("feedback", message => {
            //messaggio:
            const mexdb = message.content.toString();
            const mex = JSON.parse(message.content.toString());

            item = {
                "email": mex.email,
                "id": mex.id
            }
            //info.push(item)
            console.log('\r\n---------------------------------------------------')
            console.log('\r\nRicevuto feedback da '+mex.name+'\r\ntesto: '+mex.text +'  con id: '+mex.id);
            console.log('\r\n--------------------------------------------------')

            //ACK
            channel.ack(message);
            
            sleep(1000).then(() => {
                console.log("\r\nHo dormito\r\n")
                update(item)
            });
            
            
    })

    
    console.log("Aspettando un feedback...")

    }
    catch(error){
        console.error(error);
    }

}


function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }


function update(item){
    id = item.id
    email = item.email
        
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
                        }
                    });
                    
                      
                    
                    
    
            }
        }
    })

}