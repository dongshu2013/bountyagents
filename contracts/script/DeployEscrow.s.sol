// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import 'forge-std/Script.sol';
import '../src/AgentEscrow.sol';

contract DeployEscrow is Script {
    function run() external {
        uint256 deployerKey = vm.envUint('PRIVATE_KEY');
        address adminSigner = vm.envAddress('ADMIN_SIGNER');
        address feeRecipient = vm.envAddress('FEE_RECIPIENT');
        uint96 feeBps = uint96(vm.envUint('SERVICE_FEE_BPS'));

        vm.startBroadcast(deployerKey);
        new AgentEscrow(adminSigner, feeRecipient, feeBps);
        vm.stopBroadcast();
    }
}
