
const BASE_URL = 'http://localhost:5000/api';

async function main() {
  const email = `test_${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log(`Creating user ${email}...`);
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!regRes.ok) {
    console.error('Registration failed:', await regRes.text());
    return;
  }
  const regData = await regRes.json();
  const token = regData.token;
  console.log('User created. Token obtained.');

  // Deposit funds
  console.log('Depositing $1000...');
  const depRes = await fetch(`${BASE_URL}/deposits`, {
      method: 'POST',
      headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: 1000, note: 'Test deposit' })
  });

  if (!depRes.ok) {
      console.error('Deposit failed:', await depRes.text());
      return;
  }
  console.log('Deposit successful.');

  // Get initial balance
  const balRes = await fetch(`${BASE_URL}/wallets`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const wallets = await balRes.json();
  const usdWallet = wallets.find((w: any) => w.assetName === 'USD' || w.assetName === 'balance_usd');
  const currentBalance = usdWallet ? usdWallet.balanceUsd : 0;
  console.log(`Initial Balance: $${currentBalance}`);

  if (currentBalance < 100) {
      console.error("Insufficient funds to test.");
      return;
  }

  // Place Trade
  const tradeAmount = 100;
  console.log(`Placing trade for $${tradeAmount}...`);
  const tradeRes = await fetch(`${BASE_URL}/trades`, {
    method: 'POST',
    headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        symbol: 'BINANCE:BTCUSDT',
        asset: 'Bitcoin',
        amount: tradeAmount,
        direction: 'High',
        duration: '1M' // 1 minute
    })
  });

  if (!tradeRes.ok) {
      console.error("Trade failed:", await tradeRes.text());
      return;
  }
  
  console.log("Trade placed.");

  // Check Balance Immediately
  const afterBalRes = await fetch(`${BASE_URL}/wallets`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const afterWallets = await afterBalRes.json();
  const afterUsd = afterWallets.find((w: any) => w.assetName === 'USD');
  const afterBalance = afterUsd ? afterUsd.balanceUsd : 0;

  console.log(`Balance Before: $${currentBalance}`);
  console.log(`Balance After:  $${afterBalance}`);

  if (afterBalance === currentBalance) {
      console.log("FAILURE: Balance did not decrease. Infinite Money Glitch exists.");
  } else if (Math.abs(currentBalance - afterBalance - tradeAmount) < 0.01) {
      console.log("SUCCESS: Balance decreased by trade amount.");
  } else {
      console.log(`UNCERTAIN: Balance changed from ${currentBalance} to ${afterBalance}, expected diff ${tradeAmount}`);
  }
}

main().catch(console.error);
