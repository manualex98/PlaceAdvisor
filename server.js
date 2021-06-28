var express = require('express');
var app = express();
var fs = require('fs');
const https = require('https')
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const path = require('path');
var request = require('request');
var jwt = require('jsonwebtoken');
var cookieParser= require('cookie-parser');//Usiamo i cookie per: rendere stateless, ridurre l'impatto di attacchi di denial of service e facilita la replicazione di db nel caso di ambienti load-balanced
var cookieEncrypter = require('cookie-encrypter');
const { ADDRGETNETWORKPARAMS } = require('dns');
var amqp = require('amqplib'); //Protocollo amqp per rabbitmq
const imageToBase64 = require('image-to-base64'); //Usato per codificare le immagini in base-64
const WebSocket = require('ws');  
const swaggerJsDoc= require('swagger-jsdoc'); //usato per la documentazione
const swaggerUi= require('swagger-ui-express'); //usato per la documentazione
const { waitForDebugger } = require('inspector');
require('dotenv').config()

const secretKey = process.env.SECRETKEY;
const refresh_secretKey = process.env.REFRESH_SECRET;

app.use(cookieParser(secretKey));
app.use(cookieEncrypter(secretKey));


//dico a node di usare il template engine ejs e setto la cartella views per i suddetti file
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


//Funzione di middleware per l'autenticazione
//According to RFC, it's best to rotate or invalidate refresh token
function authenticateToken(req, res, next) {
  const token = req.signedCookies.jwt

  if (token == null){
    if(req.signedCookies.refresh!=null) {
      return res.redirect('/refreshtoken')
    }
    else{
      return res.redirect('/error?statusCode=401')
    } 
  }
  

  jwt.verify(token, secretKey, (err, token) => {
    

    if (err) {
      console.log(err)
      return res.redirect('/refreshtoken')
    }
    req.token=token
    next()
  })
}

app.get('/refreshtoken', function(req, res){
  const refresher = req.signedCookies.refresh;

  if (refresher == null) return res.redirect('/error?statusCode=401')

  jwt.verify(refresher, refresh_secretKey, (err, token)=>{
    if (err){
      return res.redirect('/error?statusCode=403')
    }
    else{
      jwt.sign({info:token.info}, secretKey, { expiresIn: '30m' }, (err, newtoken)=>{
        res.cookie('jwt', newtoken, {httpOnly: true,secure: true, signed:true, maxAge:1800000});           
        console.log('Questo è il JWT REFRESHATO!!' + newtoken);
        res.render('mytoken.ejs', {ntoken: newtoken})
    })
    }
  })
})


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
      url: "https://localhost:8000"
    }],
  },

  apis: ["server.js"]
}

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));


const wss = new WebSocket.Server({ port:8080 });

wss.on('connection', function connection(ws) {
  console.log('Si è connesso un client');
  ws.send('Welcome New Client!');

  ws.on('message', function incoming(message) {
    console.log('Messaggio ricevuto: %s', message);
    log_on_file(message)

    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    
  });
});


//************************INIZIO DOCUMENTAZIONE************************//

