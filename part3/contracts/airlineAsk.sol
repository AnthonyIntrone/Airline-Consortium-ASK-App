pragma solidity ^0.5.0;

contract airlineAsk {
    
    /*** State variables ***/
    
    // Balance for each user
    mapping (address => uint) private balances;
    // Is user registered?
    mapping (address => bool) private registered;

    /*** Constructor ***/

    constructor() public {
        balances[msg.sender] = 0;
        registered[msg.sender] = true;
    }
    
    /*** Functions ***/
    
    /* 1. Register 2. Request 3. Response 4. SettlePayment 5. Unregister 6. BalanceDetails (public - more for debugging purposes) */
    
    function register(address user, uint balance) private {
        balances[user] = balance;
        registered[user] = true;
    }
    
    function unregister(address user) private {
        registered[user] = false;
        delete balances[user];
    }
    
    function request(int currFlightNumber, int reqestedFlightNumber) private {

    }
    
    function response(int amount, address user) private {

    }
    
    function checkBalance(address user) public view returns (uint) {
        return balances[user];
    }    
    
    function settlePayment(int cost, address recipient, address seller) private {

    }
}