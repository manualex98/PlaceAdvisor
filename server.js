var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const path = require('path');
var request = require('request');
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
let fusername

app.post('/',function (req,res){
  if(req.body.sub == 'Accedi con Facebook') res.redirect('/facebooklogin')
  else if(req.body.sub == 'Accedi con Google') res.redirect('/googlelogin')
})



app.get('/facebooklogin',function (req,res){
  fconnecting=true;
  res.redirect("https://www.facebook.com/v10.0/dialog/oauth?client_id="+process.env.CLIENT_ID+"&redirect_uri=http://localhost:8000/homepage&response_type=code");
});

app.get('/googlelogin', function(req, res){
  gconnecting=true;
  res.redirect("https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A//www.googleapis.com/auth/drive.metadata.readonly&access_type=offline&include_granted_scopes=true&response_type=code&redirect_uri=http://localhost:8000/homepage&client_id="+process.env.G_CLIENT_ID);
})



app.get('/homepage', function (req,res){
  code=req.query.code;
  //check sessioni fb e google
  if (!gconnecting){
    if(fconnecting){
      if(fconnected){
        res.render('homepage', {fconnected:fconnected, fusername:fusername})
      }
      else{
        res.redirect('/ftoken?code='+code);
      }
    }
    else{
      res.redirect('/');
    }
  }
  else{
    if(gconnected){
      res.render('homepage', {fconnected:fconnected})
    }
    else{
      res.redirect('/gtoken?code='+code);
    }
  }
})


//acquisisci google token
app.get('/gtoken', function(req, res){
  
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
      res.render('continue.ejs', {gtoken : gtoken, ftoken:ftoken, gconnected:gconnected, fconnected:fconnected})
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
      res.render('continue.ejs', {gtoken : gtoken, ftoken:ftoken, gconnected:gconnected, fconnected:fconnected})
    }
  });
});


app.get('/user_info',function (req,res){

  var url = 'https://graph.facebook.com/me?fields=id,name,email&access_token='+ftoken
        var headers = {'Authorization': 'Bearer '+ftoken};
        var request = require('request');

        request.get({
            headers: headers,
            url:     url,
            }, function(error, response, body){
                console.log(body);
                body2 = JSON.parse(body)
                fusername=body2.name;

                res.redirect('/homepage');
            });

});
    
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
  
  //CON EJS
  var options ={
    url: 'https://api.opentripmap.com/0.1/en/places/radius?format=geojson&apikey='+process.env.OpenMap_KEY+'&radius='+rad+'&lon='+lon+'&lat='+lat+'&kinds='+cate+'&limit='+100
  }
  request.get(options, (error, req, body)=>{
    var info = JSON.parse(body);
    data = info.features;
    n = data.length;
    res.render('list_places', {numero: n, data: data, cat: cate, citta: city});
  })
});


let info
let xid
app.get('/details', function(req,res){

  xid = req.query.xid;
  
  var options = {
    url: 'https://api.opentripmap.com/0.1/en/places/xid/'+xid+'?apikey='+process.env.OpenMap_KEY
  }
  
  request.get(options,function callback(error, response, body){
    info = JSON.parse(body);
    //Con ejs

    request.get('http://admin:admin@127.0.0.1:5984/my_database/'+xid, function callback(error, response, body){
      if(error) {
        console.log(error);
      } else {
        console.log(response.statusCode, body);
        infodb = JSON.parse(body);
        if(infodb.error != undefined){
          res.render('details', {info: info, xid: xid, lat: info.point.lat , lon: info.point.lon, api: process.env.HERE_API, reviews: ""});
        } 
        else{
          data = infodb.day+"/"+ infodb.month+"/"+ infodb.year 
          res.render('details', {info: info, xid: xid, reviews: infodb.reviews,username: infodb.name,date: data, lat: info.point.lat , lon: info.point.lon, api: process.env.HERE_API});
        }
      }

    });

  });
});


app.post('/reviews', function(req,res){

  data = new Date();
  body1={
    "name": fusername,
    "reviews": req.body.rev,
    "day": data.getDate(),
    "month": data.getMonth(),
    "year": data.getFullYear()
  };
  
  request({
    url: 'http://admin:admin@127.0.0.1:5984/my_database/'+xid,
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
          res.redirect('/details?xid='+xid);
      }
  });
});

app.get('/',function (req,res){
  res.render('index.ejs',);
});


app.get('/bootstrap.min.css',function (req,res){
  res.sendFile(path.resolve('bootstrap.min.css'));
});

var server = app.listen(8000, function () {
  var host = server.address().address;
  var port = server.address().port;
  
  console.log('Server listening at http://%s:%s', host, port);
})