/**
 * @swagger
 * components:
 *  securitySchemes:
 *    googleOAuth:
 *      type: oauth2
 *      flows:
 *        authorizationCode:
 *          authorizationUrl: https://localhost:8000/googlelogin
 *          tokenUrl: https://localhost:8000/gtoken
 *          scopes: 
 *            photoslibrary.readonly: Grant read-only access to all your photos
 *    facebookOAuth:
 *      type: oauth2
 *      flows:
 *        authorizationCode:
 *          authorizationUrl: https://localhost:8000/facebooklogin
 *          tokenUrl: https://localhost:8000/ftoken
 *          scopes: {}
 *    fbcookieAuth:         # arbitrary name for the security scheme; will be used in the "security" key later
 *      type: apiKey
 *      in: cookie
 *      name: fbaccess_token 
 *    GoogleAccessToken:         # arbitrary name for the security scheme; will be used in the "security" key later
 *      type: apiKey
 *      in: cookie
 *      name: googleaccess_token
 *    GoogleIdToken:
 *      type: apiKey
 *      in: cookie
 *      name: googleaccess_token
 *    JWT:
 *      type: apiKey
 *      in: cookie
 *      name: jwt
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
 *          - text: Molto bello!!
 *          - date: 25/5/2021
 *          - photo:  
 *        feedbacks: 
 *          - feedback_id: 2740
 *          - date: 2021-05-25T12:44:14.418Z
 *          - text: Non mi piace per niente
 *          - read: true
 *          - photo: 
 *    Ricerca: 
 *      properties:
 *        Città:
 *          type: string
 *        Categoria:
 *          type: string
 *        Raggio:
 *          type: float    
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
 *          description: >
 *            Successfully authenticated.
 *            The session ID is returned in a cookie named `JSESSIONID`. You need to include this cookie in subsequent requests.
 *          headers: 
 *          Set-Cookie:
 *            schema: 
 *              type: string
 *              example: jwt=abcde12345; Path=/; HttpOnly
 * 
 *  /homepage:
 *    get:
 *      tags: [Callback]
 *      parameters:
 *        - in: query
 *          name: code
 *          schema:
 *            type: string
 *            description: Authentication Code ricevuto da Google/Fb
 *      security:
 *        - JWT: []
 *      responses:
 *        200: 
 *          description: HTML HOMEPAGE
 *        403:
 *          description: Error 403. User not authenticated
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
 *          headers: 
 *            Set-Cookie:
 *              schema: 
 *                type: string
 *                example: googleaccess_token=abcde12345, gid_token; Path=/; HttpOnly
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
 * 
 *  /home:
 *    get:
 *      tags: [Home]
 *      security:
 *        - JWT: []
 *      responses:
 *        200: 
 *          description: HTML HOMEPAGE
 *        403:
 *          description: Error 403. User not authenticated
 * 
 *  /info:
 *    get:
 *      tags: [Home]
 *      security:
 *        - JWT: []
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
 *  /city_info:
 *    get:
 *      tags: [Home]
 *      responses:
 *        200:
 *          description: restituisce la pagina city_stat.ejs
 *  /app:
 *    get:
 *      parameters:
 *        - in: query
 *          name: lat
 *          schema:
 *            type: float
 *          required: true
 *          description: Latitudine
 *        - in: query
 *          name: lon
 *          schema:
 *            type: float
 *          required: true
 *          description: Longitudine
 *        - in: query
 *          name: cate
 *          schema:
 *            type: string
 *          required: true
 *          description: Categoria
 *        - in: query
 *          name: rad
 *          schema:
 *            type: float
 *          required: true
 *          description: Raggio
 *      security:
 *        - JWT: []
 *      tags : [APIs]
 *      responses:
 *        200:
 *          description: Restituisce tutti i posti appartenenti alla categoria 'cate' che si trovano nel raggio 'rad' rispetto alla longitudine 'lon' e latitudine 'lat'
 *        404:
 *          description: Error
 *  /openmap:
 *    post:
 *      tags: [APIs]
 *      requestBody:
 *        required: true
 *        content:
 *          application/x-www-form-urlencoded:
 *          schema:
 *            $ref: '#/components/schemas/Ricerca' 
 *      security:
 *        - JWT: []
 *      responses:
 *        200:
 *          description:
 *    
 *  /details:
 *    get:
 *      security:
 *        - JWT: []
 *      tags: [APIs]
 *      responses:
 *        200:
 *          description: restituisce la pagina details
 *        404:
 *          description: Error
 * 
 *  /googlephotosapi:
 *    get:
 *      tags: [APIs]
 *      security:
 *        - JWT: []
 *        - gcookieAuth: []
 *        - gidcookieAuth: []
 *      responses:
 *        200:
 *          description: restituisce la pagina gphotos.ejs
 *        404:
 *          description: Error
 * 
 *  /logout:
 *    get:
 *      tags: [Home]
 *      responses:
 *        200:
 *          description: restituisce la pagina logout.ejs
 *        404: 
 *          description: Error
 *    post:
 *      tags: [Home]
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
 *      summary: Posta una recensione
 *      tags: [Reviews]
 *      security:
 *        - JWT: []
 *      requestBody:
 *        required: true
 *        content:
 *          application/x-www-form-urlencoded:
 *            schema:
 *              properties:
 *                xid:
 *                  type: string
 *                  description: Codice luogo
 *                name:
 *                  type: string
 *                  description: Username
 *                text:   
 *                  type: string
 *                photo:
 *                  type: string
 *                  format: byte
 *            
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
 *          description: prima dell'invio del feedback controlla il token e restituisce feedback.ejs
 *        403: 
 *          description: Error token expired
 *        404: 
 *          description: Error
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
 *          description: salva il feedback nel database, lo invia al feedback_consumer con AMQP e reindirizza a feedback.ejs
 * 
 *  /bootstrap.min.css:
 *    get:
 *      tags: [Bootstrap]
 *      responses:
 *        200:
 *          description: permette di avere bootstrap nelle pagine ejs
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


//*****************************FINE DOCUMENTAZIONE*******************************/


