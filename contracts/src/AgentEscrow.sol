// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {IERC20} from './interfaces/IERC20.sol';
import {Ownable} from './utils/Ownable.sol';

contract AgentEscrow is Ownable {
    struct TaskDeposit {
        address owner;
        address token;
        uint256 amountLocked;
        bool released;
    }

    uint96 public constant BPS_DENOMINATOR = 10_000;

    address public adminSigner;
    address public feeRecipient;
    uint96 public serviceFeeBps;

    mapping(bytes32 => TaskDeposit) private deposits;

    event DepositRegistered(
        bytes32 indexed key,
        address indexed owner,
        address indexed token,
        uint256 amountLocked,
        uint256 fee
    );
    event DepositReleased(bytes32 indexed key, address indexed owner, address indexed recipient, uint256 amount, bool settled);
    event AdminSignerUpdated(address indexed newSigner);
    event FeeRecipientUpdated(address indexed newRecipient);
    event ServiceFeeUpdated(uint96 newFeeBps);

    error DepositAlreadyExists(bytes32 key);
    error DepositMissing(bytes32 key);
    error DepositAlreadyReleased(bytes32 key);
    error InvalidSignature();
    error InvalidFee();

    constructor(address _adminSigner, address _feeRecipient, uint96 _serviceFeeBps)
        Ownable(msg.sender)
    {
        require(_adminSigner != address(0), 'admin zero');
        require(_feeRecipient != address(0), 'fee zero');
        require(_serviceFeeBps <= 1_000, 'fee too high'); // max 10%
        adminSigner = _adminSigner;
        feeRecipient = _feeRecipient;
        serviceFeeBps = _serviceFeeBps;
    }

    function getDeposit(bytes32 key) external view returns (TaskDeposit memory) {
        return deposits[key];
    }

    function setAdminSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), 'admin zero');
        adminSigner = newSigner;
        emit AdminSignerUpdated(newSigner);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), 'fee zero');
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    function setServiceFeeBps(uint96 newFeeBps) external onlyOwner {
        require(newFeeBps <= 2_000, 'fee too high'); // safety guard at 20%
        serviceFeeBps = newFeeBps;
        emit ServiceFeeUpdated(newFeeBps);
    }

    function deposit(bytes32 key, address token, uint256 amount) external {
        TaskDeposit storage entry = deposits[key];
        if (entry.owner != address(0)) revert DepositAlreadyExists(key);
        require(amount > 0, 'amount zero');
        require(token != address(0), 'token zero');

        uint256 fee = (amount * serviceFeeBps) / BPS_DENOMINATOR;
        uint256 locked = amount - fee;
        require(locked > 0, 'locked zero');

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (fee > 0) {
            IERC20(token).transfer(feeRecipient, fee);
        }

        deposits[key] = TaskDeposit({owner: msg.sender, token: token, amountLocked: locked, released: false});
        emit DepositRegistered(key, msg.sender, token, locked, fee);
    }

    function withdraw(bytes32 key, bytes calldata adminSignature) external {
        TaskDeposit storage entry = deposits[key];
        if (entry.owner == address(0)) revert DepositMissing(key);
        if (entry.released) revert DepositAlreadyReleased(key);
        require(msg.sender == entry.owner, 'unauthorized');

        bytes32 digest = _withdrawDigest(key, entry.owner, entry.token, entry.amountLocked);
        if (_recover(digest, adminSignature) != adminSigner) revert InvalidSignature();

        entry.released = true;
        IERC20(entry.token).transfer(entry.owner, entry.amountLocked);
        emit DepositReleased(key, entry.owner, entry.owner, entry.amountLocked, false);
    }

    function settle(bytes32 key, address recipient, bytes calldata ownerSignature) external {
        TaskDeposit storage entry = deposits[key];
        if (entry.owner == address(0)) revert DepositMissing(key);
        if (entry.released) revert DepositAlreadyReleased(key);
        require(recipient != address(0), 'recipient zero');

        bytes32 digest = _settleDigest(key, entry.owner, entry.token, recipient, entry.amountLocked);
        if (_recover(digest, ownerSignature) != entry.owner) revert InvalidSignature();

        entry.released = true;
        IERC20(entry.token).transfer(recipient, entry.amountLocked);
        emit DepositReleased(key, entry.owner, recipient, entry.amountLocked, true);
    }

    function computeWithdrawDigest(
        bytes32 key,
        address ownerAddress,
        address token,
        uint256 amount
    ) external view returns (bytes32) {
        return _withdrawDigest(key, ownerAddress, token, amount);
    }

    function computeSettleDigest(
        bytes32 key,
        address ownerAddress,
        address token,
        address recipient,
        uint256 amount
    ) external view returns (bytes32) {
        return _settleDigest(key, ownerAddress, token, recipient, amount);
    }

    function _withdrawDigest(
        bytes32 key,
        address ownerAddress,
        address token,
        uint256 amount
    ) private view returns (bytes32) {
        bytes32 dataHash = keccak256(abi.encodePacked('WITHDRAW', address(this), key, ownerAddress, token, amount));
        return _toEthSignedMessageHash(dataHash);
    }

    function _settleDigest(
        bytes32 key,
        address ownerAddress,
        address token,
        address recipient,
        uint256 amount
    ) private view returns (bytes32) {
        bytes32 dataHash = keccak256(abi.encodePacked('SETTLE', address(this), key, ownerAddress, token, recipient, amount));
        return _toEthSignedMessageHash(dataHash);
    }

    function _toEthSignedMessageHash(bytes32 hash) private pure returns (bytes32) {
        return keccak256(abi.encodePacked('\x19Ethereum Signed Message:\n32', hash));
    }

    function _recover(bytes32 digest, bytes memory signature) private pure returns (address) {
        if (signature.length != 65) revert InvalidSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, 'invalid v');
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), 'ecrecover fail');
        return signer;
    }
}
