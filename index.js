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

  const $ = (id) => document.getElementById(id);
  const els = {
    connect: $('connectWalletBtn'), status: $('statusMessage'), address: $('walletAddress'),
    balance: $('walletBalance'), nativeBalance: $('nativeBalance'), contractBalance: $('contractBalance'),
    receiveAddress: $('receiveAddress'), deposits: $('depositCount'), withdrawals: $('withdrawCount'),
    transfers: $('transferCount'), networkLabel: $('networkLabel'), networkDot: $('networkDot'),
    activity: $('activityList'), healthNetwork: $('healthNetwork'), healthFrozen: $('healthFrozen'),
    healthContract: $('healthContract'), contactAddress: $('contactAddress'), contactStatus: $('contactStatus')
  };

  function status(message) { if (els.status) els.status.textContent = message; }
  function shortAddress(address) { return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'; }
  function shortHash(hash) { return hash ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : ''; }
  function setText(el, value) { if (el) el.textContent = value; }
  function formatEth(value, decimals = 4) { return Number(ethers.formatEther(value)).toFixed(decimals); }
  function explorerTx(hash) { return `${CONFIG.explorerBaseUrl}/tx/${hash}`; }

  async function loadABI() {
    if (abi) return abi;
    const response = await fetch('./abi.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`ABI request failed (${response.status})`);
    abi = await response.json();
    return abi;
  }

  function hasMetaMask() {
    if (!window.ethereum) { status('❌ MetaMask is not installed'); return false; }
    return true;
  }

  async function ensureSepolia() {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId === SEPOLIA_CHAIN_ID) return true;
    status('⚠️ Switching to Sepolia...');
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_CHAIN_ID }] });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{
        chainId: SEPOLIA_CHAIN_ID,
        chainName: 'Sepolia Test Network',
        nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://rpc.sepolia.org'],
        blockExplorerUrls: [CONFIG.explorerBaseUrl]
      }] });
    }
    return true;
  }

  async function verifyContract() {
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') throw new Error('No contract bytecode found at the configured address on Sepolia.');
  }

  async function connectWallet() {
    if (!hasMetaMask()) return;
    try {
      status('🔄 Connecting wallet...');
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
      if (els.connect) els.connect.textContent = shortAddress(userAddress);
      if (els.networkLabel) els.networkLabel.textContent = 'Sepolia Testnet';
      if (els.networkDot) els.networkDot.style.background = 'var(--success)';
      await refreshDashboard();
      status('✅ Wallet connected');
    } catch (error) {
      console.error(error);
      resetWalletUI();
      status(`❌ ${friendlyError(error, 'Wallet connection failed')}`);
    }
  }

  function resetWalletUI() {
    provider = signer = contract = userAddress = null;
    setText(els.address, 'Not connected');
    setText(els.receiveAddress, 'Not connected');
    setText(els.balance, '0.0000');
    setText(els.nativeBalance, '0.0000 ETH');
    setText(els.contractBalance, '0.0000 ETH');
    if (els.connect) els.connect.textContent = 'Connect Wallet';
    if (els.networkDot) els.networkDot.style.background = 'var(--danger)';
  }

  async function refreshDashboard() {
    if (!contract || !userAddress) return;
    await Promise.all([
      loadBalances(),
      loadStatistics(),
      loadHealth(),
      loadRecentActivity()
    ]);
  }

  async function loadBalances() {
    const [walletValue, nativeValue] = await Promise.all([
      contract.balances(userAddress),
      provider.getBalance(userAddress)
    ]);

    const walletEth = formatEth(walletValue);
    setText(els.balance, walletEth);
    setText(els.nativeBalance, `${formatEth(nativeValue)} ETH`);
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
  }

  async function loadHealth() {
    const [frozen, contractValue, owner] = await Promise.all([
      contract.frozen(),
      contract.getContractBalance(),
      contract.owner()
    ]);

    setText(els.healthNetwork, 'Sepolia');
    setText(els.healthFrozen, frozen ? 'YES' : 'NO');
    setText(els.healthContract, shortAddress(CONTRACT_ADDRESS));
    const ownerNote = $('healthOwner');
    if (ownerNote) {
      ownerNote.textContent = `Owner: ${shortAddress(owner)} · TVL: ${formatEth(contractValue)} ETH`;
    }
  }

  async function loadRecentActivity() {
    if (!provider || !contract || !userAddress) return;
    try {
      const latest = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latest - 10000);
      const me = userAddress.toLowerCase();
      const rows = [];

      const [deposits, withdrawals, transfers] = await Promise.all([
        contract.queryFilter(contract.filters.Deposit(userAddress), fromBlock, latest),
        contract.queryFilter(contract.filters.Withdraw(userAddress), fromBlock, latest),
        contract.queryFilter(contract.filters.TransferFunds(), fromBlock, latest)
      ]);

      deposits.forEach((event) => rows.push({ type: 'Deposit', amount: event.args.amount, hash: event.transactionHash, block: event.blockNumber }));
      withdrawals.forEach((event) => rows.push({ type: 'Withdraw', amount: event.args.amount, hash: event.transactionHash, block: event.blockNumber }));
      transfers
        .filter((event) => event.args.from.toLowerCase() === me || event.args.to.toLowerCase() === me)
        .forEach((event) => rows.push({
          type: event.args.from.toLowerCase() === me ? 'Sent' : 'Received',
          amount: event.args.amount,
          hash: event.transactionHash,
          block: event.blockNumber
        }));

      rows.sort((a, b) => b.block - a.block);

      if (!rows.length) {
        els.activity.innerHTML = '<div class="empty-state"><div class="empty-icon">◇</div><p>No transactions yet</p><span>Your confirmed contract events will appear here.</span></div>';
        return;
      }

      els.activity.innerHTML = rows.slice(0, 10).map((row) => `
        <div style="display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)">
          <div>
            <strong>${row.type}</strong>
            <div style="font-size:11px;color:#9da3bd">Block ${row.block} · <a href="${explorerTx(row.hash)}" target="_blank" rel="noopener noreferrer" style="color:#a78bfa">View tx</a></div>
          </div>
          <span style="font-family:monospace">${ethers.formatEther(row.amount)} ETH</span>
        </div>`).join('');
    } catch (error) {
      console.warn('Activity history could not be loaded:', error);
      els.activity.innerHTML = '<div class="empty-state"><p>Activity temporarily unavailable</p><span>Refresh after the Sepolia RPC responds.</span></div>';
    }
  }

  function getAmount(id) {
    const raw = $(id)?.value?.trim();
    if (!raw || Number(raw) <= 0) throw new Error('Enter a valid ETH amount.');
    return ethers.parseEther(raw);
  }

  async function runTransaction(label, action) {
    if (!contract) { status('⚠️ Connect wallet first'); return null; }
    try {
      status(`⏳ ${label} awaiting MetaMask...`);
      const tx = await action();
      status(`⏳ ${label} pending: ${shortHash(tx.hash)}`);
      await tx.wait();
      status(`✅ ${label} confirmed`);
      await refreshDashboard();
      return tx;
    } catch (error) {
      console.error(error);
      status(`❌ ${friendlyError(error, `${label} failed`)}`);
      return null;
    }
  }

  async function depositETH() {
    try {
      const value = getAmount('depositAmount');
      const tx = await runTransaction('Deposit', () => contract.deposit({ value }));
      if (!tx) return;
      $('depositAmount').value = '';
      closeModal('depositModal');
    } catch (error) {
      status(`❌ ${friendlyError(error, 'Deposit failed')}`);
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
      status(`❌ ${friendlyError(error, 'Withdrawal failed')}`);
    }
  }

  async function sendETH() {
    try {
      const receiver = $('sendAddress').value.trim();
      if (!ethers.isAddress(receiver)) throw new Error('Enter a valid Ethereum address.');
      if (receiver.toLowerCase() === userAddress?.toLowerCase()) throw new Error('Recipient must be different from your wallet.');
      const value = getAmount('sendAmount');
      const tx = await runTransaction('Transfer', () => contract.transferFunds(receiver, value));
      if (!tx) return;
      $('sendAddress').value = '';
      $('sendAmount').value = '';
      closeModal('sendModal');
    } catch (error) {
      status(`❌ ${friendlyError(error, 'Transfer failed')}`);
    }
  }

  async function checkTrustedContact() {
    if (!contract) return status('⚠️ Connect wallet first');
    const address = els.contactAddress.value.trim();
    if (!ethers.isAddress(address)) return setText(els.contactStatus, 'Enter a valid Ethereum address.');
    try {
      const trusted = await contract.trustedContacts(address);
      setText(els.contactStatus, trusted ? `${shortAddress(address)} is trusted.` : `${shortAddress(address)} is not trusted.`);
    } catch (error) {
      setText(els.contactStatus, friendlyError(error, 'Could not check contact.'));
    }
  }

  async function addTrustedContact() {
    if (!contract) return status('⚠️ Connect wallet first');
    const address = els.contactAddress.value.trim();
    if (!ethers.isAddress(address)) return status('❌ Invalid contact address');
    const tx = await runTransaction('Add trusted contact', () => contract.addTrustedContact(address));
    if (tx) await checkTrustedContact();
  }

  async function removeTrustedContact() {
    if (!contract) return status('⚠️ Connect wallet first');
    const address = els.contactAddress.value.trim();
    if (!ethers.isAddress(address)) return status('❌ Invalid contact address');
    const tx = await runTransaction('Remove trusted contact', () => contract.removeTrustedContact(address));
    if (tx) await checkTrustedContact();
  }

  async function setFrozenState(freeze) {
    if (!contract) return status('⚠️ Connect wallet first');
    await runTransaction(freeze ? 'Freeze wallet' : 'Unfreeze wallet', () => freeze ? contract.freezeWallet() : contract.unfreezeWallet());
  }

  function friendlyError(error, fallback) {
    if (!error) return fallback;
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') return 'Transaction rejected in MetaMask.';
    if (error.reason) return error.reason;
    if (error.shortMessage) return error.shortMessage;
    if (error.message && /insufficient funds/i.test(error.message)) return 'Insufficient ETH for the transaction and gas.';
    return fallback;
  }

  function openModal(id) { $(id)?.classList.add('active'); }
  function closeModal(id) { $(id)?.classList.remove('active'); }

  function wireUI() {
    $('connectWalletBtn')?.addEventListener('click', connectWallet);
    $('sendBtn')?.addEventListener('click', () => userAddress ? openModal('sendModal') : status('⚠️ Connect wallet first'));
    $('receiveBtn')?.addEventListener('click', () => userAddress ? openModal('receiveModal') : status('⚠️ Connect wallet first'));
    $('depositBtn')?.addEventListener('click', () => userAddress ? openModal('depositModal') : status('⚠️ Connect wallet first'));
    $('withdrawBtn')?.addEventListener('click', () => userAddress ? openModal('withdrawModal') : status('⚠️ Connect wallet first'));
    $('confirmSend')?.addEventListener('click', sendETH);
    $('confirmDeposit')?.addEventListener('click', depositETH);
    $('confirmWithdraw')?.addEventListener('click', withdrawETH);
    $('copyAddress')?.addEventListener('click', async () => {
      if (!userAddress) return status('⚠️ Connect wallet first');
      await navigator.clipboard.writeText(userAddress);
      status('📋 Address copied');
    });
    [['closeSend','sendModal'],['closeReceive','receiveModal'],['closeDeposit','depositModal'],['closeWithdraw','withdrawModal']]
      .forEach(([button, modal]) => $(button)?.addEventListener('click', () => closeModal(modal)));
    $('viewAllBtn')?.addEventListener('click', loadRecentActivity);
    $('refreshHealthBtn')?.addEventListener('click', loadHealth);
    $('refreshContactBtn')?.addEventListener('click', checkTrustedContact);
    $('addContactBtn')?.addEventListener('click', addTrustedContact);
    $('removeContactBtn')?.addEventListener('click', removeTrustedContact);
    $('freezeBtn')?.addEventListener('click', () => setFrozenState(true));
    $('unfreezeBtn')?.addEventListener('click', () => setFrozenState(false));
    document.querySelectorAll('.modal').forEach((modal) => modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.classList.remove('active');
    }));
  }

  function wireMetaMask() {
    if (!window.ethereum) return;
    window.ethereum.on('accountsChanged', async (accounts) => accounts.length ? connectWallet() : resetWalletUI());
    window.ethereum.on('chainChanged', () => window.location.reload());
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireUI();
    wireMetaMask();
    setText(els.healthContract, shortAddress(CONTRACT_ADDRESS));
    status('Wallet not connected');
  });
})();