app.get('/', function (req,res){
  console.log(JSON.stringify(req.signedCookies))
    res.render('index', {check: false, registrazione: false});
});


app.post('/',function (req,res){
  if(req.body.sub == 'Accedi con Facebook'){
    res.redirect('/facebooklogin')
  }
  else {
    res.redirect(404, '/error?statusCode=404')
  }
})

app.post('/userinfo', authenticateToken, function(req,res){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+req.token.info.info.email,
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
            newUser(req,res)                      //Altrimenti si effettua la registrazione
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
  fbinfo = req.token.info
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
  res.status(201).redirect("https://www.facebook.com/v10.0/dialog/oauth?scope=email,public_profile&client_id="+process.env.FB_CLIENT_ID+"&redirect_uri=https://localhost:8000/homepage&response_type=code");
});

app.get('/googlelogin', function(req, res){
  gconnecting=true;
  if (req.query.length>0){
    res.cookie('xid', req.query.xid, {maxAge:315360000000, signed: true, secure:true, httpOnly: true})
    xid = req.query.xid;  //se si entra dalla pagina delle review, si ritornerà poi a quella pagina, quindi salvo xid
    res.redirect("https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A//www.googleapis.com/auth/photoslibrary.readonly&access_type=offline&include_granted_scopes=true&response_type=code&redirect_uri=https://localhost:8000/googlecallback&client_id="+process.env.G_CLIENT_ID);
  }
  else{ 
    res.redirect("https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A//www.googleapis.com/auth/photoslibrary.readonly&access_type=offline&include_granted_scopes=true&response_type=code&redirect_uri=https://localhost:8000/googlecallback&client_id="+process.env.G_CLIENT_ID);
  }
})

app.get('/signup', function(req, res){
  res.render('signup.ejs',{check: check});
});

app.get('/home', authenticateToken, function(req,res){
    username = req.token.info.info.username
  
  if (req.signedCookies.googleaccess_token==undefined){
    gconnected=false
  }
  else{
    gconnected=true
  }


  
  res.render('homepage', {fconnected:true, gconnected:gconnected, username:username})
})

app.get('/homepage', function (req,res){
  if (req.query.code!=undefined){  
    if (req.query.scope!=undefined){
      res.redirect('gtoken?code='+req.query.code)
    }
    else{
      code=req.query.code;  
      res.redirect('/ftoken?code='+code)
    }
  }
  else{
    res.status(403).redirect(403, '/error?statusCode=403')
  }    
})

//acquisisci google token
app.get('/gtoken', authenticateToken, function(req, res){
  var xid;
  var feedbackposting;
  code = decodeURIComponent(req.query.code)
  if (req.query.stato != undefined){
    feedbackposting=true;
  }
  else{
    feedbackposting=false
  }
  if (req.query.xid!=undefined){
    xid = req.query.xid
  }
  else{
    xid='';
  }
  var formData = {
    code: code,
    client_id: process.env.G_CLIENT_ID,
    client_secret: process.env.G_CLIENT_SECRET,
    redirect_uri: "https://localhost:8000/googlecallback",
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
      googletoken = info.access_token; //prendo l'access token
      gtoken = info.id_token; 
      gconnected = true;
      console.log("Got the token "+ info.access_token);
      res.cookie('gid_token', gtoken, {maxAge:315360000000, secure:true, signed: true, httpOnly: true})
      res.cookie('googleaccess_token', googletoken, {maxAge:315360000000, secure:true, signed: true, httpOnly: true})
      res.redirect('/home')
    }
  })
})


