var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const path = require('path');
var request = require('request');
const { ADDRGETNETWORKPARAMS } = require('dns');
var amqp = require('amqplib'); //Protocollo amqp per rabbitmq
const imageToBase64 = require('image-to-base64'); //Usato per codificare le immagini in base-64
const WebSocket = require('ws');  
const swaggerJsDoc= require('swagger-jsdoc');
const swaggerUi= require('swagger-ui-express');
require('dotenv').config()

//dico a node di usare il template engine ejs e setto la cartella views per i suddetti file
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


//Extended https://swagger.io/specification/
const swaggerOptions = {
  definition: {
    openapi: '3.0.1',
    info: {
      title: "PlaceAdvisor",
      description: "Web App che permette di trovare e recensire luoghi di ogni tipo",
      contact: {
        name: "Alessi Manuel, Fortunato Francesco, Lai Simona",
      },
    },
    servers: [{
      url: "http://localhost:8000"
    }],
  },

  apis: ["server.js"]
}

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));


const wss = new WebSocket.Server({ port:8080 });

wss.on('connection', function connection(ws) {
  console.log('A new client Connected!');
  ws.send('Welcome New Client!');

  ws.on('message', function incoming(message) {
    console.log('received: %s', message);

    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    
  });
});



var ftoken="";
var gtoken="";
var code="";
let fconnected=false;
let fconnecting=false;
let gconnected=false;
let gconnecting=false;
let lconnected=false;
let username;
let email
var fbinfo;
var codice;
var feedbackposting=false;
var xid='';


// Routes
/**
 * @swagger
 *components:
 *  schemas:
 *    Review:
 *      type: object
 *      properties:
 *        codice:
 *          type: integer
 *        posto:
 *          type: string
 *        xid:
 *          type: string
 *        name:
 *          type: string
 *        text:
 *          type: string
 *        date:
 *          type: string
 *        photo:
 *          type: string
 *          format: byte
 * 
 *    Feedback:
 *      type: object
 *      properties:
 *        feedback_id:
 *          type: integer
 *        date:
 *          type: integer
 *          format: date-time
 *        text:
 *          type: string
 *        read: 
 *          type: boolean
 *        photo:
 *          type: string
 *          format: byte
 * 
 *    User:
 *      type: object
 *      properties:
 *        id:
 *          type: string
 *          format: email
 *        name: 
 *          type: string
 *        surname: 
 *          type: string
 *        email:
 *          type: string
 *          format: email
 *        username:
 *          type: string
 *        picture:
 *          type: object
 *          properties:
 *            url:
 *              type: string
 *            height:
 *              type: integer
 *            width:
 *              type: integer        
 *        reviews:
 *          type: array
 *          items:
 *            $ref: "#/components/schemas/Review"
 *        feedbacks:
 *          type: array
 *          items:
 *            $ref: "#/components/schemas/Feedback"
 *      required:
 *        - id
 *        - name
 *        - surname
 *        - email
 *        - username
 *        - picture
 *        - reviews
 *        - feedbacks
 *      example:
 *        id: test_zreyrfg_user@tfbnw.net
 *        name: Test
 *        surname: User
 *        email: test_zreyrfg_user@tfbnw.net
 *        username: admin
 *        picture: 
 *          url: https://scontent.fbri2-1.fna.fbcdn.net/v/t1.30497-1/cp0/c15.0.50.50a/p50x50/84628273_176159830277856_972693363922829312_n.jpg?_nc_cat=1&ccb=1-3&_nc_sid=12b3be&_nc_ohc=a1FpfWt5x6AAX91xNSJ&_nc_ht=scontent.fbri2-1.fna&tp=27&oh=4fcc1133fc4c4add1bb1acbab9a03686&oe=60D166B8
 *          height: 50
 *          width: 50
 *        reviews:
 *          - codice: 1621946497140
 *          - Posto: Hypogeum of the Aurelii
 *          - xid: N3594410888
 *          - name: admin
 *          - text: dbbs
 *          - date: 25/5/2021
 *          - photo:  
 *        feedbacks: 
 *          - feedback_id: 2740
 *          - date: 2021-05-25T12:44:14.418Z
 *          - text: bfsbdsbs
 *          - read: false
 *          - photo: 
 *        
 *   
 *  
 */

