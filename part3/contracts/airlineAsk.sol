pragma solidity ^0.5.0;

contract airlineAsk {
    
    /*** State variables ***/
    
    // Balance for each user/airline
    mapping (address => uint) private balances;
    // Mapping status codes to request numbers
    /* 
     * Status codes:
     * -1: denied
     * 0: unapproved
     * 1: pending approval
     * 2: approved 
     */
    mapping (uint => int) private requests;
    // Is user registered?
    mapping (address => bool) private registered;

    /*** Constructor ***/

    constructor() public {
        balances[msg.sender] = 0;
        registered[msg.sender] = true;
    }
    
    /*** Functions ***/
    
    /* 1. Register 2. Request 3. Response 4. SettlePayment 5. Unregister 6. BalanceDetails (public - more for debugging purposes) */
    
    function register(address user, uint balance) payable public {
        balances[user] = balance;
        registered[user] = true;
    }
    
    function unregister(address user) public {
        registered[user] = false;
        delete balances[user];
    }
    
    // User initiates a request
    function createRequest(uint requestNum) public {
        requests[requestNum] = 0;
    }
    
    // Either airline A/B approves (airline a sets req to 1, airline b req to 2) or denies (either airline sets to -1)
    function updateRequest(uint requestNum, int status) public {
        requests[requestNum] = status;
    }
    
    // Payment between airline/user or airline/airline.
    // a pays b
    function settlePayment(address a, address b, uint cost) public {
        assert(registered[a]);
        assert(registered[b]);
        assert(balances[a] >= cost);
        
        balances[a] -= cost;
        balances[b] += cost;
    }
    
    function checkBalance(address user) public view returns (uint) {
        return balances[user];
    }
    
    function getRequestStatus(uint requestNum) public view returns (int) {
        return requests[requestNum];
    }
}