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

// const logins = client.db("ask").collection("logins");
// const flights = client.db("ask").collection("flights");

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

// [HELPER] Gets currently logged in user
app.post("/getUser", (req, res) => {
	const logins = client.db("ask").collection("logins");
	logins.findOne({
		username: currLoggedIn
	}, function (err, user) {
		if (user) {
			console.log("User found!");
			console.log(user);
			res.send(user);
		} else {
			console.log("Woah something went horribly wrong");
		}
	});
});

app.post("/getAirlineUser", (req, res) => {
	const logins = client.db("ask").collection("airline_logins");
	logins.findOne({
		username: currLoggedIn
	}, function (err, user) {
		if (user) {
			console.log("User found!");
			console.log(user);
			res.send(user);
		} else {
			console.log("Woah something went horribly wrong");
		}
	});
});

// [DATABASE] Gets all flights from the database
app.post("/getFlights", (req, res) => {
	const flights = client.db("ask").collection("flights");
    flights.find().toArray(function(e, d) {
        if (d.length > 0) {
            // console.log("Printing flights:");
            // console.log(JSON.stringify(d));
            res.send(JSON.stringify(d));
		}
		else {
			console.log("No flights found!");
		}
	});
});

app.post("/addFlight", (req, res) => {
	const flights = client.db("ask").collection("flights");
    try {
		flights.insertOne( { flight_num: req.body.flight_num, comp: req.body.comp, from: req.body.from, to: req.body.to, 
							 departing: req.body.departing, arriving: req.body.arriving, cost: req.body.cost, 
							 status: "unbooked", booked_by: "null" } );
		console.log("Flight added successfully!");
		res.send({valid: true});
	}
	catch(e) {
		console.log(e);
	}
});

app.post("/removeFlights", (req, res) => {
	const flights = client.db("ask").collection("flights");
	var nums = req.body;
	console.log(nums);
	for (var i=0; i<nums.length; ++i) {
		flights.deleteOne( {flight_num: nums[i]}, function(err, obj) {
			if (err) throw err;
			console.log("Flight " + nums[i] + " removed from db!");
		});
	}
	res.send(JSON.stringify("Flights removed from DB!"));
});

// [DATABASE] Gets all flights from the database for a given airline (given in req.body.user)
app.post("/getAirlineFlights", (req, res) => {
	const flights = client.db("ask").collection("flights");
    flights.find().toArray(function(e, d) {
        if (d.length > 0) {
			var good_ones = [];
			for (var i=0; i<d.length; ++i) {
				var temp = d[i];
				if (temp.comp == req.body.user) {
					good_ones.push(temp);
				}
			}
            res.send(JSON.stringify(good_ones));
		}
		else {
			console.log("No flights found!");
		}
	});
});

// [DATABASE] Gets all flights from the database for a given airline (given in req.body.user)
app.post("/getAirlineRequests", (req, res) => {
	const requests = client.db("ask").collection("requests");
	const flights = client.db("ask").collection("flights");

	var good_ones = [];

	// 1.) For each request, send back arrays of requests FROM user only
	requests.find().toArray(function(e, d) {
		if (d.length > 0) {
			for (var i=0; i<d.length; ++i) {
				var temp = d[i];
				console.log(temp);
				if (temp.from_comp == req.body.user) {
					good_ones.push(temp);
				}
			}
			res.send(JSON.stringify(good_ones))
		}
		else {
			console.log("No flights found!");
		}
	});
});

app.post("/bookFlight", (req, res1) => {
	console.log(req.body);
	const flights = client.db("ask").collection("flights");
	const logins = client.db("ask").collection("logins");

	// Check that user doesn't already have a booked flight
	logins.findOne({username: req.body.user}, function(err, res) {
		if (err) throw err;
		if (res.booked_num != -1) {
			console.log("User has already booked a flight!");
			res1.send(JSON.stringify("User has already booked a flight!"));
		}
		else {
			// Update flights "booked_by"
			var query = { flight_num: req.body.flight_num };
			var vals = { $set: {status: "booked", booked_by: req.body.user } };
			flights.updateOne(query, vals, function(err, res) {
				if (err) throw err;
				console.log("Flight updated in bookFlight!");
				// res1.send(JSON.stringify("success!"));
			});
			// Update users balance and booked_num
			// Find flight to pull cost
			flights.findOne({flight_num: req.body.flight_num}, function(err, flight) {
				if (err) throw err;
				// Find user to pull balance
				logins.findOne({username: req.body.user}, function (err, login) {
					if (err) throw err;
					var newBalance = login.balance - flight.cost;
					var bookNum = flight.flight_num;
					// Update users balance and booked flight
					var query = {username: req.body.user};
					var vals = { $set: {balance: newBalance, booked_num: bookNum} };
					logins.updateOne(query, vals, function(err, res) {
						if (err) throw err;
						console.log("User updated in bookFlight!");
						res1.send(JSON.stringify("success!"));
					});
				});
			});
		}
	});		
});