/**
 * @swagger
 * paths:
 *  /:
 *    get:
 *      tags: [Root]
 *      responses:
 *        200: 
 *          description: restituisce la pagina index.ejs
 *    post:
 *      tags: [Facebook OAuth]
 *      requestBody:
 *        required: true
 *        content:
 *          application/x-www-form-urlencoded:
 *            schema:
 *              type: object
 *              properties:
 *                sub:       
 *                  type: string
 *              example: Accedi con Facebook
 *      responses:
 *        200:
 *          description: ok
 * 
 *  /facebooklogin:
 *    get:
 *      tags: [Facebook OAuth]
 *      responses:
 *        202:
 *          description: OK
 * 
 *  /googlelogin:
 *    get:
 *      tags: [Google OAuth]
 *      responses:
 *        200: 
 *          description: OK
 * 
 * 
 *  /homepage:
 *    get:
 *      tags: [Home]
 *      parameters:
 *        - in: query
 *          name: code
 *          schema:
 *            type: string
 *            description: Authentication Code ricevuto da Google/Fb
 *      responses:
 *        200: 
 *          description: HTML HOMEPAGE
 *        403:
 *          description: Error 403. User not authenticated
 * 
 * 
 *  /gtoken:
 *    get:
 *      tags: [Google OAuth]
 *      parameters:
 *        - in: query
 *          name: code
 *          required: true
 *          schema:
 *            type: string
 *            description: Authentication Code ricevuto da Google
 *      responses:
 *        200:
 *          description: HTML token page
 *        404:
 *          description: Invalid Grant, malformed auth code.
 * 
 *  /ftoken:
 *    get:
 *      tags: [Facebook OAuth]
 *      parameters:
 *        - in: query
 *          name: code
 *          required: true
 *          schema:
 *            type: string
 *            description: Authentication Code ricevuto da Facebook
 *      responses:
 *        200:
 *          description: reindirizza a /fb_pre_access
 *        404:
 *          description: Error.
 *  
 *  /fb_pre_access:
 *    get:
 *      tags: [Facebook OAuth]
 *      responses:
 *        200:
 *          description: reindirizza alla homepage
 * 
 *  /info:
 *    get:
 *      tags: [User]
 *      responses:
 *        200:
 *          description: HTML user_info
 *        403:
 *          description: HTML error page. user not authenticated
 *  
 *  /signup:
 *    get:
 *      tags: [Signup]
 *      responses:
 *        200:
 *          description: restituisce la pagina signup.ejs
 * 
 *  /fsignup:
 *    get:
 *      tags: [Facebook OAuth]
 *      responses:
 *        200:
 *          description: reindirizza alla homepage
 * 
 *  /city_info:
 *    get:
 *      tags: [City info]
 *      responses:
 *        200:
 *          description: restituisce la pagina city_stat.ejs
 *  /app:
 *    get:
 *      tags: [App]
 *      responses:
 *        200:
 *          description: restituisce la pagina list_places.ejs
 *        404:
 *          description: Error
 *  /openmap:
 *    post:
 *      tags: [Open Trip Map]
 *      requestBody:
 *        required: true
 *        content:
 *          application/x-www-form-urlencoded:
 *            schema:
 *              type: object
 *              properties:
 *                sub:       
 *                  type: string
 *              example: 
 *      responses:
 *        200:
 *          description:
 *    
 *  /details:
 *    get:
 *      tags: [Details]
 *      responses:
 *        200:
 *          description: restituisce la pagina details
 *        404:
 *          description: Error
 * 
 *  /googlephotoapi:
 *    get:
 *      tags: [Google photo]
 *      responses:
 *        200:
 *          description: restituisce la pagina gphotos.ejs
 *        404:
 *          description: Error
 * 
 *  /logout:
 *    get:
 *      tags: [Logout]
 *      responses:
 *        200:
 *          description: restituisce la pagina logout.ejs
 *        404: 
 *          description: Error
 *    post:
 *      tags: [Logout]
 *      requestBody:
 *        required: true
 *        content:
 *          application/x-www-form-urlencoded:
 *            schema:
 *              type: object
 *              properties:
 *                sub:       
 *                  type: boolean
 *              example: 
 *      responses:
 *        200:
 *          description: reindirizza alla pagina index.ejs
 * 
 *  /reviews:
 *    post:
 *      tags: [Reviews]
 *      requestBody:
 *        required: true
 *        content:
 *          application/x-www-form-urlencoded:
 *            schema:
 *              type: object
 *              properties:
 *                sub:       
 *                  type: 
 *              example: 
 *      responses:
 *        200:
 *          description: permette di creare o aggiornare una recensione
 * 
 *  /elimina:
 *    get:
 *      tags: [Reviews]
 *      responses:
 *        200:
 *          description: permette di eliminare una recensione
 *        404: 
 *          description: Error
 * 
 *  /newfeedback:
 *    get:
 *      tags: [Feedback]
 *      responses:
 *        200:
 *          description: restituisce la pagina feedback.ejs
 *    post:
 *      tags: [Feedback]
 *      requestBody:
 *        required: true
 *        content:
 *          application/x-www-form-urlencoded:
 *            schema:
 *              type: 
 *              properties:
 *                sub:       
 *                  type: 
 *              example: 
 *      responses:
 *        200:
 *          description:
 * 
 *  /feedback:
 *    post:
 *      tags: [Feedback]
 *      requestBody:
 *        required: true
 *        content:
 *          application/x-www-form-urlencoded:
 *            schema:
 *              type: object
 *              properties:
 *                sub:       
 *                  type: 
 *              example: 
 *      responses:
 *        200:
 *          description: restituisce la pagina feedback.ejs
 * 
 *  /bootstrap.min.css:
 *    get:
 *      tags: [Bootstrap]
 *      responses:
 *        200:
 *          description:
 * 
 *  /error:
 *    get:
 *      tags: [Error]
 *      responses:
 *        200:
 *          description: restituisce la pagina error.ejs
 * 
 *  
 *     
 * 
 *  
 */



