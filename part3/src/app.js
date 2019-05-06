var express = require('express'),
	app = express();

// Web3 with our Ganache chain address 
const Web3 = require('web3')
// Set our provider to infura, pointing to Ropsten
const web3 = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/0a71703c852247ca9dfc5336a78ef7fa'));

const Tx = require('ethereumjs-tx');

app.use(express.static(__dirname));

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://tj:123@cse410lab2-dx4rd.mongodb.net/test?retryWrites=true";
const client = new MongoClient(uri, { useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 1000 });

client.connect(err => { 
	if (err) throw err; 
	console.log("Conntected to MongoDB Atlas...");
});

// Our airlineAsk.sol abi copied from Remix
const abi = [
	{
		"constant": false,
		"inputs": [
			{
				"name": "requestNum",
				"type": "uint256"
			},
			{
				"name": "status",
				"type": "int256"
			}
		],
		"name": "updateRequest",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "user",
				"type": "address"
			}
		],
		"name": "unregister",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "a",
				"type": "address"
			},
			{
				"name": "b",
				"type": "address"
			},
			{
				"name": "cost",
				"type": "uint256"
			}
		],
		"name": "settlePayment",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "user",
				"type": "address"
			}
		],
		"name": "checkBalance",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "user",
				"type": "address"
			},
			{
				"name": "balance",
				"type": "uint256"
			}
		],
		"name": "register",
		"outputs": [],
		"payable": true,
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "requestNum",
				"type": "uint256"
			}
		],
		"name": "getRequestStatus",
		"outputs": [
			{
				"name": "",
				"type": "int256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "requestNum",
				"type": "uint256"
			}
		],
		"name": "createRequest",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "constructor"
	}
]

// The address contract is deployed to on Ropsten
const contractAddr = '0x0587aceBcbF1250B548eE948f8C6cC6c5d58c972';

