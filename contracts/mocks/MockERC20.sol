// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20 — Minimal ERC-20 for testing (simulates WETH / USDC)
contract MockERC20 is ERC20 {
    uint8 private immutable _dec;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _dec = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _dec;
    }

    /// @notice Free mint for tests
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