app.get('/',function (req,res){
  if (fconnected){
    res.redirect('/homepage');
  }
  else{
    res.render('index', {check: false, registrazione: false});
  }
});


app.post('/',function (req,res){
  if(req.body.sub == 'Accedi con Facebook'){
    res.redirect('/facebooklogin')
  }
  else {
    res.redirect(404, '/error?statusCode=404')
  }
})

app.post('/userinfo', function(req,res){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+req.body.email,
    method: 'GET',
    headers: {
      'content-type': 'application/json'
    },
    
  }, function(error, response, body){
      if(error) {
          console.log(error);
      } else {
          console.log(response.statusCode, body);
          infousers=JSON.parse(body);

          if (!infousers.error){                  //Controlla se è presente già un documento nel db
            res.render('signup', {check: false})  //Se c'è si deve scegliere un altro username
          }
          else{
            newUser(req,res)                    //Altrimenti si effettua la registrazione
          }
          
      }
    });
  });
let user;
let check;


function gestisciAccessoLocale(req,res){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+req.body.email,
    method: 'GET',
    headers: {
      'content-type': 'application/json'
    },
    
  }, function(error, response, body){
      if(error) {
          console.log(error);
      } else {
          console.log(response.statusCode, body);
          user=JSON.parse(body);

          //AUTENTICAZIONE
          if (user.email==req.body.email && user.password==req.body.password){
            username=user.username
            email= user.email
            lconnected=true
            res.render('homepage', {gconnected: false ,username: username, fconnected:false});
          }
          else{
            res.render('index', {check: true, registrazione: false});
          }
      }      
    });
  
}

function newUser(req,res){

  body={
  
      "name": req.body.name,
      "surname": req.body.surname,
      "email": req.body.email,
      "username": req.body.username,
      "password": req.body.password,
      "picture": {
        "url": "",
        "height": 0,
        "width": 0
      },
      "reviews": [],
      "feedback":[]
    
  };
  
  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+req.body.email,
    method: 'PUT',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
    
  }, function(error, response, body){
      if(error) {
          console.log(error);
      } else {
          console.log(response.statusCode, body);
          res.render('index', {check:false, registrazione: true});
      }
  });
}


app.get('/facebooklogin',function (req,res){
  fconnecting=true;
  res.status(201).redirect("https://www.facebook.com/v10.0/dialog/oauth?scope=email,public_profile&client_id="+process.env.FB_CLIENT_ID+"&redirect_uri=http://localhost:8000/homepage&response_type=code");
});

app.get('/googlelogin', function(req, res){
  gconnecting=true;
  if (req.query.length>0){
    xid = req.query.xid;  //se si entra dalla pagina delle review, si ritornerà poi a quella pagina, quindi salvo xid
    res.redirect("https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A//www.googleapis.com/auth/photoslibrary.readonly&access_type=offline&include_granted_scopes=true&response_type=code&redirect_uri=http://localhost:8000/homepage&client_id="+process.env.G_CLIENT_ID);
  }
  else{ 
    res.redirect("https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A//www.googleapis.com/auth/photoslibrary.readonly&access_type=offline&include_granted_scopes=true&response_type=code&redirect_uri=http://localhost:8000/homepage&client_id="+process.env.G_CLIENT_ID);
  }
})

app.get('/signup', function(req, res){
  res.render('signup.ejs',{check: check});
});

app.get('/homepage', function (req,res){
  if (req.body!=''){  
    code=req.query.code;  
  }
  //check sessioni fb e google
  if (!gconnecting){
    if(fconnecting){
      if(fconnected){
        res.render('homepage', {fconnected:fconnected, gconnected:gconnected, username:username})
      }
      else{
        res.status(201).redirect('/ftoken?code='+code);
      }
    }
    else{
      res.redirect(403, '/error?statusCode=403')
    }
  }
  else if(gconnecting){
    if ( !gconnected){
      res.redirect('/gtoken?code='+code);
    }
    else if(gconnected){
      res.render('homepage', {fconnected: fconnected, gconnected:gconnected, username: username}) //Ancora da implementare
    }
 
  }

  else if(lconnected) res.render('homepage', {fconnected:fconnected, gconnected:gconnected, username:username})
  else res.render('index', {check:false, registrazione: false});
})