var airlineAskContract = web3.eth.Contract(abi, contractAddr);

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
		username: req.body.username
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
		username: req.body.username
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
	console.log("in getAirlineFlights...");
	console.log(req.body);
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
				else if (temp.to_comp == req.body.user && temp.status == "pending approval") {
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
					// Get highest request 
					requests.find().toArray(function(e, d) {
						var num = d.length + 1;
						// 3.) Add new document (requests)
						try {
							requests.insertOne( { user: req.body.user, request_num: num, from_flight_num: result.flight_num, from_comp: result.comp,
												to_flight_num: swapFlight.flight_num, to_comp: swapFlight.comp, status: "unapproved"} );
							console.log("Request made successfully!");
							// Update users balance and booked flight
							var query = {username: req.body.user};
							var vals = { $set: {request: "flight " + swapFlight.flight_num + " -- unapproved", request_num: num} };
							logins.updateOne(query, vals, function(err, result) {
								if (err) throw err;
								console.log("User updated!");
								res.send(JSON.stringify({valid: true}));
							});
							// Find user to pull addr to send createRequest transaction
							logins.findOne({username: req.body.user}, function(err, result) {
								if (err) throw err;
								if (result) {
									// airlineAskContract.methods.createRequest(num)
									// 	.send({from: result.address}).then(function(r, e) {
									// 		if (e) throw e;
									// 		console.log(r);
									// });
									var privateKey = new Buffer(result.private_key, 'hex');

									var call = airlineAskContract.methods.createRequest(num);
									var encodedABI = call.encodeABI();

									// Price is high to make sure its mined quick
									// 5 wei => FAST MINING (<2 minutes) | 3 wei => standard (<5 minutes)
									const gasPriceHex = web3.utils.toHex(50e9); // 50 Gwei
									const gasLimitHex = web3.utils.toHex(3000000);

									// get transaction count for the nonce
									web3.eth.getTransactionCount(result.address).then(txCount => {

											var txData = {
												nonce: web3.utils.toHex(txCount),
												gasPrice: gasPriceHex,
												gasLimit: gasLimitHex,
												data: encodedABI,
												from: result.address,
												to: contractAddr,
											};

											var tx = new Tx(txData);
											tx.sign(privateKey);

											const serializedTx = tx.serialize().toString('hex');
											web3.eth.sendSignedTransaction('0x' + serializedTx, function(err, result) {
												if (err) return console.log('error', err)
												console.log('sent', result)
											})
									})
								}
							});
						}
						catch(e) {
							console.log(e);
						}
					});
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
// [CONTRACT] Calls register with user/balance given
app.post("/createUser", (req, res) => {

	const logins = client.db("ask").collection("logins");

	var user = req.body.username;
	var pass = req.body.password;
	var addr = req.body.address;
	var key = req.body.priv_key;
	var bal = req.body.balance;

	try {
		logins.insertOne( { username: user, password: pass, address: addr, private_key: key, balance: bal, booked_num: -1, request: "none pending", request_num: -1} );
		// airlineAskContract.methods.register(addr, bal)
		// 	.send({from: addr}).then(function(r, e) {
		// 		if (e) throw e;
		// 		console.log(r);
		// 		res.send({ valid: true });
		// });

		var privateKey = new Buffer(key, 'hex');

		var register = airlineAskContract.methods.register(addr, bal);
		var encodedABI = register.encodeABI();

		// Price is high to make sure its mined quick
		// 5 wei => FAST MINING (<2 minutes) | 3 wei => standard (<5 minutes)
		const gasPriceHex = web3.utils.toHex(50e9); // 50 wei
		const gasLimitHex = web3.utils.toHex(3000000);

		// get transaction count for the nonce
		web3.eth.getTransactionCount(addr).then(txCount => {

				var txData = {
					nonce: web3.utils.toHex(txCount),
					gasPrice: gasPriceHex,
					gasLimit: gasLimitHex,
					data: encodedABI,
					from: addr,
					to: contractAddr
				};

				var tx = new Tx(txData);
				tx.sign(privateKey);

				const serializedTx = tx.serialize().toString('hex');
				web3.eth.sendSignedTransaction('0x' + serializedTx, function(err, result) {
					if (err) return console.log('error', err)
					console.log('sent', result)
				})
		})
	}		
	catch(e) {
		console.log(e);
		res.send({ valid: false });
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
app.post("/createAirline", (req, res) => {

	const logins = client.db("ask").collection("airline_logins");

	var user = req.body.username;
	var pass = req.body.password;
	var addr = req.body.address;
	var key = req.body.priv_key;

	console.log(req.body);

	try {
		logins.insertOne( { username: user, password: pass, address: addr, private_key: key, balance: 10000000000} );
		// airlineAskContract.methods.register(addr, 10000000000)
		// 	.send({from: addr}).then(function(r, e) {
		// 		if (e) throw e;
		// 		console.log(r);
		// 		res.send({ valid: true });
		// });
		var privateKey = new Buffer(key, 'hex');

		var register = airlineAskContract.methods.register(addr, 10000000000);
		var encodedABI = register.encodeABI();

		// Price is high to make sure its mined quick
		// 5 wei => FAST MINING (<2 minutes) | 3 wei => standard (<5 minutes)
		const gasPriceHex = web3.utils.toHex(50e9); // 50 Gwei
		const gasLimitHex = web3.utils.toHex(3000000);

		// get transaction count for the nonce
		web3.eth.getTransactionCount(addr).then(txCount => {

				var txData = {
					nonce: web3.utils.toHex(txCount),
					gasPrice: gasPriceHex,
					gasLimit: gasLimitHex,
					data: encodedABI,
					from: addr,
					to: contractAddr,
					// 1 ether in value to pay to join constorium
					// value: web3.utils.toHex(1e18)
				};

				var tx = new Tx(txData);
				tx.sign(privateKey);

				const serializedTx = tx.serialize().toString('hex');
				web3.eth.sendSignedTransaction('0x' + serializedTx, function(err, result) {
					if (err) return console.log('error', err)
					console.log('sent', result)
				})
		})
	}
	catch(e) {
		console.log(e);
		res.send({ valid: false });
	}
	// DEDUCT 1 ETH
});

app.post("/approveReq", (req, res) => {
	const flights = client.db("ask").collection("flights");
	const requests = client.db("ask").collection("requests");
	const airline_logins = client.db("ask").collection("airline_logins");
	const logins = client.db("ask").collection("logins");

	console.log("=======================================");
	console.log(req.body);

	// 1.) Get request
	requests.findOne({user: req.body.user}, function(err, result) {
		if (err) throw err;
		var req_num = result.request_num;
		var from_comp = result.from_comp;
		var to_comp = result.to_comp;
		var from_flight_num = result.from_flight_num;
		var to_flight_num = result.to_flight_num;
		var user = result.user;
		console.log(result);
		if (result) {
			// Switch on request 'status'
			switch(result.status) {
				// Airline A initially approves flight change, updates status of request which puts it in Airline B's request Q
				case "unapproved":
					var query = {user: req.body.user};
					var vals = { $set: {status: "pending approval"} };
					requests.updateOne(query, vals, function(err, result) {
						if (err) throw err;
						console.log("Request status updated!");
					});
					// Update users request status to 'pending approval'
					var query = {username: user};
					var vals = { $set: {request: "flight " + to_flight_num + " -- pending approval"} };
					logins.updateOne(query, vals, function(err, result) {
						if (err) throw err;
						console.log("Users request status updated!");
					});

					// Update request status on chain
					airline_logins.findOne({username: from_comp}, function(err, airline) {
						if (err) throw err;
						// Call settle payment
						// airlineAskContract.methods.updateRequest(req_num, 1)
						// 	.send({from: airline.address}).then(function(r, e) {
						// 		if (e) throw e;
						// 		console.log(r);
						// });
							var privateKey = new Buffer(airline.private_key, 'hex');

							var call = airlineAskContract.methods.updateRequest(req_num, 1);
							var encodedABI = call.encodeABI();

							// Price is high to make sure its mined quick
							// 5 wei => FAST MINING (<2 minutes) | 3 wei => standard (<5 minutes)
							const gasPriceHex = web3.utils.toHex(50e9); // 50 Gwei
							const gasLimitHex = web3.utils.toHex(3000000);

							// get transaction count for the nonce
							web3.eth.getTransactionCount(airline.address).then(txCount => {

									var txData = {
										nonce: web3.utils.toHex(txCount),
										gasPrice: gasPriceHex,
										gasLimit: gasLimitHex,
										data: encodedABI,
										from: airline.address,
										to: contractAddr,
									};

									var tx = new Tx(txData);
									tx.sign(privateKey);

									const serializedTx = tx.serialize().toString('hex');
									web3.eth.sendSignedTransaction('0x' + serializedTx, function(err, result) {
										if (err) return console.log('error', err)
										console.log('sent', result)
									})
							})
						res.send(JSON.stringify({valid: true}));
					});
					break;

				// Airline B finally approves change, updates status of request, 
				//     calls 'settlePayment' where Airline A pays Airline B the cost of the flight to swap to
				case "pending approval":
					var query = {user: req.body.user};
					var vals = { $set: {status: "approved"} };
					requests.updateOne(query, vals, function(err, result) {
						if (err) throw err;
						console.log("Request status updated!");
					});

					// Update users request status to "approved", booked flight to new one
					var query = {username: user};
					var vals = { $set: {request: "flight " + to_flight_num + " -- approved", booked_num: to_flight_num} };
					logins.updateOne(query, vals, function(err, result) {
						if (err) throw err;
						console.log("Users request status updated!");
					});

					// Update flights status to booked/unbooked respectfully
					var query = {flight_num: from_flight_num};
					var vals = { $set: {status: "unbooked", booked_by: "null"} };
					flights.updateOne(query, vals, function(err, result) {
						if (err) throw err;
						console.log("From flight booked status updated!");
					});

					// Update flights status to booked/unbooked respectfully
					var query = {flight_num: to_flight_num};
					var vals = { $set: {status: "booked", booked_by: user} };
					flights.updateOne(query, vals, function(err, result) {
						if (err) throw err;
						console.log("From flight booked status updated!");
					});

					// Remove request
					requests.findOne({user: req.body.user}, function(err, result) {
						if (err) throw err;
						if (result) {
							requests.deleteOne( {user: req.body.user, from_flight_num: result.from_flight_num}, function(err, obj) {
								if (err) throw err;
								console.log("Request removed from db!");
							});
						}
					});

					// Update request status on chain
					airline_logins.findOne({username: to_comp}, function(err, airline) {
						if (err) throw err;
						// Call settle payment
						// airlineAskContract.methods.updateRequest(req_num, 2)
						// 	.send({from: airline.address}).then(function(r, e) {
						// 		if (e) throw e;
						// 		console.log(r);
						// });
						var privateKey = new Buffer(airline.private_key, 'hex');

						var call = airlineAskContract.methods.updateRequest(req_num, 2);
						var encodedABI = call.encodeABI();

						// Price is high to make sure its mined quick
						// 5 wei => FAST MINING (<2 minutes) | 3 wei => standard (<5 minutes)
						const gasPriceHex = web3.utils.toHex(50e9); // 50 Gwei
						const gasLimitHex = web3.utils.toHex(3000000);

						// get transaction count for the nonce
						web3.eth.getTransactionCount(airline.address).then(txCount => {

								var txData = {
									nonce: web3.utils.toHex(txCount),
									gasPrice: gasPriceHex,
									gasLimit: gasLimitHex,
									data: encodedABI,
									from: airline.address,
									to: contractAddr,
								};

								var tx = new Tx(txData);
								tx.sign(privateKey);

								const serializedTx = tx.serialize().toString('hex');
								web3.eth.sendSignedTransaction('0x' + serializedTx, function(err, result) {
									if (err) return console.log('error', err)
									console.log('sent', result)
								})
						})
					});

					// Get address of 'from_comp'/'to_comp'
					console.log(from_comp + " || " + to_comp)
					airline_logins.findOne({username: from_comp}, function(err, from) {
						if (err) throw err;
						console.log("FROM: " + from);
						airline_logins.findOne({username: to_comp}, function(err, to) {
							if (err) throw err;
							console.log("TO: " + from);
							// get cost of flight
							flights.findOne({flight_num: to_flight_num}, function(err, flight) {
								if (err) throw err;
								// Call settle payment (NOTE: 'from' company is going to pay for chain transaction costs)
								// airlineAskContract.methods.settlePayment(from.address, to.address, flight.cost)
								// 	.send({from: from.address}).then(function(r, e) {
								// 		if (e) throw e;
								// 		console.log(r);
								// });
								var privateKey = new Buffer(from.private_key, 'hex');

								var call = airlineAskContract.methods.settlePayment(from.address, to.address, flight.cost);
								var encodedABI = call.encodeABI();

								// Price is high to make sure its mined quick
								// 5 wei => FAST MINING (<2 minutes) | 3 wei => standard (<5 minutes)
								const gasPriceHex = web3.utils.toHex(50e9); // 50 Gwei
								const gasLimitHex = web3.utils.toHex(3000000);

								// get transaction count for the nonce
								web3.eth.getTransactionCount(from.address).then(txCount => {

										var txData = {
											nonce: web3.utils.toHex(txCount),
											gasPrice: gasPriceHex,
											gasLimit: gasLimitHex,
											data: encodedABI,
											from: from.address,
											to: contractAddr,
										};

										var tx = new Tx(txData);
										tx.sign(privateKey);

										const serializedTx = tx.serialize().toString('hex');
										web3.eth.sendSignedTransaction('0x' + serializedTx, function(err, result) {
											if (err) return console.log('error', err)
											console.log('sent', result)
										})
								})
								res.send(JSON.stringify({valid: true}));
							});
						});
					});
					break;

				default:
					res.send(JSON.stringify({valid: false}));
			}
		}
	});
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

//******************************************************/});

app.get('/', function (req, res) {
	res.sendFile('login.html', {
		root: __dirname + "/views/"
	});
});

var port = 8080;
app.listen(port, () => {
	console.log("Server listening on port " + port);
});