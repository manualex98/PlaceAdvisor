var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const path = require('path');
var request = require('request');
const { ADDRGETNETWORKPARAMS } = require('dns');
var amqp = require('amqplib'); //Protocollo amqp per rabbitmq
const imageToBase64 = require('image-to-base64');
const { query } = require('express');
require('dotenv').config()

//dico a node di usare il template engine ejs e setto la cartella views per i suddetti file
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

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
var reviewposting=false;
var feedbackposting=false;
var xid='';


app.post('/',function (req,res){
  if(req.body.sub == 'Accedi con Facebook') res.redirect('/facebooklogin')
  else gestisciAccessoLocale(req,res);
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
  res.redirect("https://www.facebook.com/v10.0/dialog/oauth?scope=email,public_profile&client_id="+process.env.CLIENT_ID+"&redirect_uri=http://localhost:8000/homepage&response_type=code");
});

app.get('/googlelogin', function(req, res){
  gconnecting=true;
  if (req.query.length>0){
    xid = req.query.xid;
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
        res.redirect('/ftoken?code='+code);
      }
    }
    else{
      res.redirect(404, '/error')
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

app.get('/gtoken', function(req, res){

//acquisisci google token
  console.log(req.query.code)
  var formData = {
    code: req.query.code,
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
      res.redirect('404', );
    }
    else{
      gtoken = info.access_token;
      gconnected = true;
      console.log("Got the token "+ info.access_token);
      res.render('continue.ejs', {gtoken : gtoken, gconnected:gconnected, feedbackposting: feedbackposting, xid:xid})
      //if(feedbackposting=true){
       // res.render('feedback.ejs', {inviato: false, gtoken : gtoken, ftoken:ftoken, gconnected:gconnected, fconnected:fconnected, lconnected: lconnected})
      //}
      //else if (reviewposting=true){
      //res.render('new_review.ejs', {inviato: false, gtoken : gtoken, ftoken:ftoken, gconnected:gconnected, fconnected:fconnected, lconnected: lconnected})
      //}
      
    }
  })
})


//acquisici fbtoken
app.get('/ftoken',function (req,res){
  
  var formData = {
    code: code,
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.SECRET,
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
      res.redirect('404', );
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
    res.redirect(404, 'error')
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



app.get('/app', function(req,res){
  var options ={
    url: 'https://api.opentripmap.com/0.1/en/places/radius?format=geojson&apikey='+process.env.OpenMap_KEY+'&radius='+rad+'&lon='+lon+'&lat='+lat+'&kinds='+cate+'&limit='+100
  }
  request.get(options, (error, req, body)=>{
    var info = JSON.parse(body);
    data = info.features;
    n = data.length;
    cate = cate.replace('_', ' ');

    res.render('list_places', {numero: n, data: data, cat: cate, citta: city});
  })
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
    res.redirect(404, '/error')
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
          console.log(meteo);
          console.log(icon_id);
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

var numpag;
app.get('/googlephotosapi', function(req,res){
  if (req.query.stato == 'feed'){
    feedbackposting=true;
  }
  queryxid = req.query.xid;
  querynextpg = req.query.nextpg;
  var url = 'https://photoslibrary.googleapis.com/v1/mediaItems:search'
	var headers = {'Authorization': 'Bearer '+gtoken};

  var request = require('request');
  if (querynextpg!=undefined && querynextpg!=''){
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
      if (queryxid!=''){
        res.render('gphotos.ejs', {info:info, feedbackposting: feedbackposting,  xid : queryxid, numpag:numpag})
      }
      else{
        res.render('gphotos.ejs', {info:info, feedbackposting: feedbackposting, xid :'', numpag:numpag})
      }
		});
  }
  else{
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
      if (queryxid!=''){
        res.render('gphotos.ejs', {info:info, feedbackposting: feedbackposting,  xid : queryxid, numpag: numpag})
      }
      else{
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
    res.redirect(404, '/error')
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


let reviews_check

app.post('/reviews', function(req,res){

  if(!reviews_check) newReview(req,res);  //Se non esiste il documento nel db lo creo
  else updateReview(req,res);             //Altrimenti aggiorno quello esistente
  updateUserReviews(req,res);             //Inserisco la recensione anche nel doc utente
  
});

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
            console.log(response); // "iVBORw0KGgoAAAANSwCAIA..."
            encoded=response;
            newItem={
        
              "name": username,
              "text": req.body.rev,
              "date": strdate,
              "photo": encoded
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
    res.responde('error')
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

        connect();
        async function connect() {

          try {
            const connection = await amqp.connect("amqp://localhost:5672")
            const channel = await connection.createChannel();
            const result = channel.assertQueue("feedback")
            channel.sendToQueue("feedback", Buffer.from(JSON.stringify(data)))
            console.log('Feedback sent succefully')
            console.log(data)
            updateFeedback(data)
            res.render('feedback', {inviato : true})
            feedbackposting=false;
          }
          catch(error){
            console.error(error);
          }
        }
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
    
        

  connect();
  async function connect() {

    try {
      const connection = await amqp.connect("amqp://localhost:5672")
      const channel = await connection.createChannel();
      const result = channel.assertQueue("feedback")
      channel.sendToQueue("feedback", Buffer.from(JSON.stringify(data)))
      console.log('Feedback sent succefully')
      console.log(data)
      updateFeedback(data)
      res.render('feedback', {inviato : true})
      feedbackposting=false;
    }
    catch(error){
      console.error(error);
    }
  }
}
})



function updateFeedback(data){
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
      }
    });

  })
}



app.get('/',function (req,res){
  if (fconnected){
    res.redirect('/homepage');
  }
  res.render('index', {check: false, registrazione: false});
});


app.get('/bootstrap.min.css',function (req,res){
  res.sendFile(path.resolve('bootstrap.min.css'));
});

app.get('/error',function(req,res){
  res.render('404');
})

var server = app.listen(8000, function () {
  var host = server.address().address;
  var port = server.address().port;
  
  console.log('Server listening at http://%s:%s', host, port);
})