//acquisisci google token
app.get('/gtoken', function(req, res){
  console.log(req.query.code)
  code = decodeURIComponent(req.query.code)

  var formData = {
    code: code,
    client_id: process.env.G_CLIENT_ID,
    client_secret: process.env.G_CLIENT_SECRET,
    redirect_uri: "http://localhost:8000/homepage",
    grant_type: 'authorization_code'
  }
  request.post({url:'https://www.googleapis.com/oauth2/v4/token', form: formData}, function optionalCallback(err, httpResponse, body) {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', body);
    var info = JSON.parse(body);
    if(info.error != undefined){
      res.redirect(404, '/error?statusCode=404' );
    }
    else{
      gtoken = info.access_token; //prendo l'access token
      gconnected = true;
      console.log("Got the token "+ info.access_token);
      res.render('continue.ejs', {gtoken : gtoken, gconnected:gconnected, feedbackposting: feedbackposting, xid:xid}) 
           
    }
  })
})


//acquisici fbtoken
app.get('/ftoken',function (req,res){
  code = decodeURIComponent(code)
  
  var formData = {
    code: code,
    client_id: process.env.FB_CLIENT_ID,
    client_secret: process.env.FB_SECRET_KEY,
    redirect_uri: "http://localhost:8000/homepage",
    grant_type: 'authorization_code'
  }
  request.post({url:'https://graph.facebook.com/v10.0/oauth/access_token?', form: formData}, function callback(err, httpResponse, body) {

    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', body);
    var info = JSON.parse(body);
    if(info.error != undefined){
      res.redirect(404, 'error');
    }
    else{
      ftoken = info.access_token;
      fconnected = true;
      res.redirect('fb_pre_access')
    }
  });
});

var fbinfo;

app.get('/fb_pre_access',function (req,res){
  var url = 'https://graph.facebook.com/me?fields=id,first_name,last_name,picture,email&access_token='+ftoken
  var headers = {'Authorization': 'Bearer '+ftoken};
  var request = require('request');

  request.get({
    headers: headers,
    url:     url,
    }, function(error, response, body){
      console.log(body);
      body1 = JSON.parse(body);
      var stringified = JSON.stringify(body1);
      stringified = stringified.replace('\u0040', '@');
      var parsed =JSON.parse(stringified);
      email = parsed.email
      fbinfo=parsed
      //CONTROLLO SE ESISTE L'UTENTE NEL DB
      request({
        url: 'http://admin:admin@127.0.0.1:5984/users/'+email,
        method: 'GET',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(body1)
  
        }, function(error, response, body){
          if(error) {
            console.log(error);
          } else {
            console.log(response.statusCode, body);
            var info = JSON.parse(body)
                        
            if(info.error){
              res.redirect('fbsignup') //Utente non esiste quindi lo faccio registrare
            }
            else{
              username=info.username
              res.redirect('homepage')  //Utente esiste, può accedere
            }
          }
      });
    });
})










app.get('/fbsignup', function(req,res){
  res.render('fbsignup', {fconnected: fconnected,check: false,username: username,ftoken:ftoken});
})
app.post('/fbsignup',function (req,res){
  username = req.body.username
  
  body1={
    
    "name": fbinfo.first_name,
    "surname": fbinfo.last_name,
    "email": email,
    "username": username,
    "picture": {
      "url": fbinfo.picture.data.url,
      "height": fbinfo.picture.data.height,
      "width": fbinfo.picture.data.width
    },
    "reviews": [],
    "feedbacks":[]
  
};

  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+email,
    method: 'PUT',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body1)
  
  }, function(error, response, body){
      if(error) {
        console.log(error);
      } else {
        console.log(response.statusCode, body);
        res.render('homepage', {fconnected: fconnected,username: username,gconnected:gconnected});
      }
  });

});







app.get('/info', function(req, res){

  //Prendo le informazioni dell'utente nel db per la visualizzazione
  if (fconnected && fbinfo!=undefined){
    request.get('http://admin:admin@127.0.0.1:5984/users/'+email, function callback(error, response, body){
      var data = JSON.parse(body)
      res.render('user_info', {data: data});
    })
    
  }
  else if(lconnected){
    request.get('http://admin:admin@127.0.0.1:5984/users/'+email, function callback(error, response, body){
      var data = JSON.parse(body)
      res.render('user_info', {data: data});
    })
  }
  else{
    res.redirect(403, '/error?statusCode=403')
  }
  
})
    
