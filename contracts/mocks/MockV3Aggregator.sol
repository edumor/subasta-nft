// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/AggregatorV3Interface.sol";

/// @title MockV3Aggregator — Chainlink price feed mock for testing
contract MockV3Aggregator is AggregatorV3Interface {
    uint8 private immutable _decimals;
    int256 private _answer;
    uint256 private _updatedAt;
    uint80 private _roundId;

    constructor(uint8 decimals_, int256 initialAnswer) {
        _decimals = decimals_;
        _answer = initialAnswer;
        _updatedAt = block.timestamp;
        _roundId = 1;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external pure override returns (string memory) {
        return "Mock ETH / USD";
    }

    function version() external pure override returns (uint256) {
        return 4;
    }

    /// @notice Update the mock price (used in tests)
    function updateAnswer(int256 newAnswer) external {
        _answer = newAnswer;
        _updatedAt = block.timestamp;
        unchecked { _roundId++; }
    }

    /// @notice Simulate a stale price (updatedAt far in the past)
    function setStaleTimestamp(uint256 timestamp) external {
        _updatedAt = timestamp;
    }

    function getRoundData(
        uint80 roundId_
    )
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (roundId_, _answer, _updatedAt, _updatedAt, roundId_);
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }
}
