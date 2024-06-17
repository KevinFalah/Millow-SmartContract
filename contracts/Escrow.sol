//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(address _from, address _to, uint256 _id) external;
}

contract Escrow {
    address public nftAddress;
    address public lender;
    address public inspector;
    address payable public seller;

    mapping (uint256 => bool) public isListed;
    mapping (uint256 => uint256) public purchasePrice;
    mapping (uint256 => uint256) public escrowAmount;
    mapping (uint256 => address) public buyer;
    mapping (uint256 => bool) public inspectionPassed;
    mapping (uint256 => mapping(address => bool)) public approval;

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call function");
        _;
    }

    modifier onlyBuyer(uint256 _nftID) {
        require(msg.sender == buyer[_nftID], "Only buyer can call");
        _;        
    }

    modifier onlyInspection() {
        require(msg.sender == inspector, "Only inpector can call");
        _;
    }

    constructor(
        address _nftAddress,
        address payable _seller,
        address _inspector,
        address _lender
    ) {
        nftAddress = _nftAddress;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
    }

    function list(uint256 nftID, address _buyer,uint256 _purchasePrice, uint256 _escrowAmount) onlySeller public {
        IERC721(nftAddress).transferFrom(msg.sender, address(this), nftID);

        isListed[nftID] = true;
        purchasePrice[nftID] = _purchasePrice;
        escrowAmount[nftID] = _escrowAmount;
        buyer[nftID] = _buyer;
    }

    function depositEarnest(uint256 _nftID) payable public onlyBuyer(_nftID) {
        require(msg.value >= escrowAmount[_nftID]);
    }

    function updateInpectionStatus(uint256 _nftID, bool _passed) public onlyInspection() {
        inspectionPassed[_nftID] = _passed;
    } 

    function approveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = true;
    }

    function finalizeSale(uint256 _nftID) public {
        require(inspectionPassed[_nftID], "Inspector not passed");
        require(approval[_nftID][seller], "Seller not approve it");
        require(approval[_nftID][lender], "lender not approve it");
        require(approval[_nftID][buyer[_nftID]], "buyer not approve it");
        require(address(this).balance >= purchasePrice[_nftID], "Balance must be bigger or same with purchase price");

        (bool success, ) = seller.call{ value : address(this).balance }("");
        require(success, "Failed sent to seller");

        isListed[_nftID] = false;
        IERC721(nftAddress).transferFrom(address(this), buyer[_nftID] ,_nftID);
    }

    function cancelSale(uint256 _nftID) public payable {
        if (inspectionPassed[_nftID] == false) {
            payable(buyer[_nftID]).transfer(address(this).balance);
        } else {
            seller.transfer(address(this).balance);
        }
    }

    
    function getBalance() public view returns(uint256) {
        return address(this).balance;
    }

}