//API Open Trip Map Places
let lon;
let lat;
let city;
let rad;
let cate;

app.post('/openmap', function(req,res){   
  city = req.body.city;
  rad = parseFloat(req.body.rad)*1000;
  cate = req.body.cat;
  checkCity(city)                       //aggiungo (aggiorno) la città cercata nel db 'cities'
  
  var options = {
    url: 'https://api.opentripmap.com/0.1/en/places/geoname?format=geojson&apikey='+process.env.OpenMap_KEY+'&name='+city
  }
  
  request.get(options,function callback(error,response, body){
    
    var info = JSON.parse(body);
    
    lat = parseFloat(info.lat);
    lon = parseFloat(info.lon);
    
    res.redirect('/app');
  }); 
});


function checkCity(city){               //funzione che esegue un check all'interno del db cities per vedere se esiste un doc col nome della città 'city'
  request.get('http://admin:admin@127.0.0.1:5984/cities/'+city, function callback(error, response, body){
    var data = JSON.parse(body)
      if(data.error){
        newRegisterCity(city)
      }
      else{ updateRegisterCity(city,data) }
  })
}

function newRegisterCity(city){         //funzione che salva una nuova città
    body1 = {
          "name": city,
          "search": 1
        }
    request({
          url: 'http://admin:admin@127.0.0.1:5984/cities/'+city,
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(body1)
          }, function(error, response, body){
            if(error) {
              console.log(error);
            } else {
              var info = JSON.parse(body)
              console.log("Città creata")
            }
    })


}

function updateRegisterCity(city,data){             //funzione che aggiorna il numero di ricerche di una città
  data.search+=1
  request({
          url: 'http://admin:admin@127.0.0.1:5984/cities/'+city,
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(data)
          }, function(error, response, body){
            if(error) {
              console.log(error);
            } else {
              var info = JSON.parse(body)
              console.log("Città aggiornata")
            }
  })
}


app.get('/city_info', function(req,res){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/cities/_all_docs?include_docs=true&limit=10',
    method: 'GET',
    headers: {
      'content-type': 'application/json'
    },
    
  }, function(error, response, body){
    if(error){console.log(error)}
    else{
      console.log(body)
      var data = JSON.parse(body)
      
      var list_city = new Array()                      //Popolo un array con i documenti del db
      for(var i=0; i<data.total_rows;i++){
        list_city.push(
          {
            "city": data.rows[i].doc.name,
            "search": data.rows[i].doc.search
          }
        )
      }
      
      list_city.sort(                         //Lo ordino in base a quante volte sono stati cercati gli elementi
        function(a, b){
          return b.search - a.search
        }
      )

      res.render('city_stat',{data:list_city})
    }
  })
})

app.get('/app', function(req,res){
  if(!fconnected){
    res.redirect(404, '/error?statusCode=404')
    return
  }
  else{
  var options ={
    url: 'https://api.opentripmap.com/0.1/en/places/radius?format=geojson&apikey='+process.env.OpenMap_KEY+'&radius='+rad+'&lon='+lon+'&lat='+lat+'&kinds='+cate+'&limit='+100
  }
  request.get(options, (error, req, body)=>{
    var info = JSON.parse(body);
    //console.log(body)
    data = info.features;
    
    if (data==undefined){
      console.log('Non è stato cercato bene')
      res.redirect('/homepage')
    }
    else{
      n = data.length;
      cate = cate.replace('_', ' ');
      res.render('list_places', {numero: n, data: data, cat: cate, citta: city});
    }
  })
}
});


let info
let place_name
let infodb
let info_weather
let meteo
let icon_id
let icon_url

