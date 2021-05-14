var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const path = require('path');
var request = require('request');
const { ADDRGETNETWORKPARAMS } = require('dns');
var amqp = require('amqplib'); //Protocollo amqp per rabbitmq
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
var fbinfo;
var reviewposting=false;
var feedbackposting=false;


app.post('/',function (req,res){
  if(req.body.sub == 'Accedi con Facebook') res.redirect('/facebooklogin')
  else gestisciAccesso(req,res);
})

app.post('/userinfo', function(req,res){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+req.body.username,
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

          if (infousers.error){
            res.render('signup', {check: false})
          }
          else{
            newUser(req,res)
          }
          
      }
    });
  });
let infousers;
let check;

function gestisciAccesso(req,res){
  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+req.body.username,
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
          if (checkUser(req,res)==false){
            username=req.body.username
            lconnected=true
            res.render('homepage', {username:req.body.username, fconnected:false});
          }
          else if(checkUser(req,res)==true){
            
            res.render('index', {check:check});
          }
      }      
    });
  
}


//funzione check User
function checkUser(req,res){
  for (var i=0;i<infousers.users.length;i++){
    if (infousers.users[i].username==req.body.username && infousers.users[i].password==req.body.password){
      check=false;
      return false;
    }
  }
  check=true;
  return true;
}

function checkUsername(req,res){
  for (var i=0; i<infousers.users.length; i++){
    if (infousers.users[i].username==req.body.username){
      check=false;
      return false;
    } 
  }
  check=true;
  return true;
}

function newUser(req,res){

  body={
    "info":
      {
        "name": req.body.name,
        "surname": req.body.surname,
        "username": req.body.username,
        "password": req.body.password,
      },
      "reviews": [],
      "feedback":[]
    
  };
  
  request({
    url: 'http://admin:admin@127.0.0.1:5984/users/'+req.body.username,
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
          res.redirect('/');
      }
  });
}


app.get('/facebooklogin',function (req,res){
  fconnecting=true;
  res.redirect("https://www.facebook.com/v10.0/dialog/oauth?scope=email,public_profile&client_id="+process.env.CLIENT_ID+"&redirect_uri=http://localhost:8000/homepage&response_type=code");
});

app.get('/googlelogin', function(req, res){
  gconnecting=true;
  res.redirect("https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A//www.googleapis.com/auth/photoslibrary.readonly&access_type=offline&include_granted_scopes=true&response_type=code&redirect_uri=http://localhost:8000/homepage&client_id="+process.env.G_CLIENT_ID);
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
  else res.redirect('/');
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
      res.render('continue.ejs', {gtoken : gtoken, gconnected:gconnected, reviewposting: reviewposting, feedbackposting: feedbackposting})
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
                            res.redirect('homepage')   
                          }
                        }
                    });
          });
})









let email
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
        res.render('homepage', {fconnected: fconnected,username: username});
      }
  });

});