//acquisici fbtoken
app.get('/ftoken',function (req,res){
  code = decodeURIComponent(req.query.code)
  
  var formData = {
    code: code,
    client_id: process.env.FB_CLIENT_ID,
    client_secret: process.env.FB_SECRET_KEY,
    redirect_uri: "https://localhost:8000/homepage",
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
      res.cookie('fbaccess_token', ftoken, {maxAge:37500000, signed: true,secure: true, httpOnly: true})
      //res.status(200).redirect('/mytoken')
      res.redirect('fb_pre_access')
    }
  });
});

app.get('/mytoken', function(req,res){
  if(req.signedCookies.fbaccess_token!=undefined){
    fconnected=true;
    if (req.signedCookies.googleaccess_token!=undefined){
      gconnected=true;
    }
    res.render('mytoken', {fconnected:fconnected, gconnected: gconnected, ftoken: req.signedCookies.fbaccess_token})
  }
})


app.get('/fb_pre_access',function (req,res){
  ftoken='';
  if (req.signedCookies.fbaccess_token!=undefined){
    ftoken = String(req.signedCookies.fbaccess_token) 
  }
  else res.send('ERRORE')
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
      console.log(email)
      const fbinfo=parsed
      //CONTROLLO SE ESISTE L'UTENTE NEL DB
      request({
        url: 'http://admin:admin@127.0.0.1:5984/users/'+fbinfo.email,
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
              jsonobj= {
                "info": fbinfo,
                "fbtoken": ftoken
              }
              console.log("QUESTA QUA è LA FUNZIONE CHE SETTA IL COOKIE SE L'UTENTE NON ESISTE")
              jwt.sign({info:jsonobj}, secretKey, { expiresIn: '30m' }, (err, token)=>{
                res.cookie('jwt', token, {httpOnly: true,secure: true, signed:true, maxAge:1800000});           
                console.log('Questo è il JWT!!' + token);
                res.redirect('/fbsignup'); //Utente non esiste quindi lo faccio registrare
              })
              
              
            }
            else{
              jsonobj= {
                "info":{ 
                "email": info.email,
                "username": info.username,
                
                },
                "fbtoken": ftoken
              }
              res.cookie('fbaccess_token', '', {httpOnly: true,secure: true, signed:true, maxAge:0});

              console.log("QUESTA QUA è LA FUNZIONE CHE SETTA IL COOKIE SE L'UTENTE ESISTE")
              jwt.sign({info:jsonobj}, secretKey, { expiresIn: '30m' }, (err, token)=>{
                if (err) console.log(err);
                res.cookie('jwt', token, {httpOnly: true, secure:true, signed:true, maxAge:1800000});              
                console.log('Questo è il JWT!!' + token);
                
              })
              if(req.signedCookies.refresh==null){
              jwt.sign({info:jsonobj}, refresh_secretKey, (err, refreshtoken)=>{
                res.cookie('refresh', refreshtoken, {httpOnly: true, secure: true, signed:true})
                res.redirect('/home').statusCode(200);  //Utente esiste, può accedere
              })
            }
            else{
              res.redirect('/home').statusCode(200);
            }
            }
          }
      });
    });
})


app.get('/fbsignup', authenticateToken, function(req,res){
  const ftoken = req.token.info.fbtoken
  const fbinfo= req.token.info.info
  fconnected=true;
  res.render('fbsignup', {fconnected: true,check: false, ftoken:ftoken, data: fbinfo});
})