app.get('/details', function(req,res){
  if(!fconnected){
    res.redirect(404, '/error?statusCode=404')
  }
  else{
    console.log(req.query)
  if (Object.keys(req.query).length > 1){

    var photo =req.query.baseUrl;
  }
  else{
    var photo = '';
  }

  xid = req.query.xid;

  var weather = {
    url: 'https://api.openweathermap.org/data/2.5/weather?lat='+lat+'&lon='+lon+'&appid='+process.env.OpenWeatherMap_KEY+'&lang=it'
  }
  
  var options = {
    url: 'https://api.opentripmap.com/0.1/en/places/xid/'+xid+'?apikey='+process.env.OpenMap_KEY
  }
  
  request.get(options,function callback(error, response, body){
    info = JSON.parse(body);
    place_name=info.name
    console.log('\r\n'+place_name+'\r\n')
    request.get('http://admin:admin@127.0.0.1:5984/reviews/'+xid, function callback(error, response, body){
      if(error) {
        console.log(error);
      } else {
        console.log(response.statusCode, body);
        infodb = JSON.parse(body);
        request.get(weather, function callback(error,response, body){
          info_weather=JSON.parse(body);
          console.log(info_weather);
          meteo=info_weather.weather[0].description;
          icon_id=info_weather.weather[0].icon;
          //console.log(meteo);
          //console.log(icon_id);
          icon_url="http://openweathermap.org/img/wn/"+icon_id+"@2x.png"
          if(infodb.error){
            reviews_check=false     //Non ci sono recensioni
            res.render('details', {gconnected : gconnected, fconnected: fconnected,info: info, xid: xid, lat: info.point.lat , lon: info.point.lon, api: process.env.HERE_API, reviews: "", photo:photo, info_weather:meteo, icon_id:icon_id, icon_url:icon_url});
          } 
          else{
            
            reviews_check=true     //Ci sono recensioni
            res.render('details', {gconnected : gconnected, fconnected:fconnected,info: info, xid: xid, reviews: infodb.reviews,n: infodb.reviews.length,lat: info.point.lat , lon: info.point.lon, api: process.env.HERE_API, photo: photo, info_weather:meteo, icon_id:icon_id, icon_url:icon_url});
          }
        })
        
      }

    });

  });
  }
  
});

//Google Photos API

var numpag;
app.get('/googlephotosapi', function(req,res){
  if(!gconnected){
    res.redirect(404, '/error?statusCode=404')
  }
  if (req.query.stato == 'feed'){
    feedbackposting=true;   //ritornerà la foto nel feedback
  }
  queryxid = req.query.xid;
  querynextpg = req.query.nextpg;
  var url = 'https://photoslibrary.googleapis.com/v1/mediaItems:search'
	var headers = {'Authorization': 'Bearer '+gtoken};    //setto gli headers passando al sito il token
  var request = require('request');
  if (querynextpg!=undefined && querynextpg!=''){   //se ci troviamo alla pagina 2+
    numpag= numpag+1;
    request.post({
      headers: headers,
		  url:     url,
      body:    {
        "pageToken": querynextpg,
        "filters": {
          "mediaTypeFilter": {
            "mediaTypes": [
              "PHOTO"
            ]
          }
        }
      },
      json:true
		  }, function(error, response, body){
        console.log(JSON.stringify(body));
        info = JSON.parse(JSON.stringify(body));
      if (queryxid!=''){  //la foto si sta aggiungendo alla pagina di un monumento
        res.render('gphotos.ejs', {info:info, feedbackposting: feedbackposting,  xid : queryxid, numpag:numpag})
      }
      else{ //la foto si sta aggiungendo ad un feedback
        res.render('gphotos.ejs', {info:info, feedbackposting: feedbackposting, xid :'', numpag:numpag})
      }
		});
  }
  else{       //se la chiamata non è stata effettuata non ci sarà nell'url la req.query.nextpg
    numpag=1;
    request.post({
		headers: headers,
		url:     url,
    body:    {
      "filters": {
        "mediaTypeFilter": {
          "mediaTypes": [
            "PHOTO"
          ]
        }
      }
    },
    json:true
		}, function(error, response, body){
			console.log(JSON.stringify(body));
      info = JSON.parse(JSON.stringify(body));
      if (queryxid!=''){     //la foto si sta aggiungendo alla pagina di un monumento
        res.render('gphotos.ejs', {info:info, feedbackposting: feedbackposting,  xid : queryxid, numpag: numpag})
      }
      else{                  //la foto si sta aggiungendo ad un feedback
        res.render('gphotos.ejs', {info:info, feedbackposting: feedbackposting, xid :'', numpag: numpag})
      }
		});
  }
	
    
});




app.get('/logout',function(req,res){
  if (fconnected){
    res.render('logout.ejs', {user:username})
  }
  else{
    res.redirect(404, '/error?statusCode=404')
  }
})

app.post('/logout', function(req,res){
  fconnected=false;
  gconnected=false;
  lconnected=false;
  ftoken='';
  gtoken='';
  res.redirect('/');
})


//post recensione:
let reviews_check

app.post('/reviews', function(req,res){
  codice = Date.now();
  if(!reviews_check) newReview(req,res);  //Se non esiste il documento nel db lo creo
  else updateReview(req,res);             //Altrimenti aggiorno quello esistente
  updateUserReviews(req,res);             //Inserisco la recensione anche nel doc utente
  
});

//elimina recensione:

app.post('/elimina', function(req,res){
  const obj = JSON.parse(JSON.stringify(req.body));
  console.log(obj)
  try {
    deletereviewfromUser(obj.codice)
    deletereviewfromCity(obj.codice, obj.xid)
    res.render('eliminated', {cod: obj.codice})
  } catch (error) {
    console.log(error)
    res.redirect(404, '/error?statusCode=404')
    return
  }
  

})


