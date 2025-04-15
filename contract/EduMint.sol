// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract EduMint is ERC721 {
    uint256 public tokenId;

    constructor() ERC721("EduMint", "EDU") {}

    function mint(address to) external {
        require(to != address(0), "Invalid address");
        _safeMint(to, tokenId);
        tokenId++;
    }

    // Hardcoded metadata URI for hackathon simplicity
    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        return "ipfs://d444fd07-34c0-4f82-859f-775f249f1fa1/metadata.json"; // Your Pinata IPFS CID
    }
}