app.post('/fbsignup', authenticateToken, function (req,res){
  /*da implementare
  - recuperare payload e usarlo al posto di fbinfo
  - creare utente
  - return a homepage
  */
  payload=req.token.info
  username=req.body.username
  console.log(payload)
  
  
  body1={
    
    "name": payload.info.first_name,
    "surname": payload.info.last_name,
    "email": payload.info.email,
    "username": username,
    "picture": {
      "url": payload.info.picture.data.url,
      "height": payload.info.picture.data.height,
      "width": payload.info.picture.data.width
    },
    "reviews": [],
    "feedbacks":[]
  
};
console.log(body1)
  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+payload.info.email,
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
        jsonobj={
          "info":{
          "email": payload.info.email,
          "username": username,
          },
          "fbtoken": payload.fbtoken
        }
        
        
          res.cookie('jwt', '', {httpOnly: true,secure: true, signed:true, maxAge:0})
          jwt.sign({info:jsonobj}, secretKey, { expiresIn: '30m' }, (err, token)=>{
          res.cookie('fbaccess_token', '', {httpOnly: true,secure: true, signed:true, maxAge:0})
          res.cookie('jwt', token, {httpOnly: true,secure: true, signed:true, maxAge:1800000})            
          console.log('Questo è il nuovo JWT!!' + token)
          
          
          })     //refresh_token      
          jwt.sign({info:jsonobj}, refresh_secretKey, (err, refreshtoken)=>{
            res.cookie('refresh', refreshtoken, {httpOnly: true, secure: true, signed:true})
            res.redirect('/home').statusCode(200);  //Utente esiste, può accedere
          
      })
    }
  });

});

app.get('/googlecallback', function (req,res){
  if (req.query.code!=undefined){  
      res.redirect('gtoken?code='+req.query.code)
  }
  else{
    res.status(403).redirect(403, '/error?statusCode=403')
  }    
})





app.get('/info', authenticateToken, function(req, res){
  payload=req.token.info

  var email
  if(payload.info) email=payload.info.email
  else email = payload.email
  
  request.get('http://admin:admin@127.0.0.1:5984/users/'+email, function callback(error, response, body){
    var data = JSON.parse(body)
    res.render('user_info', {data: data});
  })
  
  
})
    
//API Open Trip Map Places
app.post('/openmap', authenticateToken, function(req,res){   
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
    console.log('/app?lat='+lat+'&lon='+lon+'&cate='+cate+'&rad='+rad);
    res.redirect('/app?lat='+lat+'&lon='+lon+'&cate='+cate+'&rad='+rad+'&city='+city);
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


app.get('/city_info', authenticateToken, function(req,res){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/cities/_all_docs?include_docs=true&limit=100',
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
      for(var i=0; i<data.total_rows-1;i++){
        elem=data.rows[i]
        list_city.push(
          {
            "city": elem.doc.name,
            "search": elem.doc.search
          }
        )
      }
      
      list_city.sort(                         //Lo ordino in base a quante volte sono stati cercati gli elementi
        function(a, b){
          return b.search - a.search
        }
      )
      items = list_city.slice(0, 10)

      res.render('city_stat',{data:items})
    }
  })
})

app.get('/app', authenticateToken, function(req,res){ 
  rad = req.query.rad;
  lat = req.query.lat;
  lon = req.query.lon;
  cate = req.query.cate;
  city = req.query.city;

  var options ={
    url: 'https://api.opentripmap.com/0.1/en/places/radius?format=geojson&apikey='+process.env.OpenMap_KEY+'&radius='+rad+'&lon='+lon+'&lat='+lat+'&kinds='+cate+'&limit='+100
  }
  request.get(options, (error, req, body)=>{
    var info = JSON.parse(body);
    //console.log(body)
    data = info.features;
    
    if (data==undefined){
      console.log('Non è stato cercato bene')
      res.redirect('/home')
    }
    else{
      n = data.length;
      cate = cate.replace('_', ' ');
      res.render('list_places', {numero: n, data: data, cat: cate, citta: city});
    }
  })
});


