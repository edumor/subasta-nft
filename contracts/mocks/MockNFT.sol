// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title MockNFT — Minimal ERC-721 for testing AuctionNFT
contract MockNFT is ERC721 {
    uint256 private _nextId;

    constructor() ERC721("MockNFT", "MNFT") {}

    /// @notice Mint a new token to `to`. Returns the new token ID.
    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _safeMint(to, tokenId);
    }
}