// Makes request to swap airlines
app.post("/changeFlight", (req, res) => {
	console.log(req.body);
	const requests = client.db("ask").collection("requests");
	const flights = client.db("ask").collection("flights");
	const logins = client.db("ask").collection("logins");

	// 1.) find users flight he's booked on
	flights.findOne({booked_by: req.body.user}, function(err, result) {
		if (err) throw err;
		if (result) {
			console.log(result);
			// 2.) Find flight they want to switch too
			flights.findOne({flight_num: req.body.switch_num}, function(err, swapFlight) {
				if (err) throw err;
				if (swapFlight) {
					// 3.) Add new document (requests)
					try {
						requests.insertOne( { user: req.body.user, from_flight_num: result.flight_num, from_comp: result.comp,
											  to_flight_num: swapFlight.flight_num, to_comp: swapFlight.comp, status: "unapproved"} );
						console.log("Request made successfully!");
						// Update users balance and booked flight
						var query = {username: req.body.user};
						var vals = { $set: {request: "flight " + swapFlight.flight_num + " -- pending approval"} };
						logins.updateOne(query, vals, function(err, result) {
							if (err) throw err;
							console.log("User updated!");
							res.send(JSON.stringify({valid: true}));
						});
					}
					catch(e) {
						console.log(e);
					}
				}
				else {
					console.log("User wants to swap to unexisting flight!");
					res.send({valid: false});
				}
			});
		}
		else {
			console.log("User hasn't booked any flights.");
			res.send(JSON.stringify({valid: false}));
		}
	});
});

// [DATABASE] Verifies username/password from records stored in database
app.post("/login", (req, res) => {
	const logins = client.db("ask").collection("logins");
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

	const logins = client.db("ask").collection("logins");

	var user = req.body.username;
	var pass = req.body.password;
	var addr = req.body.address;
	var bal = req.body.balance;

	try {
		logins.insertOne( { username: user, password: pass, address: addr, balance: bal} );
	}
	catch(e) {
		console.log(e);
	}
});

// [DATABASE] Verifies username/password from records stored in database
app.post("/airlineLogin", (req, res) => {
	console.log(req.body);
	const logins = client.db("ask").collection("airline_logins");
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
	});
});

// [DATABASE] Adds username/password combo to database
// TODO: Deduct 1 eth from address
app.post("/createAirline", (req, res) => {

	const logins = client.db("ask").collection("airline_logins");

	var user = req.body.username;
	var pass = req.body.password;
	var addr = req.body.address;

	try {
		logins.insertOne( { username: user, password: pass, address: addr} );
	}
	catch(e) {
		console.log(e);
	}

	// DEDUCT 1 ETH
});

/* 
 * 1.) Pull base flight from request
 * 2.) Pull req flight from request
 * 3.) Pull base airline address from logins
 * 4.) Pull req airline address from logins
 * 5.) Send req airline address a "request" from base airline address to swap flights
*/
app.post("/approveReq", (req, res) => {
	const flights = client.db("ask").collection("flights");
	const requests = client.db("ask").collection("requests");


});

/*
 * 1.) Find request with matching name
 * 2.) Remove request from db
*/
app.post("/denyReq", (req, res) => {
	const requests = client.db("ask").collection("requests");

	console.log(req.body);

	requests.findOne({user: req.body.user}, function(err, result) {
		if (err) throw err;
		if (result) {
			requests.deleteOne( {user: req.body.user, from_flight_num: result.from_flight_num}, function(err, obj) {
				if (err) throw err;
				console.log("Request removed from db!");
				res.send({valid: true});
			});
		}
	});
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