var express = require('express'),
    app = express();

// Web3 with our Ganache chain address 
const Web3 = require('web3')
// Set our provider to infura, pointing to Ropsten
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545/'));

// Our sellMyStuff.sol abi copied from Remix
const abi = [
	{
		"constant": false,
		"inputs": [
			{
				"name": "user",
				"type": "address"
			},
			{
				"name": "initialDeposit",
				"type": "int256"
			}
		],
		"name": "addUser",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "int256"
			},
			{
				"name": "user",
				"type": "address"
			}
		],
		"name": "deposit",
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
		"name": "removeUser",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "item",
				"type": "int256"
			},
			{
				"name": "cost",
				"type": "int256"
			},
			{
				"name": "recipient",
				"type": "address"
			},
			{
				"name": "seller",
				"type": "address"
			}
		],
		"name": "transaction",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "int256"
			},
			{
				"name": "user",
				"type": "address"
			}
		],
		"name": "withdraw",
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
				"type": "int256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}
]

// The address contract is deployed to
const address = '0xB64078F6428729Ad4E889FCE3dfe075A8Fb48959';

var sellMyStuffContract = web3.eth.Contract(abi, address);

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

app.use(express.static(__dirname, { index: 'login.html' }));

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/sellMyStuff", { useNewUrlParser: true });

var currLoggedIn = '';

var stuffSchema = new mongoose.Schema({
    user_id: String,
    item_id: Number,
    item_name: String,
    item_cost: Number,
    item_status: String
});

var loginSchema = new mongoose.Schema({
    username: String,
    password: String,
    address: String,
    balance: Number
});

var stuff = mongoose.model("stuff", stuffSchema);
var login = mongoose.model("login", loginSchema);

// [DATABASE] Adds things to the database
app.post("/addStuff", (req, res) => {
    var data = new stuff(req.body);
    data.save()
    .then(item => {
        res.send("item saved to database");
        console.log("Saved 'stuff' to database");
        console.log(data);
    })
    .catch(err => {
        res.status(400).send("unable to save to database");
    });
});

// [DATABASE] Gets things from the database
app.post("/getStuff", (req, res) => {
    stuff.find({}, function (err, stuff) {
        if (stuff) {
            console.log("Printing stuff:");
            console.log(stuff);
            res.send(stuff);
        }
    });
});

// [HELPER] Gets currently logged in user
app.post("/getUser", (req, res) => {
    login.findOne({username: currLoggedIn}, function (err, user) {
        if (user) {
                console.log("User found!");
                console.log(user);
                res.send(user);
        }
        else {
            console.log("Woah something went horribly wrong");
        }
    });
});

// [DATABASE] Verifies username/password from records stored in database
app.post("/login", (req, res) => {
    login.findOne({username: req.body.username}, function (err, user) {
        if (user) {
            if (req.body.password == user.password) {
                console.log("Login successful!");
                currLoggedIn = req.body.username;
                res.send({valid: true});
            }
            else {
                console.log("Incorrect Password!");
                res.send({valid: false});
            }
        }
        else {
            console.log("User not found!");
            res.send({valid: false});
        }
    });
});

// TODO: Need to keep mapping of addresses available to registered users
// ^ maybe copy all Ganache created addresses to array in here, when user registers, give them the next avail address
// Keep track of avail addresses

var admin = '0x919940fFAd2Ca64089A1dA818AEbd5542dE0eE13';
var avail_addresses = ['0x0314dC41EbbEdE2e2C15565B41767d81158355a9',
                       '0x16996aB5731AF1C1aBBEfaE3dDcb7788eBaa0493',
                       '0x028978514B0DADb45ED2bfe50F6F13d446744B45',
                       '0x6237c2daA44cd0CF154779f2e72B865371c2cc8f',
                       '0x43F625D4bfF85Ce5BB324F0283e625363dBBA8d3',
                       '0x8FC472a1f46522a39Ce33FE2CE5Eb50Fd5b5ea61',
                       '0x6514D51692AE2B6Df9BD3828AfCbbf8cAa6E28Df',
                       '0xF8e66cD341cF28E1Dc786167Ab67d5ecB4a49BD1',
                       '0x961E935FFB66A589EF8602838cc5AD4DE8E06647'];

var taken_addresses = [];

function getNextAvailAddress(user) {
    for (var addr in avail_addresses) {
        if (! taken_addresses.includes(avail_addresses[addr])) {
            taken_addresses.push(avail_addresses[addr]);
            return avail_addresses[addr]
        }
    }
    return ""
}

 // [DATABASE] Adds username/password combo to database
 // [CONTRACT] Maps address (user) with their initial deposit (balance) => addUser(user, deposit)

 // When creating user, need to find address from above thats not in use
// 1.) Loop through avail_addresses
// 2.) If current addr exists in database (login.findOne returns found),
//     move on. If not, return current addr
// 3.) Assign address to user (in DB and contract)

app.post("/createUser", (req, res) => {

    for (var i in avail_addresses) {

        login.findOne({address: avail_addresses[i]}, function (err, found) {
            if (!found) {
                var loginData = { username: req.body.username,
                                  password: req.body.password,
                                  address: avail_addresses[i],
                                  balance: req.body.balance }

                console.log(req.body.username + " assigned address: " + loginData.address);

                var data = new login(loginData);
                console.log(data);
                data.save() 
                .then(item => {
                    res.send("User created and saved to database");
                    console.log("Saved user to database");
                    console.log(data);

                    // Instantiates given address to balance in contracts state
                    sellMyStuffContract.methods.deposit(loginData.balance, loginData.address).send(
                        {from: admin}).then(function(r, e) {
                        console.log(r);
                    });

                })
                .catch(err => {
                    res.status(400).send("unable to save to database and create user on smart contract");
                });
            }
        });
    }
});

// [DATABASE] Removes currently listed item(s)
app.post("/removeListings", (req, res) => {
    var listings_to_remove = req.body;
    console.log(listings_to_remove);

    for (var i=0; i < listings_to_remove.length; i++) {
        var id = listings_to_remove[i];
        stuff.remove({_id: id}, function(err) {
            if (err) {
                console.log("Deletion failed");
            }
        });
    }

    res.send("Success!");

});

var port = 8080;
app.listen(port, () => {
    console.log("Server listening on port " + port);
});