app.get('/info', function(req, res){
  if (fconnected && fbinfo!=undefined){
    request.get('http://admin:admin@127.0.0.1:5984/users/'+email, function callback(error, response, body){
      var data = JSON.parse(body)
      res.render('user_info', {data: data});
    })
    
  }
  else{
    res.render('user_info', {data: ""});
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
let xid
let place_name
let infodb
app.get('/details', function(req,res){
  console.log(req.query)
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
    console.log('\r\n'+place_name+'\r\n')
    request.get('http://admin:admin@127.0.0.1:5984/reviews/'+xid, function callback(error, response, body){
      if(error) {
        console.log(error);
      } else {
        console.log(response.statusCode, body);
        infodb = JSON.parse(body);
        if(infodb.error){
          reviews_check=false
          res.render('details', {gconnected : gconnected, fconnected: fconnected,info: info, xid: xid, lat: info.point.lat , lon: info.point.lon, api: process.env.HERE_API, reviews: "", photo:photo});
        } 
        else{
          
          reviews_check=true
          res.render('details', {gconnected : gconnected, fconnected:fconnected,info: info, xid: xid, reviews: infodb.reviews,n: infodb.reviews.length,lat: info.point.lat , lon: info.point.lon, api: process.env.HERE_API, photo: photo});
        }
      }

    });

  });
});

app.get('/driveapi', function(req,res){
  queryxid = req.query.xid;
  var url = 'https://photoslibrary.googleapis.com/v1/mediaItems'
	var headers = {'Authorization': 'Bearer '+gtoken};

  var request = require('request');

	request.get({
		headers: headers,
		url:     url,
		}, function(error, response, body){
			console.log(body);
      info = JSON.parse(body);
      if (queryxid!=''){
        res.render('gphotos.ejs', {info:info, feedbackposting: feedbackposting, reviewposting: reviewposting, xid : queryxid})
      }
      else{
        res.render('gphotos.ejs', {info:info, feedbackposting: feedbackposting, reviewposting: reviewposting, xid :''})
      }
		});
    
});


app.get('/logout',function(req,res){
  //request.get("https://www.facebook.com/logout.php?next=localhost:8000&access_token="+ftoken, function callback(error, response, body){
    if (error){
      console.log(error);
    }
    else{
      fconnected=false
      gconnected=false
      lconnected=false
      console.log(response.statusCode, body)
      res.redirect('/')
    }
  })



let reviews_check
let reviews_rev

app.get('/newreview', function(req, res){
  reviewposting=true;
  var query = JSON.parse(body)
  if (query.baseUrl != ''){
    res.render('new_review.ejs', {gconnected: gconnected, photo : '', xid: query.xid})
  }
  else{
    res.render('new_review.ejs', {gconnected: gconnected, photo: req.body.baseUrl})
  }
})

app.post('/reviews', function(req,res){
  console.log("body: %j", req.body)


  if(!reviews_check) newReview(req,res);
  else updateReview(req,res);

  updateUserReviews(req,res); //Inserisco la recensione nel doc utente
  
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
        strdate = data.getDate()+"/"+((data.getMonth())+1)+"/"+data.getFullYear()
        item={
          "xid": xid,
          "place": place_name,
          "text": req.body.rev,
          "date": strdate
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
  });
}

function newReview(req,res){
  data = new Date();
  strdate = data.getDate()+"/"+data.getMonth()+"/"+data.getFullYear()

  item={
    "reviews": [
      {
        "name": username,
        "text": req.body.rev,
        "date": strdate,
        "photo": req.body.baseUrl,
      }
    ]
  };

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

function updateReview(req,res){
  data = new Date();
  strdate = data.getDate()+"/"+data.getMonth()+"/"+data.getFullYear()

  newItem = {
        "name": username,
        "text": req.rev,
        "date": strdate
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

//feedback
app.get('/newfeedback', function(req, res){
  feedbackposting=true;
  res.render('feedback', {inviato : false, gconnected: gconnected, photo: ""})
})

app.post('/newfeedback', function(req,res){
  const obj = JSON.parse(JSON.stringify(req.body));
  console.log(obj);
  if (obj.baseUrl){
    res.render('feedback', {inviato: false, gconnected: gconnected, photo: obj.baseUrl})
  }
  else{
    res.responde('error')
  }
  
})

let id
app.post('/feedback', function(req, res){
  date = new Date();
  strdate = date.getDate()+"/"+date.getMonth()+"/"+date.getFullYear()
  id = Math.round(Math.random()*10000);
  var data = {
    id: id,
    date: date,
    email: email,
    name: username,
    text : req.body.feed
  }
  connect();
  async function connect() {

    try {
      const connection = await amqp.connect("amqp://localhost:5672")
      const channel = await connection.createChannel();
      const result = channel.assertQueue("feedback")
      channel.sendToQueue("feedback", Buffer.from(JSON.stringify(data)))
      console.log('Feedback sent succefully')
      updateFeedback(data)
      res.render('feedback', {inviato : true})
    }
    catch(error){
      console.error(error);
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
      "read": false
    }
    db.feedbacks.push(newItem);

    request({
      url: 'http://admin:admin@127.0.0.1:5984/users/'+email,
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

  })
}



app.get('/',function (req,res){
  res.render('index.ejs',{check:"false"});
});


app.get('/bootstrap.min.css',function (req,res){
  res.sendFile(path.resolve('bootstrap.min.css'));
});

app.get('/404',function(req,res){
  res.render('404');
})

var server = app.listen(8000, function () {
  var host = server.address().address;
  var port = server.address().port;
  
  console.log('Server listening at http://%s:%s', host, port);
})