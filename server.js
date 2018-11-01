
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



function placeInfoFunc(id) { // metodo que retorna: id, classe e preço do assento
            var ECONOM_PLUS_ROW_MIN = 21; // define o limite da classe economica-plus
            
			/*     Uso de expressões regulares para definir os assentos:
		
					[abcd] <=> [a-d] => indica um conjunto de caracteres
					{n}              => Indica uma pesquisa das n ocorrências correspondentes ao caracter precedido.
					x|y              => Pesquisa correspondência em 'x' ou 'y'
	
			*/

            var regBusinessClass = /[1-3]{1}-(A|B|E|F)/; // 3 fileiras identificadas com A, B, E e F definido como um objteto de expressão regular
            var regeconomClass = /([7-9]{1}|[0-9]{2})-(A|B|C|D|E|F)/; // definem as fileiras da classe economica
            /* Faz as condições para verificar os assentos correspondentes às categorias de bordo*/
            var businessClass = id.match(regBusinessClass) ? id.match(regBusinessClass)[0] : false; // metodo match faz uma busca na expressão regular
            var economPlusClass = id.match(regeconomClass) && id.match(regeconomClass)[1] <= ECONOM_PLUS_ROW_MIN ? id.match(regeconomClass)[0] : false;
            var economClass = id.match(regeconomClass) && id.match(regeconomClass)[1] > ECONOM_PLUS_ROW_MIN ? id.match(regeconomClass)[0] : false;
			
            switch (id) {
                case businessClass:
                    return {
                        place: id,
                        class: 'Classe Empresarial',
                        price: '350'
                    };
                case economPlusClass:
                    return {
                        place: id,
                        class: 'Classe Econômica-Plus',
                        price: '250'
                    };
                case economClass:
                    return {
                        place: id,
                        class: 'Classe Econômica',
                        price: '150'
                    };
            }
        }

		
		
		
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
			
			if (MSG.tipo == 'VALOR') // Usuario requisitando o valor do assento
			{
				console.log('[Requisição] => Assento: '+MSG.Assento);

				var msgRetorno = {
					tipo: 'VALOR',
					valor: placeInfoFunc(MSG.Assento)
				}; // Responde que foi conectado
				console.log('[Resposta] => Assento: '+JSON.stringify(msgRetorno.valor));
				ws.send(JSON.stringify(msgRetorno)); 	// Resposta à Requisição do Valor do Assento
			}
		});

		ws.on('close', function close() { // Se o usuário desconectar

			console.log('Desconectou');

		});


});