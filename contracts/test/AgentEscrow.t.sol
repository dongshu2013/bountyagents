// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import 'forge-std/Test.sol';
import '../src/AgentEscrow.sol';

contract MockERC20 is IERC20 {
    string public name = 'Mock';
    string public symbol = 'MOCK';
    uint8 public decimals = 18;
    uint256 public override totalSupply;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract AgentEscrowTest is Test {
    AgentEscrow escrow;
    MockERC20 token;
    uint256 ownerKey = 0xA11CE;
    address ownerUser;
    uint256 adminKey = 0xB0B;
    address adminUser;
    address feeRecipient = address(0x3);
    address worker = address(0x4);

    function setUp() public {
        ownerUser = vm.addr(ownerKey);
        adminUser = vm.addr(adminKey);

        vm.prank(ownerUser);
        escrow = new AgentEscrow(adminUser, feeRecipient, 500); // 5%
        token = new MockERC20();
        token.mint(ownerUser, 1000 ether);
        vm.startPrank(ownerUser);
        token.approve(address(escrow), type(uint256).max);
        vm.stopPrank();
    }

    function testDepositAndWithdraw() public {
        bytes32 key = keccak256('task');
        vm.prank(ownerUser);
        escrow.deposit(key, address(token), 100 ether);

        AgentEscrow.TaskDeposit memory info = escrow.getDeposit(key);
        assertEq(info.amountLocked, 95 ether);
        assertEq(token.balanceOf(feeRecipient), 5 ether);

        (address recordedOwner, address recordedToken, uint256 lockedAmount, bool withdrawn) = escrow
            .depositInfo(key);
        assertEq(recordedOwner, ownerUser);
        assertEq(recordedToken, address(token));
        assertEq(lockedAmount, 95 ether);
        assertFalse(withdrawn);

        bytes32 withdrawDigest = escrow.computeWithdrawDigest(key, ownerUser, address(token), ownerUser, info.amountLocked);
        (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(adminKey, withdrawDigest);
        bytes memory adminSig = abi.encodePacked(rA, sA, vA);

        vm.prank(ownerUser);
        escrow.withdraw(key, ownerUser, adminSig);
        assertEq(token.balanceOf(ownerUser), 95 ether + (1000 ether - 100 ether));

        vm.expectRevert(AgentEscrow.DepositAlreadyReleased.selector);
        escrow.settle(key, worker, hex'00');
    }

    function testSettleByAnyoneWithOwnerSignature() public {
        bytes32 key = keccak256('task');
        vm.prank(ownerUser);
        escrow.deposit(key, address(token), 100 ether);
        (address recordedOwner,, uint256 lockedAmount,) = escrow.getDeposit(key);
        assertEq(recordedOwner, ownerUser);

        bytes32 settleDigest = escrow.computeSettleDigest(key, ownerUser, address(token), worker, lockedAmount);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, settleDigest);
        bytes memory ownerSig = abi.encodePacked(r, s, v);

        vm.prank(address(0x99));
        escrow.settle(key, worker, ownerSig);
        assertEq(token.balanceOf(worker), lockedAmount);
    }
}
