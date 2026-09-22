(() => {
  'use strict';

  const CONFIG = window.AYU_CONFIG;
  const CONTRACT_ADDRESS = CONFIG.contractAddress;
  const SEPOLIA_CHAIN_ID = CONFIG.chainId;

  let provider = null;
  let signer = null;
  let contract = null;
  let userAddress = null;
  let abi = null;
  let historyNextToBlock = null;
  let historyRows = [];
  let historyLoading = false;
  const HISTORY_CHUNK = 5000;

  const $ = (id) => document.getElementById(id);
  const els = {
    connect: $('connectWalletBtn'),
    matrixToggle: $('matrixToggle'),
    status: $('statusMessage'),
    address: $('walletAddress'),
    walletBalance: $('walletBalance'),
    contractUserBalance: $('contractUserBalance'),
    contractBalance: $('contractBalance'),
    healthContractTop: $('healthContractTop'),
    receiveAddress: $('receiveAddress'),
    deposits: $('depositCount'),
    withdrawals: $('withdrawCount'),
    transfers: $('transferCount'),
    networkLabel: $('networkLabel'),
    networkDot: $('networkDot'),
    activity: $('activityList'),
    loadHistoryBtn: $('loadHistoryBtn'),
    preset25Btn: $('preset25Btn'),
    target25Status: $('target25Status'),
    healthNetwork: $('healthNetwork'),
    healthFrozen: $('healthFrozen'),
    healthContract: $('healthContract'),
    healthOwner: $('healthOwner'),
    depositAvailability: $('depositAvailability'),
    contactAddress: $('contactAddress'),
    contactStatus: $('contactStatus')
  };

  function status(message) {
    if (els.status) els.status.textContent = message;
  }

  function shortAddress(address) {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected';
  }

  function shortHash(hash) {
    return hash ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : '';
  }

  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function formatEth(value, decimals = 4) {
    return Number(ethers.formatEther(value)).toFixed(decimals);
  }

  function explorerTx(hash) {
    return `${CONFIG.explorerBaseUrl}/tx/${hash}`;
  }

  function initMatrixMode() {
    const stored = sessionStorage.getItem('ayu-matrix-view');
    const enabled = stored !== 'off';
    document.body.classList.toggle('matrix-mode', enabled);
    if (els.matrixToggle) {
      els.matrixToggle.textContent = `Matrix View: ${enabled ? 'ON' : 'OFF'}`;
      els.matrixToggle.setAttribute('aria-pressed', String(enabled));
    }
  }

  function toggleMatrixMode() {
    const enabled = !document.body.classList.contains('matrix-mode');
    document.body.classList.toggle('matrix-mode', enabled);
    sessionStorage.setItem('ayu-matrix-view', enabled ? 'on' : 'off');
    if (els.matrixToggle) {
      els.matrixToggle.textContent = `Matrix View: ${enabled ? 'ON' : 'OFF'}`;
      els.matrixToggle.setAttribute('aria-pressed', String(enabled));
    }
  }

  async function loadABI() {
    if (abi) return abi;
    const response = await fetch('./abi.json', { cache: 'no-store', credentials: 'omit' });
    if (!response.ok) throw new Error(`ABI request failed (${response.status})`);
    abi = await response.json();
    if (!Array.isArray(abi) || abi.length === 0) throw new Error('Invalid contract ABI.');
    return abi;
  }

  function hasMetaMask() {
    if (!window.ethereum) {
      status('MetaMask is not installed.');
      return false;
    }
    return true;
  }

  async function ensureSepolia() {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId === SEPOLIA_CHAIN_ID) return true;

    status('Switching to Sepolia...');
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }]
      });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: SEPOLIA_CHAIN_ID,
          chainName: 'Sepolia Test Network',
          nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://rpc.sepolia.org'],
          blockExplorerUrls: [CONFIG.explorerBaseUrl]
        }]
      });
    }
    return true;
  }

  async function verifyContract() {
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') throw new Error('Configured Ayu Wallet contract was not found on Sepolia.');
  }

  async function connectWallet() {
    if (!hasMetaMask()) return;

    try {
      status('Connecting wallet...');
      await loadABI();
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await ensureSepolia();

      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      userAddress = await signer.getAddress();
      contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

      await verifyContract();

      setText(els.address, shortAddress(userAddress));
      setText(els.receiveAddress, userAddress);
      setText(els.healthContractTop, shortAddress(CONTRACT_ADDRESS));

      if (els.connect) els.connect.textContent = shortAddress(userAddress);
      if (els.networkLabel) els.networkLabel.textContent = 'Sepolia Testnet';
      if (els.networkDot) els.networkDot.style.background = 'var(--success)';

      await refreshDashboard();
      status('Wallet connected.');
    } catch (error) {
      resetWalletUI();
      status(friendlyError(error, 'Wallet connection failed.'));
    }
  }

  function resetWalletUI() {
    provider = signer = contract = userAddress = null;

    setText(els.address, 'Not connected');
    setText(els.receiveAddress, 'Not connected');
    setText(els.walletBalance, '0.0000');
    setText(els.contractUserBalance, '0.0000');
    setText(els.contractBalance, '0.0000 ETH');
    setText(els.deposits, '0.0000 ETH');
    setText(els.withdrawals, '0.0000 ETH');
    setText(els.transfers, '0');
    setText(els.healthContractTop, shortAddress(CONTRACT_ADDRESS));
    setText(els.healthFrozen, '—');
    setText(els.healthOwner, 'Contract status will appear after connection.');
    setText(els.depositAvailability, 'Available wallet balance: —');
    setText(els.contactStatus, 'No contact checked. Trusted contacts are on-chain and publicly observable.');
    historyNextToBlock = null;
    historyRows = [];
    if (els.loadHistoryBtn) els.loadHistoryBtn.disabled = false;

    if (els.connect) els.connect.textContent = 'Connect Wallet';
    if (els.networkDot) els.networkDot.style.background = 'var(--danger)';
  }

  async function refreshDashboard() {
    if (!contract || !userAddress) return;
    await Promise.all([
      loadBalances(),
      loadStatistics(),
      loadHealth(),
      loadHistoryChunk(true)
    ]);
  }

  async function loadBalances() {
    const [walletValue, contractAccountValue] = await Promise.all([
      provider.getBalance(userAddress),
      contract.balances(userAddress)
    ]);

    setText(els.walletBalance, formatEth(walletValue));
    setText(els.contractUserBalance, formatEth(contractAccountValue));
    setText(els.depositAvailability, `Available wallet balance: ${formatEth(walletValue)} ETH`);
  }

  async function loadStatistics() {
    const [contractValue, deposited, withdrawn, transfers] = await Promise.all([
      contract.getContractBalance(),
      contract.totalDeposits(),
      contract.totalWithdrawals(),
      contract.totalTransfers()
    ]);

    setText(els.contractBalance, `${formatEth(contractValue)} ETH`);
    setText(els.deposits, `${formatEth(deposited)} ETH`);
    setText(els.withdrawals, `${formatEth(withdrawn)} ETH`);
    setText(els.transfers, transfers.toString());

    const target25 = ethers.parseEther('25');
    if (els.target25Status) {
      if (contractValue >= target25) {
        els.target25Status.textContent = '25 ETH target reached on-chain.';
      } else {
        const remaining = target25 - contractValue;
        els.target25Status.textContent = `25 ETH target: ${formatEth(remaining)} ETH still required on-chain.`;
      }
    }
  }

  async function loadHealth() {
    const [frozen, contractValue] = await Promise.all([
      contract.frozen(),
      contract.getContractBalance()
    ]);

    setText(els.healthNetwork, 'Sepolia');
    setText(els.healthFrozen, frozen ? 'YES' : 'NO');
    setText(els.healthContract, shortAddress(CONTRACT_ADDRESS));
    setText(els.healthContractTop, shortAddress(CONTRACT_ADDRESS));

    if (els.healthOwner) {
      els.healthOwner.textContent = `Live contract TVL: ${formatEth(contractValue)} ETH · Status: ${frozen ? 'Frozen' : 'Active'}`;
    }
  }

  function clearActivity() {
    if (!els.activity) return;
    while (els.activity.firstChild) els.activity.removeChild(els.activity.firstChild);
  }

  function renderActivity(rows) {
    clearActivity();

    if (!rows.length) {
      const wrapper = document.createElement('div');
      wrapper.className = 'empty-state';

      const icon = document.createElement('div');
      icon.className = 'empty-icon';
      icon.textContent = '◇';

      const title = document.createElement('p');
      title.textContent = 'No transactions yet';

      const note = document.createElement('span');
      note.textContent = 'Your confirmed contract activity will appear here.';

      wrapper.append(icon, title, note);
      els.activity.appendChild(wrapper);
      return;
    }

    rows.slice(0, 50).forEach((row) => {
      const item = document.createElement('div');
      item.className = 'activity-row';

      const left = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = row.type;

      const meta = document.createElement('div');
      meta.className = 'activity-meta';
      meta.textContent = `Block ${row.block} · `;

      const link = document.createElement('a');
      link.href = explorerTx(row.hash);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'View tx';
      meta.appendChild(link);

      left.append(title, meta);

      const amount = document.createElement('span');
      amount.className = 'activity-amount';
      amount.textContent = `${ethers.formatEther(row.amount)} ETH`;

      item.append(left, amount);
      els.activity.appendChild(item);
    });
  }

  async function loadHistoryChunk(reset = false) {
    if (!provider || !contract || !userAddress || historyLoading) return;

    historyLoading = true;
    if (els.loadHistoryBtn) els.loadHistoryBtn.disabled = true;

    try {
      if (reset || historyNextToBlock === null) {
        historyNextToBlock = await provider.getBlockNumber();
        historyRows = [];
      }

      const toBlock = historyNextToBlock;
      const fromBlock = Math.max(0, toBlock - HISTORY_CHUNK + 1);
      const me = userAddress.toLowerCase();

      const [deposits, withdrawals, transfers] = await Promise.all([
        contract.queryFilter(contract.filters.Deposit(userAddress), fromBlock, toBlock),
        contract.queryFilter(contract.filters.Withdraw(userAddress), fromBlock, toBlock),
        contract.queryFilter(contract.filters.TransferFunds(), fromBlock, toBlock)
      ]);

      const chunk = [];

      deposits.forEach((event) => chunk.push({
        type: 'Deposit',
        amount: event.args.amount,
        hash: event.transactionHash,
        block: event.blockNumber
      }));

      withdrawals.forEach((event) => chunk.push({
        type: 'Withdraw',
        amount: event.args.amount,
        hash: event.transactionHash,
        block: event.blockNumber
      }));

      transfers
        .filter((event) => {
          const from = event.args?.from?.toLowerCase();
          const to = event.args?.to?.toLowerCase();
          return from === me || to === me;
        })
        .forEach((event) => chunk.push({
          type: event.args.from.toLowerCase() === me ? 'Sent' : 'Received',
          amount: event.args.amount,
          hash: event.transactionHash,
          block: event.blockNumber
        }));

      historyRows = historyRows.concat(chunk);
      historyRows.sort((a, b) => b.block - a.block);
      historyRows = historyRows.filter((row, index, all) =>
        index === all.findIndex((other) => other.hash === row.hash && other.type === row.type)
      );

      historyNextToBlock = fromBlock - 1;
      renderActivity(historyRows);

      if (els.loadHistoryBtn) {
        els.loadHistoryBtn.disabled = historyNextToBlock < 0;
        els.loadHistoryBtn.textContent = historyNextToBlock < 0 ? 'History Complete' : 'Load Older';
      }
    } catch {
      if (els.loadHistoryBtn) els.loadHistoryBtn.disabled = false;
      status('Transaction history could not be loaded. Try Refresh again.');
    } finally {
      historyLoading = false;
      if (els.loadHistoryBtn && historyNextToBlock >= 0) {
        els.loadHistoryBtn.disabled = false;
      }
    }
  }

  function getAmount(id) {
    const raw = $(id)?.value?.trim();
    if (!raw || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw) || Number(raw) <= 0) {
      throw new Error('Enter a valid positive ETH amount.');
    }
    return ethers.parseEther(raw);
  }

  async function validateWalletAmount(value) {
    const walletBalance = await provider.getBalance(userAddress);
    if (value > walletBalance) {
      throw new Error('Amount exceeds your MetaMask wallet balance.');
    }
    return walletBalance;
  }

  async function runTransaction(label, action) {
    if (!contract) {
      status('Connect wallet first.');
      return null;
    }

    try {
      status(`${label}: confirm the transaction in MetaMask.`);
      const tx = await action();
      status(`${label} pending: ${shortHash(tx.hash)}`);
      await tx.wait();
      status(`${label} confirmed.`);
      await refreshDashboard();
      return tx;
    } catch (error) {
      status(friendlyError(error, `${label} failed.`));
      return null;
    }
  }

  async function addBalanceToContract() {
    try {
      const value = getAmount('depositAmount');
      await validateWalletAmount(value);

      const tx = await runTransaction(
        'Add balance',
        () => contract.deposit({ value })
      );

      if (!tx) return;

      $('depositAmount').value = '';
      closeModal('depositModal');
    } catch (error) {
      status(friendlyError(error, 'Add balance failed.'));
    }
  }

  async function withdrawETH() {
    try {
      const value = getAmount('withdrawAmount');
      const tx = await runTransaction('Withdrawal', () => contract.withdraw(value));

      if (!tx) return;
      $('withdrawAmount').value = '';
      closeModal('withdrawModal');
    } catch (error) {
      status(friendlyError(error, 'Withdrawal failed.'));
    }
  }

  async function sendETH() {
    try {
      const receiver = $('sendAddress').value.trim();

      if (!ethers.isAddress(receiver)) throw new Error('Enter a valid Ethereum address.');
      if (receiver.toLowerCase() === userAddress?.toLowerCase()) {
        throw new Error('Recipient must be different from your wallet.');
      }

      const value = getAmount('sendAmount');
      const tx = await runTransaction(
        'Transfer',
        () => contract.transferFunds(receiver, value)
      );

      if (!tx) return;
      $('sendAddress').value = '';
      $('sendAmount').value = '';
      closeModal('sendModal');
    } catch (error) {
      status(friendlyError(error, 'Transfer failed.'));
    }
  }

  async function checkTrustedContact() {
    if (!contract) return status('Connect wallet first.');

    const address = els.contactAddress.value.trim();
    if (!ethers.isAddress(address)) {
      setText(els.contactStatus, 'Enter a valid Ethereum address.');
      return;
    }

    try {
      const trusted = await contract.trustedContacts(address);
      setText(
        els.contactStatus,
        trusted ? `${shortAddress(address)} is trusted.` : `${shortAddress(address)} is not trusted.`
      );
    } catch {
      setText(els.contactStatus, 'Could not check the trusted contact.');
    }
  }

  async function addTrustedContact() {
    if (!contract) return status('Connect wallet first.');

    const address = els.contactAddress.value.trim();
    if (!ethers.isAddress(address)) return status('Invalid contact address.');

    const tx = await runTransaction(
      'Add trusted contact',
      () => contract.addTrustedContact(address)
    );

    if (tx) await checkTrustedContact();
  }

  async function removeTrustedContact() {
    if (!contract) return status('Connect wallet first.');

    const address = els.contactAddress.value.trim();
    if (!ethers.isAddress(address)) return status('Invalid contact address.');

    const tx = await runTransaction(
      'Remove trusted contact',
      () => contract.removeTrustedContact(address)
    );

    if (tx) await checkTrustedContact();
  }

  async function setFrozenState(freeze) {
    if (!contract) return status('Connect wallet first.');

    await runTransaction(
      freeze ? 'Freeze wallet' : 'Unfreeze wallet',
      () => freeze ? contract.freezeWallet() : contract.unfreezeWallet()
    );
  }

  function friendlyError(error, fallback) {
    if (!error) return fallback;
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') return 'Transaction rejected in MetaMask.';
    if (error.code === 'INSUFFICIENT_FUNDS') return 'Insufficient ETH for the transaction and gas.';
    if (error.shortMessage && /insufficient funds/i.test(error.shortMessage)) return 'Insufficient ETH for the transaction and gas.';
    if (error.reason && typeof error.reason === 'string') return error.reason;
    return fallback;
  }

  function openModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }

  function wireUI() {
    $('connectWalletBtn')?.addEventListener('click', connectWallet);
    els.matrixToggle?.addEventListener('click', toggleMatrixMode);

    $('sendBtn')?.addEventListener('click', () => (
      userAddress ? openModal('sendModal') : status('Connect wallet first.')
    ));

    $('receiveBtn')?.addEventListener('click', () => (
      userAddress ? openModal('receiveModal') : status('Connect wallet first.')
    ));

    $('depositBtn')?.addEventListener('click', async () => {
      if (!userAddress) return status('Connect wallet first.');
      await loadBalances();
      openModal('depositModal');
    });

    $('withdrawBtn')?.addEventListener('click', () => (
      userAddress ? openModal('withdrawModal') : status('Connect wallet first.')
    ));

    $('confirmSend')?.addEventListener('click', sendETH);
    $('confirmDeposit')?.addEventListener('click', addBalanceToContract);
    els.preset25Btn?.addEventListener('click', () => {
      const input = $('depositAmount');
      if (input) {
        input.value = '25';
        input.focus();
      }
    });
    $('confirmWithdraw')?.addEventListener('click', withdrawETH);

    $('copyAddress')?.addEventListener('click', async () => {
      if (!userAddress) return status('Connect wallet first.');
      try {
        await navigator.clipboard.writeText(userAddress);
        status('Wallet address copied.');
      } catch {
        status('Copy failed. Select and copy the address manually.');
      }
    });

    [['closeSend', 'sendModal'], ['closeReceive', 'receiveModal'], ['closeDeposit', 'depositModal'], ['closeWithdraw', 'withdrawModal']]
      .forEach(([button, modal]) => {
        $(button)?.addEventListener('click', () => closeModal(modal));
      });

    $('viewAllBtn')?.addEventListener('click', () => loadHistoryChunk(true));
    $('loadHistoryBtn')?.addEventListener('click', () => loadHistoryChunk(false));
    $('refreshHealthBtn')?.addEventListener('click', loadHealth);
    $('refreshContactBtn')?.addEventListener('click', checkTrustedContact);
    $('addContactBtn')?.addEventListener('click', addTrustedContact);
    $('removeContactBtn')?.addEventListener('click', removeTrustedContact);
    $('freezeBtn')?.addEventListener('click', () => setFrozenState(true));
    $('unfreezeBtn')?.addEventListener('click', () => setFrozenState(false));

    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
        }
      });
    });
  }

  function wireMetaMask() {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length) {
        connectWallet();
      } else {
        resetWalletUI();
        status('Wallet disconnected.');
      }
    });

    window.ethereum.on('chainChanged', () => window.location.reload());
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMatrixMode();
    wireUI();
    wireMetaMask();

    setText(els.healthContract, shortAddress(CONTRACT_ADDRESS));
    setText(els.healthContractTop, shortAddress(CONTRACT_ADDRESS));
    status('Wallet not connected.');
  });
})();
