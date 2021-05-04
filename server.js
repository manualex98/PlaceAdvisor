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
        res.render('homepage', {fconnected:fconnected})
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
                
                res.send("Nome:"+body2.name
                +"<br>Email: "+body2.email);
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
 
  
  
  
  
  
  
  //SENZA EJS
  /* var page="<h1>First 100 results for "+cate+" in "+city+"</h1><ul>";

  var options = {
    url: 'https://api.opentripmap.com/0.1/en/places/radius?format=geojson&apikey='+process.env.OpenMap_KEY+'&radius='+rad+'&lon='+lon+'&lat='+lat+'&kinds='+cate+'&limit='+100
  }
  
  request.get(options,function callback(error, response, body){
    //console.log(body)
    var info = JSON.parse(body);
    var data = info.features;
    var n = data.length;

    for(var i=0; i<n; i++){
      
      var details="<a href=http://localhost:8000/details?xid="+data[i].properties.xid+">Details</a>"

      if(data[i].properties.name != "") page += "<li><h3>"+data[i].properties.name+"</h3></li>"+details+"<br>"
      //else page += "<li><h3>This place hasn't a name</h3></li><br>"
    }

    page += "</ul>"
    page+='<a href="http://localhost:8000/homepage" >Go Back</a>'
    res.send(page);
    page="";
  });
*/


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
          console.log("File non trovato");
          res.render('details', {info: info, xid: xid});
        } 
        else res.render('details', {info: info, xid: xid, reviews: infodb.reviews});
      }

    });
    //res.redirect('/reviewsput');
  });
});


app.get('/reviews', function(req,res){

  body1={
    "name": "GG",
    "reviews": 'Bello111'
  };
  
  request({
    url: 'http://admin:admin@127.0.0.1:5984/my_database/'+xid,
    //qs: {city: city, val: val}, 
    method: 'PUT',
    headers: {
      'content-type': 'application/json'  //'HTML Form URL Encoded': 'application/x-www-form-urlencoded'
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

    //Senza ejs
    /*
    var via;
    if(info.address.road==undefined) via = info.address.pedestrian
    else via = info.address.road

    var civico;
    if(info.address.house_number==undefined) civico="SNC"
    else civico= info.address.house_number
    
    var FBbutton1 = '<div id="fb-root"></div><script async defer crossorigin="anonymous" src="https://connect.facebook.net/it_IT/sdk.js#xfbml=1&version=v10.0&appId=468739614360394&autoLogAppEvents=1" nonce="iFPJ5Fwi"></script>'
    
    var image="No images available"
    if(info.preview!=undefined){
    image='<img src="'+info.preview.source+'" width="'+info.preview.width+'" height="'+info.preview.height+'">'}

    var page=FBbutton1;
    page+="<h1>"+info.name+"</h1><br><h2>Details:</h2>"+image+"<br><ul>";
    
    var background = "No background available"
    if(info.wikipedia_extracts!=undefined){
      background = info.wikipedia_extracts.html
    }
    page += "<li><h3><b><i>You can find it at: </b></h3>"+via+"<b> number: </b>"+civico+"</i></li><br>"+
    "<li><h3>Background: </h3><i>"+background+"</i></li><br>"
    
    var link = 'http://127.0.0.1:8000/details?xid='+xid;
    
    var FBbutton2 = '<div class="fb-share-button" data-href="'+link+'" data-layout="button" data-size="large"><a target="_blank" href="http://www.facebook.com/sharer/sharer.php?u=http%3A%2F%2F127.0.0.1%2F8000%2F'+'details?xid='+xid+'%3A8000%2F&amp;src=sdkpreparse" class="fb-xfbml-parse-ignore">Share</a></div>'
    
    page+="<p>Share this place with your friends</p><br>"
    page+=FBbutton2;
    
    page += "</ul>"
    res.send(page);
    page="";
  });
*/


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