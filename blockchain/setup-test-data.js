// Run this script after deploying contract to add test doctors
// Usage: node setup-test-data.js <contract_address>

const Web3 = require('web3');
const fs = require('fs');

const web3 = new Web3('http://127.0.0.1:7545');
const contractAddress = process.argv[2] || '0x28C43ec609bbC03DcC72A2941A766dF84B1fb2A8';

// Load ABI
const abi = JSON.parse(fs.readFileSync('../frontend/src/HealthcareABI.json', 'utf8'));
const contract = new web3.eth.Contract(abi, contractAddress);

// Ganache accounts (update with your actual addresses)
const adminAccount = '0xYourAdminAddress'; // First account in Ganache
const doctor1Address = '0xYourDoctor1Address'; // Second account
const doctor2Address = '0xYourDoctor2Address'; // Third account

async function setupTestData() {
  try {
    console.log('Adding test doctors...');
    
    // Add Doctor 1
    await contract.methods.addDoctor(
      doctor1Address,
      'Dr. John Smith',
      'Senior Surgeon',
      'City Hospital',
      'MBBS, MS',
      45,
      'Cardiology'
    ).send({ from: adminAccount, gas: 600000 });
    console.log('✅ Doctor 1 added');

    // Add Doctor 2
    await contract.methods.addDoctor(
      doctor2Address,
      'Dr. Sarah Johnson',
      'Consultant',
      'Metro Clinic',
      'MBBS, MD',
      38,
      'Neurology'
    ).send({ from: adminAccount, gas: 600000 });
    console.log('✅ Doctor 2 added');

    console.log('✅ Test data setup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupTestData();
