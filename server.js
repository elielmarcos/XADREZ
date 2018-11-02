
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

const portExpress = 8000;
const portWS = 8080;

var Vetor_JOG = [];

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





wss.on('connection', function connection(ws) {

    ws.ID = '';
    ws.Nome = '';
    ws.Status = '';
    ws.Adv = '';
    Vetor_JOG.push(ws);

    ws.on('message', function incoming(MSG) {

        MSG = JSON.parse(MSG);


        if (MSG.tipo == 'CONECTAR') // Novo usuario pedindo para conectar
        {
            Vetor_JOG[Vetor_JOG.length - 1].ID = MSG.valor.ID;
            Vetor_JOG[Vetor_JOG.length - 1].Nome = MSG.valor.Nome;
            Vetor_JOG[Vetor_JOG.length - 1].Status = MSG.valor.Status;
            Vetor_JOG[Vetor_JOG.length - 1].Adv = MSG.valor.Adv;

            console.log(MSG.valor.ID + ' - ' + MSG.valor.Nome + ' - ' + MSG.valor.Status + ' - ' + MSG.valor.Adv + ' conectou.');
            console.log('Conectado(s): ' + Vetor_JOG.length);

            var msgRetorno = {
                tipo: 'CONECTADO',
                valor: 'CONECTADO!'
            }; // Responde que foi conectado
            ws.send(JSON.stringify(msgRetorno));

            enviarListaAtualizada(); // Envia para todos a lista atualizada de usuários

        }


/*
        if (MSG.tipo == 'COMANDO') // Recebeu comando de algum jogador
        {
			let flag = false;
			console.log(ws.ID + ' realizou movimento '+MSG.valor);

            for (let x = 0; x < Vetor_JOG.length; x++)
            {
                if (Vetor_JOG[x].ID == ws.Adv) {
                    ws.send(JSON.stringify(MSG)); // envia para jogador
                    Vetor_JOG[x].send(JSON.stringify(MSG)); // envia para adversario
					flag = true;
                    break;
                }
            }
			
			if(flag == false){
				for (let x = 0; x < Vetor_JOG.length; x++)
				{
					if (Vetor_JOG[x] == ws) {
						Vetor_JOG[x].Adv = ''; 
						Vetor_JOG[x].Status = 'Livre';
						break;
					}
				}
				let msgFim = {
					tipo: 'FINALIZAR',
                    valor: {nomeRemetente: 'ADVERSARIO'}
                }; // envia mensagem ao REMENTENTE para finalizar jogo
                ws.send(JSON.stringify(msgFim));
				enviarListaAtualizada(); // Envia para todos a lista atualizada de usuários
			}
        }



        if (MSG.tipo == 'CONVIDAR') // rementente solicitou convite de jogo para destinatario
        {

            console.log(MSG.valor.remetente + ' Convidou -> ' + MSG.valor.destinatario);

            for (let x = 0; x < Vetor_JOG.length; x++) {
                if (Vetor_JOG[x].ID == MSG.valor.destinatario) {
                    let msgConvite = {
                        tipo: 'CONVITE',
                        valor: {
							destinatario: MSG.valor.destinatario,
							remetente: MSG.valor.remetente,
							nomeRemetente: MSG.valor.nomeRemetente
							}
                    };
                    Vetor_JOG[x].send(JSON.stringify(msgConvite));
                }
            }

        }



        if (MSG.tipo == 'ACEITA') // destinatario aceitou convite de jogo do remetente
        {

            console.log(MSG.valor.destinatario + ' Aceitou convite de -> ' + MSG.valor.remetente);

            for (let x = 0; x < Vetor_JOG.length; x++) {
                if (Vetor_JOG[x].ID == MSG.valor.remetente) // atualiza lista REMETENTE
                {
                    Vetor_JOG[x].Status = 'Jogando';
                    Vetor_JOG[x].Adv = MSG.valor.destinatario;

                    let msgConvite = {
                        tipo: 'ACEITOU',
                        valor: MSG.valor
                    }; // envia mensagem ao REMETENTE que DESTINATARIO aceitou convite
                    Vetor_JOG[x].send(JSON.stringify(msgConvite));
                }

                if (Vetor_JOG[x].ID == MSG.valor.destinatario) // atualiza lista DESTINATARIO
                {
                    Vetor_JOG[x].Status = 'Jogando';
                    Vetor_JOG[x].Adv = MSG.valor.remetente;
                }
            }
            enviarListaAtualizada(); // Envia para todos a lista atualizada de usuários
        }



        if (MSG.tipo == 'RECUSA') // destinatario recusou convite de jogo do remetente
        {

            console.log(MSG.valor.destinatario + ' Recusou convite de -> ' + MSG.valor.remetente);

            for (let x = 0; x < Vetor_JOG.length; x++) {
                if (Vetor_JOG[x].ID == MSG.valor.remetente) // envia mensagem ao REMETENTE que DESTINATARIO recusou convite
                {
                    let msgConvite = {
                        tipo: 'RECUSOU',
                        valor: MSG.valor
                    };
                    Vetor_JOG[x].send(JSON.stringify(msgConvite));
                }
            }


        }




        if (MSG.tipo == 'FINALIZAR') // Algum jogador quer finalizar o jogo
        {

            console.log(MSG.valor.remetente + ' Finalizou o jogo com -> ' + MSG.valor.destinatario);

            for (let x = 0; x < Vetor_JOG.length; x++) {
                if (Vetor_JOG[x].ID == MSG.valor.remetente) // atualiza lista REMETENTE
                {
                    Vetor_JOG[x].Status = 'Livre';
                    Vetor_JOG[x].Adv = '';
                }

                if (Vetor_JOG[x].ID == MSG.valor.destinatario) // atualiza lista DESTINATARIO
                {
                    Vetor_JOG[x].Status = 'Livre';
                    Vetor_JOG[x].Adv = '';
					MSG.valor.nomeRemetente = 'ADVERSARIO';
                    let msgFim = {
                        tipo: 'FINALIZAR',
                        valor: MSG.valor
                    }; // envia mensagem ao DESTINATARIO para finalizar jogo
                    Vetor_JOG[x].send(JSON.stringify(msgFim));
                }
            }
            enviarListaAtualizada(); // Envia para todos a lista atualizada de usuários
        }

*/
    });

    ws.on('close', function close() { // se alguem desconectar, retire da lista e finaliza o jogo
/*
		if (ws.Adv!=''){
            console.log(ws.ID + ' Finalizou o jogo com -> ' + ws.Adv);
			for (let x = 0; x < Vetor_JOG.length; x++) {
                if (Vetor_JOG[x].ID == ws.Adv) // atualiza lista DESTINATARIO
                {
                    Vetor_JOG[x].Status = 'Livre';
                    Vetor_JOG[x].Adv = '';
					
                    let msgFim = {
                        tipo: 'FINALIZAR',
                        valor: {remetente: ws.ID, nomeRemetente: 'ADVERSARIO'}
                    }; // envia mensagem ao DESTINATARIO para finalizar jogo
                    Vetor_JOG[x].send(JSON.stringify(msgFim));
                }
            }
		}
		
        for (let x = 0; x < Vetor_JOG.length; x++) {	// remove usuario que saiu da pagina
            if (Vetor_JOG[x] == ws) {
				console.log(ws.ID + ' desconectou.');
                Vetor_JOG.splice(x, 1);
                break;
            }
        }

        enviarListaAtualizada(); // Envia para todos a lista atualizada de usuários
*/
    });


});






function fazBroadcast(msg) {
    for (var x = 0; x < Vetor_JOG.length; x++) {
        try {
            Vetor_JOG[x].send(JSON.stringify(msg));
        } catch (e) {

        }
    }
}




function enviarListaAtualizada() { // envia lista de jogadores atualizada
    var lista = [];

    for (var x = 0; x < Vetor_JOG.length; x++) {
        lista.push({
            ID: Vetor_JOG[x].ID,
            Nome: Vetor_JOG[x].Nome,
            Status: Vetor_JOG[x].Status,
            Adv: Vetor_JOG[x].Adv
        });
    }

    var msgLista = {
        tipo: 'LISTA',
        valor: lista
    };
    fazBroadcast(msgLista);
}