app.get('/details', authenticateToken, function(req,res){
  if (req.signedCookies.googleaccess_token==undefined){
    gconnected=false
  }
  else{
    gconnected=true
  }
  if (Object.keys(req.query).length > 1){

    var photo =req.query.baseUrl;
  }
  else{
    var photo = '';
  }

  xid = req.query.xid;
  
  var options = {
    url: 'https://api.opentripmap.com/0.1/en/places/xid/'+xid+'?apikey='+process.env.OpenMap_KEY
  }
  
  request.get(options,function callback(error, response, body){
    info = JSON.parse(body);
    place_name=info.name
    lat = info.point.lat
    lon= info.point.lat
    console.log('\r\n'+place_name+'\r\n')
    request.get('http://admin:admin@127.0.0.1:5984/reviews/'+xid, function callback(error, response, body){
      if(error) {
        console.log(error);
        res.status(404).render('/error?statusCode=404')
        return
      } else {
        console.log(response.statusCode, body);
        infodb = JSON.parse(body);
        var weather = {
          url: 'https://api.openweathermap.org/data/2.5/weather?lat='+lat+'&lon='+lon+'&appid='+process.env.OpenWeatherMap_KEY+'&lang=it'
        }
        request.get(weather, function callback(error,response, body){
          info_weather=JSON.parse(body);
          meteo=info_weather.weather[0].description;
          icon_id=info_weather.weather[0].icon;
          icon_url="http://openweathermap.org/img/wn/"+icon_id+"@2x.png"
          if(infodb.error){
            res.render('details', {gconnected : gconnected, fconnected: true,info: info, xid: xid, lat: info.point.lat , lon: info.point.lon, api: process.env.HERE_API, reviews: "", photo:photo, info_weather:meteo, icon_id:icon_id, icon_url:icon_url});
          } 
          else{
            //Ci sono recensioni
            res.render('details', {gconnected : gconnected, fconnected:true,info: info, xid: xid, reviews: infodb.reviews,n: infodb.reviews.length,lat: info.point.lat , lon: info.point.lon, api: process.env.HERE_API, photo: photo, info_weather:meteo, icon_id:icon_id, icon_url:icon_url});
          }
        })
        
      }

    });

  });
  
});

//Google Photos API

app.get('/googlephotosapi', authenticateToken, function(req,res){
  feed= req.query.stato;
  gtoken = req.signedCookies.googleaccess_token;
  console.log('gtoken : '+ gtoken)
  if(req.signedCookies.googleaccess_token==undefined){
    res.redirect(404, '/error?statusCode=404')
  }
  else{
    request.get({
      url: 'https://oauth2.googleapis.com/tokeninfo?id_token=' + req.signedCookies.gid_token
    }, function(error, response, body){
      if(error){
        console.log(error)
      }
      else{
        console.log(body)
        ref=JSON.parse(body)
        if (ref.azp!=process.env.G_CLIENT_ID){
          res.status(403).render('expired_token', {google:true})
          return
        }
        if (feed == 'feed'){
          feedbackposting=true;   //ritornerà la foto nel feedback
        }
      queryxid = req.query.xid;
      querynextpg = req.query.nextpg;
      var url = 'https://photoslibrary.googleapis.com/v1/mediaItems:search'
      var headers = {'Authorization': 'Bearer '+ gtoken};    //setto gli headers passando al sito il token
      var request = require('request');
      if (querynextpg!=undefined && querynextpg!=''){         //se ci troviamo alla pagina 2+
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
          res.render('gphotos.ejs', {info:info, feedbackposting: false,  xid : queryxid, numpag:numpag})
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
          res.render('gphotos.ejs', {info:info, feedbackposting: false,  xid : queryxid, numpag: numpag})
        }
        else{                  //la foto si sta aggiungendo ad un feedback
          res.render('gphotos.ejs', {info:info, feedbackposting: feedbackposting, xid :'', numpag: numpag})
        }
      });
    }
    }
  })
}
});






app.get('/logout', authenticateToken, function(req,res){
  res.render('logout.ejs', {user:username})
})

