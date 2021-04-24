var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const path = require('path');
var request = require('request');
require('dotenv').config()
//let rawdata = fs.readFileSync('secrets.json');
//let sec = JSON.parse(rawdata);
var token="";
var code="";

app.get('/log',function (req,res){
  res.redirect("https://www.facebook.com/v10.0/dialog/oauth?client_id="+process.env.CLIENT_ID+"&redirect_uri=http://localhost:8000/homepage&response_type=code&scopes=user_birthday&user_hometown&user_gender");
});



app.get('/homepage', function (req,res){
  code=req.query.code;
  res.sendFile(path.resolve('homepage.html'));
});

app.get('/token',function (req,res){
  //code=req.query.code;
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
    //console.log('Upload successful!  Server responded with:', body);
    var info = JSON.parse(body);
    token = info.access_token;
    res.redirect('/api');
  });
});

app.get('/api',function (req,res){

  var url = 'https://graph.facebook.com/me?fields=id,name,birthday,hometown,gender&access_token='+token
        var headers = {'Authorization': 'Bearer '+token};
        var request = require('request');

        request.get({
            headers: headers,
            url:     url,
            }, function(error, response, body){
                console.log(body);
                body2 = JSON.parse(body)
                res.send("Nome:"+body2.name
                +"<br>Birthday: "+body2.birthday
                +"<br>Hometown: "+body2.hometown.name
                +"<br>Gender: "+body2.gender);
            });

});






app.get('/',function (req,res){
  res.sendFile(path.resolve('index.html'));
});


app.get('/bootstrap.min.css',function (req,res){
  res.sendFile(path.resolve('bootstrap.min.css'));
});



var server = app.listen(8000, function () {
  var host = server.address().address;
  var port = server.address().port;
  
  console.log('Server listening at http://%s:%s', host, port);
});