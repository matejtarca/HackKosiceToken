var http = require('http');
const { DCoreSdk } = require('dcorejs-sdk')

const dcoreApi = DCoreSdk.createForHttp('https://testnet-api.dcore.io/')

http.createServer(async function (req, res) {
	const account= await dcoreApi.accountApi.getByName('decent')
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end(account);
}).listen(8080); 

console.log('Server started');