app.post('/logout', function(req,res){
  res.cookie('gid_token', '', {maxAge:0, secure:true, signed: true, httpOnly: true})
  res.cookie('googleaccess_token', '', {maxAge:0, secure:true, signed: true, httpOnly: true})
  res.cookie('jwt', '', {httpOnly: true,secure: true, signed:true, maxAge:0}) 
  res.redirect('/');
})


//post recensione:
app.post('/reviews', authenticateToken, function(req,res){
  codice = Date.now();
  photo = req.body.baseUrl;
  request.get('http://admin:admin@127.0.0.1:5984/reviews/'+req.body.xid, function callback(error, response, body){
    if(error) {
      console.log(error);
      res.status(404).render('/error?statusCode=404')
    } else {
      console.log(response.statusCode, body);
      infodb = JSON.parse(body);
        if(infodb.error){
          //console.log('la f è in err')
          //console.log(req.body)
          newReview(req, res, codice);  //Se non esiste il documento nel db lo creo
        } 
        else{
          updateReview(req, res, codice);             //Altrimenti aggiorno quello esistente
        }
    }
  });
  updateUserReviews(req,res, codice);             //Inserisco la recensione anche nel doc utente
});

//elimina recensione:

app.post('/elimina', authenticateToken, function(req,res){
  email=req.token.info.info.email
  email=email.replace('\u0040', '@');
  const obj = JSON.parse(JSON.stringify(req.body));
  console.log(obj)
  try {
    deletereviewfromUser(obj.codice, email)
    deletereviewfromCity(obj.codice, obj.xid)
    res.render('eliminated', {cod: obj.codice})
  } catch (error) {
    console.log(error)
    res.redirect(404, '/error?statusCode=404')
    return
  }
  

})


function updateUserReviews(req,res, codice){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+req.token.info.info.email,
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

  //console.log("body funzioneupdateuserreview: %j", req.body)
        if (req.body.baseUrl!=''){
          imageToBase64(req.body.baseUrl) // Image URL
          .then((response) => {
              console.log(response); // "iVBORw0KGgoAAAANSwCAIA..."
              encoded=response;
              item={
                "codice": codice,
                "Posto": place_name,
                "xid": req.body.xid,
                "name": req.token.info.info.username,
                "text": req.body.rev,
                "date": strdate,
                "photo": encoded
              }
              info.reviews.push(item)
              request({
              url: 'http://admin:admin@127.0.0.1:5984/users/'+req.token.info.info.email,
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
          .catch((error) => {
            console.log(error); // Logs an error if there was one
          })
        } 
        else{
          var info = JSON.parse(body)
          item={
            "codice": codice,
            "Posto": place_name,
            "xid": req.body.xid,
            "name": req.token.info.info.username,
            "text": req.body.rev,
            "date": strdate,
            "photo": '',
          }
        
          info.reviews.push(item)
          request({
            url: 'http://admin:admin@127.0.0.1:5984/users/'+req.token.info.info.email,
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

function newReview(req,res, codice){
  xid=req.body.xid
  payload=req.token.info;
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
                  "name": payload.info.username,
                  "text": req.body.rev,
                  "date": strdate,
                  "photo": encoded
                }
              ]
            }
            request({
              url: 'http://admin:admin@127.0.0.1:5984/reviews/'+ xid,
              method: 'PUT',
              headers: {
                'content-type': 'application/json'
              },
              body: JSON.stringify(item)
              
            }, function(error, response, body){
                if(error) {
                    console.log(error);
                } else {
                    //console.log(response.statusCode, body);
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
          "name": req.token.info.info.username,
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
          //console.log(response.statusCode, body);
          res.redirect('/details?xid='+xid);
      }
    });
  }
  
}

function updateReview(req,res,codice){
  payload=req.token
  xid = req.body.xid;
  console.log("XID_ : "+xid)
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
          "name": payload.info.username,
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
            //console.log(response.statusCode, body);
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
      "name": payload.info.username,
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
          //console.log(response.statusCode, body);
          res.redirect('/details?xid='+xid);
      }
  });
}

}

