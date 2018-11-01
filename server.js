
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const WebSocket = require('ws');
var http = require('http');
var os = require( 'os' );
var interfaces = os.networkInterfaces();

const addresses = Object.keys(interfaces)
  .reduce((results, name) => results.concat(interfaces[name]), [])
  .filter((iface) => iface.family === 'IPv4' && !iface.internal)
  .map((iface) => iface.address); // pega o ip local

const portExpress = 8080;
const portWS = 8000;

app.use(express.static('www'));



// Servidor disponibiliza uma porta para a conexão websocket
const wss = new WebSocket.Server({port : portWS}, function() {
    console.log('WEBSOCKET RODANDO NA PORTA http://%s:%s', addresses,portWS);
});

// porta 8000: porta de conexão websocket
// porta 8080: porta da página requisitada


var server = app.listen(portExpress , function () {

    //var host = server.address().address;
    var port = server.address().port;

    console.log('EXPRESS RODANDO NA PORTA http://%s:%s', addresses, port);

})

		
		
wss.on('connection', function connection(ws) { //Faz uma conexão WebSocket Security

		ws.on('message', function incoming(MSG) {	// Requisição vinda do index.html
		
			MSG = JSON.parse(MSG);

			if (MSG.tipo == 'CONECTAR') // Usuario se conectando
			{
				console.log('Conectou');
				var msgRetorno = {
					tipo: 'CONECTADO',
					valor: 'CONECTADO!'
				}; // Responde que foi conectado
				ws.send(JSON.stringify(msgRetorno)); // Resposta à Requisição de Conexão
			}
			

		});

		ws.on('close', function close() { // Se o usuário desconectar

			console.log('Desconectou');

		});


});