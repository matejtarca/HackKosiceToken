require("reflect-metadata")

var http = require('http');
const WebSocket = require('ws');
const { AssetAmount, ChainObject, Credentials, DCoreSdk, OperationHistory, TransactionConfirmation} = require('dcorejs-sdk')

const dcoreApi = DCoreSdk.createForWebSocket(() => new WebSocket("wss://testnet-api.dcore.io"));
var creds = new Credentials(ChainObject.parse("1.2.41"), '5JKudCkXzMrkXmQiVwdG4ntgkCqmxi9wSfS5HU3HryvNCk1bjNN');

const session = require('express-session');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()

var database = [
    {"username":"dw-novak-samuel", "password":"admin", "type":"0", "private_key": "5JF5d4ZPMNAsdhJ2yWspzPZK15fxdTXWeGwRr1eycbNvgRpK6Hp", "badges":[1,0,0,1]},
    {"username":"dw-tabacka", "password": "tabacka123", "type":"1", "private_key": "5JSQQJ8EaWXLQuWPyobrmoUPjHWLqzR2RchFabWYNgtnFUA9tPr", "badges":[0,0,0,1]}

]

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
	if (req.session.loggedin) {
		res.redirect('/home');
	}
	else {
    res.render('index', {message: null});
}
})

app.get('/home', async function (request, response) {
    if (request.session.loggedin) {
    	var name = request.session.username;
    	var user = database[get_index(name)];
    	var id = await GetIdFromName(name);
		var balance = await Balance(id);
		user.badges = await UpdateBadges(name);
		response.render('home', {username: name, balance: balance, type: user.type, badges: user.badges});
	} else {
		response.redirect('/');
	}
	response.end();
})

app.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
        if(is_username(username)){
            if(database[get_index(username)].password === password){
                request.session.loggedin = true;
                request.session.username = username;
                response.redirect('/home');
            } else {
                response.render('index', {message:"Incorrect password"});
            }
        } else {
            response.render('index', {message:"Please enter a valid username"})
        }  
	} else {
		response.render('index', {message:"Please enter username and password"})
		response.end();
	}
});

app.post('/home', function(request, response){
	request.session.loggedin = false
	response.redirect('/')
	response.end()
})

app.get('/history', async function (request, res) {
	if (request.session.loggedin) {
	var name = request.session.username;
    var id = await GetIdFromName(name);
	var history = await History(id);
	history = await PrepareHistory(history, name);
	var balance = await Balance(id);
	res.render('history', {history: history, balance: balance, username: name, logged: request.session.loggedin});
}
else {
	res.render('history', {history: null, balance: null, username: null, logged: request.session.loggedin});
}
})

app.post('/history', async function (req, res) {
		var name = req.body.name;
		var id = await GetIdFromName(name);
		var history = await History(id);
		history = await PrepareHistory(history, name);
		var balance = await Balance(id);
		res.render('history', {history: history, balance: balance, username: name, logged: req.session.loggedin});

})

app.get('/send', function (req, res) {
  res.render('send');
})

app.post('/send', async function (req, res) {
	if (req.session.loggedin) {
		var user = database[get_index(req.session.username)];
		var id = await GetIdFromName(req.body.name);
		var balance = await Balance(await GetIdFromName(user.username))
		if(parseInt(req.body.amount) < parseInt(balance) && req.body.name !== user.username){
			try{
				Transfer(id, req.body.amount, user.username, user.private_key);
			} finally{
				1
			}
		} else {
			console.log('nnei dost')
		}
		res.redirect('/home');
	} else {
		res.redirect('/');
	}
})

app.listen(8080, '0.0.0.0', function () {
  console.log('Server started');
})

async function UpdateBadges(name) {
	badges = [0, 0, 0, 0];
	id = await GetIdFromName(name)
	history = await PrepareHistory(await History(id), name)
	total_tabacka = 0
	for(i=0;i<history.length;i++){
		trans = history[i]
		if(trans[0] === 'dw-tabacka'){
			total_tabacka += trans[1]
		}
	}
	if(total_tabacka > 499){
		badges[3] = 1
	}
	return badges;
}

function is_username(content) {
    for(i = 0; i < database.length; i++){
        if(database[i].username == content){
            return true
        }
    }
    return false
}

function get_index(username) {
    for(i = 0; i < database.length; i++){
        if(database[i].username == username){
            return i
        }
    }
}

async function PrepareHistory(history, username) {
	var new_history = [];
	for (var i = 0; i < history.length; i++) {
		if (history[i].op[0] == 0 || history[i].op[0] == 39) {
			if (history[i].op[1].amount.asset_id == '1.3.33') {
				var name = await GetNameFromId(history[i].op[1].to);
				if (name != username) {
					new_history.push([name, history[i].op[1].amount.amount, 0]);
				}
				else {
					name = await GetNameFromId(history[i].op[1].from);
					new_history.push([name, history[i].op[1].amount.amount, 1]);
				}
			}
		}
	}
	return new_history;
}

async function GetTransaction(id) {
	const transaction = await dcoreApi.transactionApi.getById(id).toPromise();
}

async function GetIdFromName(name) {
	const account = await dcoreApi.accountApi.getByName(name).toPromise();
	return account.id.objectId;
}

async function GetNameFromId(id) {
	const account = await dcoreApi.accountApi.get(ChainObject.parse(id)).toPromise();
	return account.name;
}

async function Account() {
	const account = await dcoreApi.accountApi.getByName('decent').toPromise();
}

async function Balance(id) {
	var b = await dcoreApi.balanceApi.get(ChainObject.parse(id), ChainObject.parse("1.3.33")).toPromise();
	return b.amount.toString();
}

function History(id) {
	return dcoreApi.historyApi.listOperations(ChainObject.parse(id)).toPromise();
}

async function Transfer(id, amount, username, key) {
	var user_id = await GetIdFromName(username);
	var creds = new Credentials(ChainObject.parse(user_id), key);
	dcoreApi.accountApi.transfer(creds, id, new AssetAmount(amount, ChainObject.parse("1.3.33"))).subscribe(value => console.log(value));
}


/*
http.createServer(async function (req, res) {
  var response = await History();
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(response[0].op[0].toString())
  res.end('success');
}).listen(8080); 


console.log('Server started'); */


/*
dcoreApi.accountApi.transfer(creds, "1.2.41", new AssetAmount(5), "x")
	.subscribe((value) => {
		console.log(value);
	});

const account = await dcoreApi.accountApi.getByName('decent').toPromise();
*/