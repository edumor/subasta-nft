// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AuctionNFT.sol";

/**
 * @title AuctionFactory
 * @author Eduardo J. Moreno
 * @notice Factory contract that deploys new AuctionNFT instances.
 *         Allows creating fully configured auctions directly from the frontend.
 * @dev Deploy this contract once. The frontend calls createAuction() to spin up
 *      new auction instances without needing Hardhat or any CLI tooling.
 */
contract AuctionFactory {
    // ─── State ─────────────────────────────────────────────────────────────────

    address[] public auctions;

    /// @notice Map seller address → list of their auction addresses
    mapping(address => address[]) public sellerAuctions;

    // ─── Events ────────────────────────────────────────────────────────────────

    event AuctionCreated(
        address indexed auction,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        address paymentToken,
        uint256 startTime,
        uint256 endTime
    );

    // ─── Core ──────────────────────────────────────────────────────────────────

    /**
     * @notice Deploy a new AuctionNFT.
     * @param _nftContract      ERC-721 contract address of the asset being auctioned.
     * @param _tokenId          Token ID within _nftContract.
     * @param _paymentToken     ERC-20 used for bids (e.g., WETH, USDC).
     * @param _priceFeed        Chainlink AggregatorV3 feed (paymentToken/USD).
     * @param _startTime        Auction start as unix timestamp (0 = immediately).
     * @param _endTime          Auction end as unix timestamp.
     * @param _royaltyRecipient Recipient of creator royalties.
     * @param _royaltyBps       Royalty in basis points (max 1000 = 10%).
     * @return auction          Address of the newly deployed AuctionNFT contract.
     */
    function createAuction(
        address _nftContract,
        uint256 _tokenId,
        address _paymentToken,
        address _priceFeed,
        uint256 _startTime,
        uint256 _endTime,
        address _royaltyRecipient,
        uint256 _royaltyBps
    ) external returns (address auction) {
        AuctionNFT newAuction = new AuctionNFT(
            _nftContract,
            _tokenId,
            _paymentToken,
            _priceFeed,
            _startTime,
            _endTime,
            _royaltyRecipient,
            _royaltyBps
        );

        auction = address(newAuction);
        auctions.push(auction);
        sellerAuctions[msg.sender].push(auction);

        uint256 resolvedStart = _startTime == 0 ? block.timestamp : _startTime;

        emit AuctionCreated(
            auction,
            msg.sender,
            _nftContract,
            _tokenId,
            _paymentToken,
            resolvedStart,
            _endTime
        );
    }

    // ─── View ──────────────────────────────────────────────────────────────────

    /// @notice Total number of auctions created via this factory.
    function getAuctionCount() external view returns (uint256) {
        return auctions.length;
    }

    /// @notice All auctions created by a specific seller.
    function getSellerAuctions(address _seller) external view returns (address[] memory) {
        return sellerAuctions[_seller];
    }

    /// @notice Paginated list of all auctions (newest first).
    function getAuctions(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory page)
    {
        uint256 len = auctions.length;
        if (offset >= len) return new address[](0);
        uint256 end = offset + limit > len ? len : offset + limit;
        page = new address[](end - offset);
        for (uint256 i = offset; i < end; ) {
            // Return in reverse (newest first)
            page[i - offset] = auctions[len - 1 - i];
            unchecked { ++i; }
        }
    }
}