function deletereviewfromUser(num, email){
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
        if(info.reviews!=undefined){
        for(h = 0; h<info.reviews.length; h++){
          if (info.reviews[h].codice==num){
            info.reviews.splice(h, 1)
          } 
        }}
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


function deletereviewfromCity(codice, xid){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/reviews/'+xid,
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
          if (info.reviews[h].codice==codice){
            info.reviews.splice(h, 1)
          } 
        }
        request({
          url: 'http://admin:admin@127.0.0.1:5984/reviews/'+xid,
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
app.get('/newfeedback', authenticateToken, function(req, res){
  if (req.signedCookies.googleaccess_token!=undefined){
    gconnected = true
  }
  else{
    gconnected = false
  }
  res.render('feedback', {inviato : false, gconnected: gconnected, photo: ""})
  
})

app.post('/newfeedback', authenticateToken, function(req,res){
  if (req.signedCookies.googleaccess_token!=undefined){
    gconnected = true
  }
  else{
    gconnected = false
  }
  if (!gconnected){
    res.status(403).render('expired_token', {google:true})
  }
  else{
    //console.log("bodyfeed: %j", req.body);
    if (req.body.baseUrl.length>=1){
      res.render('feedback', {inviato: false, gconnected: gconnected, photo: req.body.baseUrl})
  }
  else{
    res.redirect(404, '/error?statusCode=404')
  }
}
})

app.post('/feedback', authenticateToken, function(req, res){
  if (req.signedCookies.googleaccess_token!=undefined){
    gconnected = true
  }
  else{
    gconnected = false
  }
  username=req.token.info.info.username
  email=req.token.info.info.email
  date = new Date();
  mese=date.getMonth() +1;
  strdate = date.getDate()+"/"+mese+"/"+date.getFullYear()
  id = Math.round(Math.random()*10000);
  if (req.body.baseUrl.length>2){
    imageToBase64(req.body.baseUrl) // Image URL
    .then(
      (response) => {
        //console.log(response); // "iVBORw0KGgoAAAANSwCAIA..."
        var data={
          "id": id,
          "date": date,
          "email": email,
          "name": username,
          "text" : req.body.feed,
          "photo": response
        }
        updateFeedback(data,res)
      }).catch(function(error){
        console.log(error);
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
  email=data.email.replace('\u0040', '@');
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
        //console.log(response.statusCode, body);
         
        amqp.connect('amqp://localhost:5672', function(error0, connection) {
          if (error0) {
            //throw error0; 
            console.log("Sistema di feedback non funziona " + error0.toString());
            return;
         }

          connection.createChannel(function(error1, channel) {
            if (error1) {
                console.log("Sistema di feedback non funziona " + error0.toString());
                return;
            }

            var queue = 'feedback';
            var msg = JSON.stringify(data)

            channel.assertQueue(queue);

            console.log("-- INVIANDO MESSAGGIO '%s' ALLA CODA %s --", msg, queue);

            channel.sendToQueue(queue, Buffer.from(msg));

            console.log("-- HO INVIATO IL MESSAGGIO --");
          });


        setTimeout(function() { //importante mettere il timeout perchè altrimenti la connessione si chiude
            connection.close(); // prima di riuscire a passare il msg
        }, 500);
        res.render('feedback', {inviato : true})
        feedbackposting=false;
    });
  }
})
  })
}

function log_on_file(data){
  fs.appendFile('logs.txt','\r\n'+data, ()=>{
    console.log('scritto su file')
  })

}

app.get('/bootstrap.min.css',function (req,res){
  res.sendFile(path.resolve('bootstrap.min.css'));
});

app.get('/error',function(req,res){
    res.render('error', {statusCode: req.query.statusCode, fconnected: true});
})


//Per usare http basta decommentare qui e commentare la parte sotto

/*var server = app.listen(8000, function () {
  var host = server.address().address;
  var port = server.address().port;
  
  console.log('Server listening at http://%s:%s', host, port);
})*/


const server = https.createServer({
  key: fs.readFileSync(path.join(__dirname, 'security','key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'security','cert.pem'))
}, app)

server.listen(8000, () => console.log('Secure server on port 8000...'))