function updateUserReviews(req,res){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+email,
    method: 'GET',
    headers: {
      'content-type': 'application/json'
    },
    
  }, function(error, response, body){
      if(error) {
          console.log(error);
      } else {
        var info = JSON.parse(body)
        console.log('\r\n'+place_name+'\r\n')
        data = new Date();
        mese=data.getMonth() +1;
        strdate = data.getDate()+"/"+mese+"/"+data.getFullYear()

  console.log("body funzioneupdateuserreview: %j", req.body)
        if (req.body.baseUrl!=''){
          imageToBase64(req.body.baseUrl) // Image URL
    .then(
        (response) => {
            console.log(response); // "iVBORw0KGgoAAAANSwCAIA..."
            encoded=response;
            item={
              "codice": codice,
              "Posto": place_name,
              "xid": xid,
              "name": username,
              "text": req.body.rev,
              "date": strdate,
              "photo": encoded
            }
            info.reviews.push(item)
        request({
          url: 'http://admin:admin@127.0.0.1:5984/users/'+email,
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(info)
          
        }, function(error, response, body){
            if(error) {
                console.log(error);
            } else {
                console.log(response.statusCode, body);
      
            }
        });
      }
    )
    .catch(
        (error) => {
            console.log(error); // Logs an error if there was one
        }
    )
          
            
          
        } 
        else{
          item={
            "codice": codice,
            "Posto": place_name,
            "xid": xid,
            "name": username,
            "text": req.body.rev,
            "date": strdate,
            "photo": '',
              
          }
        
        info.reviews.push(item)
        request({
          url: 'http://admin:admin@127.0.0.1:5984/users/'+email,
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(info)
          
        }, function(error, response, body){
            if(error) {
                console.log(error);
            } else {
                console.log(response.statusCode, body);
      
            }
        });
      }
    }
  });
}

function newReview(req,res){
  data = new Date();
  mese=data.getMonth() +1;
  strdate = data.getDate()+"/"+mese+"/"+data.getFullYear()
  console.log("body funzionenewreview: %j", req.body)
  if (req.body.baseUrl!=''){
    imageToBase64(req.body.baseUrl) // Image URL
    .then(
        (response) => {
            console.log(response); // "iVBORw0KGgoAAAANSwCAIA..."
            encoded=response;
            item={
              "reviews": [
                {
                  "codice": codice,
                  "name": username,
                  "text": req.body.rev,
                  "date": strdate,
                  "photo": encoded
                }
              ]
            }
            request({
              url: 'http://admin:admin@127.0.0.1:5984/reviews/'+xid,
              method: 'PUT',
              headers: {
                'content-type': 'application/json'
              },
              body: JSON.stringify(item)
              
            }, function(error, response, body){
                if(error) {
                    console.log(error);
                } else {
                    console.log(response.statusCode, body);
                    res.redirect('/details?xid='+xid);
                }
            });
        }
    )
    .catch(
        (error) => {
            console.log(error); // Logs an error if there was one
        }
    )
  } 
  else{
    item={
      "reviews": [
        {
          "codice": codice,
          "name": username,
          "text": req.body.rev,
          "date": strdate,
          "photo": ''
        }
      ]
    }
  


  request({
    url: 'http://admin:admin@127.0.0.1:5984/reviews/'+xid,
    method: 'PUT',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(item)
    
  }, function(error, response, body){
      if(error) {
          console.log(error);
      } else {
          console.log(response.statusCode, body);
          res.redirect('/details?xid='+xid);
      }
    });
  }
}

function updateReview(req,res){
  data = new Date();
  mese=data.getMonth() +1;
  strdate = data.getDate()+"/"+mese+"/"+data.getFullYear()
  console.log("body funzioneupdatereview: %j", req.body)
  if (req.body.baseUrl!=''){ 
    imageToBase64(req.body.baseUrl) // Image URL
    .then(
      (response) => {
        //console.log(response); "iVBORw0KGgoAAAANSwCAIA..."
        encoded=response;      //salviamo la striga
        newItem={
          "codice": codice,
          "name": username,
          "text": req.body.rev,
          "date": strdate,
          "photo": encoded    //setto la photo con il valore di response
        }
        infodb.reviews.push(newItem);

        request({
          url: 'http://admin:admin@127.0.0.1:5984/reviews/'+xid,
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(infodb)
    
        }, function(error, response, body){
          if(error) {
            console.log(error);
          } else {
            console.log(response.statusCode, body);
            res.redirect('/details?xid='+xid);
          }
        });

      }
    )
    .catch(
        (error) => {
            console.log(error); // Logs an error if there was one
        }
    )
  } 
  else{
    newItem={
      "codice": codice,
      "name": username,
      "text": req.body.rev,
      "date": strdate,
      "photo": ''
    }
      
    
  
  infodb.reviews.push(newItem);

  request({
    url: 'http://admin:admin@127.0.0.1:5984/reviews/'+xid,
    method: 'PUT',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(infodb)
    
  }, function(error, response, body){
      if(error) {
          console.log(error);
      } else {
          console.log(response.statusCode, body);
          res.redirect('/details?xid='+xid);
      }
  });
}
}

