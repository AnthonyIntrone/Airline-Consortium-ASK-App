var express = require('express'),
	app = express();

// Web3 with our Ganache chain address 
const Web3 = require('web3')
// Set our provider to infura, pointing to Ropsten
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545/'));

app.use(express.static(__dirname));

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://tj:123@cse410lab2-dx4rd.mongodb.net/test?retryWrites=true";
const client = new MongoClient(uri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 1000 });

// MongoClient.connect(uri, { reconnectTries: Number.MAX_VALUE, reconnectInterval: 1000 }, 
// 	function(err, db) {
// 		if (err) throw err;
// 		console.log("Connected to MongoDB Atlas...");
// 	}
// );

/* server: { 
        // sets how many times to try reconnecting
        reconnectTries: Number.MAX_VALUE,
        // sets the delay between every retry (milliseconds)
        reconnectInterval: 1000 
		} */
		
client.connect(err => { 
	if (err) throw err; 
	console.log("Conntected to MongoDB Atlas...");
});

// client.connect(err => {
// 	if (err) throw err;
// 	console.log('Connected to MongoDB Atlas...');
// 	const logins = client.db("ask").collection("logins");
// 	const flights = client.db("ask").collection("flights");
// 	// perform actions on the collection object
// 	logins.findOne({}, function(err, result) {
// 		if (err) throw err;
// 		console.log(result);
// 	})
// 	client.close();
// });


// Our sellMyStuff.sol abi copied from Remix
// const abi = 

// The address contract is deployed to
// const address = '0xB64078F6428729Ad4E889FCE3dfe075A8Fb48959';

// var sellMyStuffContract = web3.eth.Contract(abi, address);

/* Example calls to the sellMyStuff smart contract.
 * This example uses promise callbacks to:
 * 1.) Deposit '100' into the address 
 * 2.) Wait for it to complete, then call checkBalance
 * 3.) Wait for that to complete, then print out the new balance after deposit. 
 * NOTE: use .send() for functions that modify state (setters), and .call() for getters */
// sellMyStuffContract.methods.deposit(100, '0x919940fFAd2Ca64089A1dA818AEbd5542dE0eE13').send(
//     {from: '0x0314dC41EbbEdE2e2C15565B41767d81158355a9'}).then(function(r, e) {
//     console.log(r);
//     sellMyStuffContract.methods.checkBalance('0x919940fFAd2Ca64089A1dA818AEbd5542dE0eE13').call().then(function(r, e) {
//         console.log("Balance is now " + r);
//     });
// });

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

var currLoggedIn = '';

// SETUP DEMO
// Sets up database with a bunch of flights from different airlines that users can reserve
// After a user has a reserved flight, they can request a change
// After a request is made, airline reaches out to other airline and transfers seat
// Sends a response back to user (success/fail)

// [HELPER] Gets currently logged in user
app.post("/getUser", (req, res) => {
	// login.findOne({
	// 	username: currLoggedIn
	// }, function (err, user) {
	// 	if (user) {
	// 		console.log("User found!");
	// 		console.log(user);
	// 		res.send(user);
	// 	} else {
	// 		console.log("Woah something went horribly wrong");
	// 	}
	// });
});

// [DATABASE] Verifies username/password from records stored in database
app.post("/login", (req, res) => {
		const logins = client.db("ask").collection("logins");
		// perform actions on the collection object
		logins.findOne({username: req.body.username}, function(err, result) {
			if (err) throw err;
			if (result) {
				console.log(result);
				if (req.body.password == result.password) {
					console.log("Login successful!");
					currLoggedIn = req.body.username;
					res.send({ valid: true });
				}
				else {
					console.log("Incorrect Password!");
					res.send({ valid: false });
				}
			}
			else {
				console.log("User not found!");
				res.send({ valid: false });
			}
		})
});

// [DATABASE] Adds username/password combo to database
app.post("/createUser", (req, res) => {

	// for (var i in avail_addresses) {

	// 	login.findOne({
	// 		address: avail_addresses[i]
	// 	}, function (err, found) {
	// 		if (!found) {
	// 			var loginData = {
	// 				username: req.body.username,
	// 				password: req.body.password,
	// 				address: avail_addresses[i],
	// 				balance: req.body.balance
	// 			}

	// 			console.log(req.body.username + " assigned address: " + loginData.address);

	// 			var data = new login(loginData);
	// 			console.log(data);
	// 			data.save()
	// 				.then(item => {
	// 					res.send("User created and saved to database");
	// 					console.log("Saved user to database");
	// 					console.log(data);

	// 					// Instantiates given address to balance in contracts state
	// 					sellMyStuffContract.methods.deposit(loginData.balance, loginData.address).send({
	// 						from: admin
	// 					}).then(function (r, e) {
	// 						console.log(r);
	// 					});

	// 				})
	// 				.catch(err => {
	// 					res.status(400).send("unable to save to database and create user on smart contract");
	// 				});
	// 		}
	// 	});
	// }
});

//******************************************************/

app.get('/', function (req, res) {
	res.sendFile('login.html', {
		root: __dirname + "/views/"
	});
});

var port = 8080;
app.listen(port, () => {
	console.log("Server listening on port " + port);
});