function deletereviewfromUser(num){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+email,
    method: 'GET',
    headers: {
      'content-type': 'application/json'
    },
    
  }, function(error, response, body){
      if(error) {
        console.log(error);
      } else {
        var info = JSON.parse(body)
        for(h = 0; h<info.reviews.length; h++){
          if (info.reviews[h].codice==num){
            info.reviews.splice(h, 1)
          } 
        }
        request({
          url: 'http://admin:admin@127.0.0.1:5984/users/'+email,
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(info)
          
        }, function(error, response, body){
            if(error) {
                console.log(error);
            } else {
                console.log(response.statusCode, body);
            }
        })
      }
    })
}


function deletereviewfromCity(num, cod){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/reviews/'+cod,
    method: 'GET',
    headers: {
      'content-type': 'application/json'
    },
    
  }, function(error, response, body){
      if(error) {
          console.log(error);
      } else {
        var info = JSON.parse(body)
        for(h = 0; h<info.reviews.length; h++){
          if (info.reviews[h].codice==num){
            info.reviews.splice(h, 1)
          } 
        }
        request({
          url: 'http://admin:admin@127.0.0.1:5984/reviews/'+cod,
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(info)
          
        }, function(error, response, body){
            if(error) {
                console.log(error);
            } else {
                console.log(response.statusCode, body);
            }
        })
      }
    })
}

//feedback
app.get('/newfeedback', function(req, res){
  feedbackposting=true;
  xid='';
  res.render('feedback', {inviato : false, gconnected: gconnected, photo: ""})
})

app.post('/newfeedback', function(req,res){
  console.log("bodyfeed: %j", req.body);
  if (req.body.baseUrl.length>=1){
    res.render('feedback', {inviato: false, gconnected: gconnected, photo: req.body.baseUrl})
  }
  else{
    res.redirect(404, '/error?statusCode=404')
  }
  
})

let id
app.post('/feedback', function(req, res){
  date = new Date();
  mese=date.getMonth() +1;
  strdate = date.getDate()+"/"+mese+"/"+date.getFullYear()
  id = Math.round(Math.random()*10000);
  if (req.body.baseUrl.length>2){
    imageToBase64(req.body.baseUrl) // Image URL
    .then(
      (response) => {
        console.log(response); // "iVBORw0KGgoAAAANSwCAIA..."
        var data={
          "id": id,
          "date": date,
          "email": email,
          "name": username,
          "text" : req.body.feed,
          "photo": response
        }
        updateFeedback(data,res)
      })
    }
    else{
      var data = {
        "id": id,
        "date": date,
        "email": email,
        "name": username,
        "text" : req.body.feed,
        "photo": req.body.baseUrl
      }
      updateFeedback(data,res)
    }
})



function updateFeedback(data,res){
  request.get('http://admin:admin@127.0.0.1:5984/users/'+email, function callback(error, response, body){

    var db = JSON.parse(body)
    newItem = {
      "feedback_id": id,
      "date": data.date,
      "text": data.text,
      "read": false,
      "photo": data.photo
    }
    db.feedbacks.push(newItem);

    request({
      url: 'http://admin:admin@127.0.0.1:5984/users/'+email,
      method: 'PUT',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.parse(JSON.stringify(db)),
      json:true
    }, function(error, response, body){
      if(error) {
        console.log(error);
      } else {
        console.log(response.statusCode, body);
        connect();
        async function connect() {

          try {
            
            const connection = await amqp.connect("amqp://localhost:5672")
            const channel = await connection.createChannel();
            const result = channel.assertQueue("feedback")
            channel.sendToQueue("feedback", Buffer.from(JSON.stringify(data)))
            console.log('Feedback sent succefully')
            console.log(data)
            
            res.render('feedback', {inviato : true})
            feedbackposting=false;
          }
          catch(error){
            console.error(error);
          }
        }
      }
    });

  })
}

app.get('/bootstrap.min.css',function (req,res){
  res.sendFile(path.resolve('bootstrap.min.css'));
});

app.get('/error',function(req,res){
  res.render('error', {statusCode: req.query.statusCode, fconnected: fconnected});
})

var server = app.listen(8000, function () {
  var host = server.address().address;
  var port = server.address().port;
  
  console.log('Server listening at http://%s:%s', host, port);
})