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

var websocket;
var Flag_Backup = 0;

var Vetor_JOG = [];
var possiveis = new Array();
var movimenta;
var peca;
var log;

app.use(express.static('www'));

// Servidor disponibiliza uma porta para a conexão websocket
const wss = new WebSocket.Server({port : portWS}, function() {
    console.log('WEBSOCKET RODANDO NA PORTA http://%s:%s', addresses,portWS);
});

// porta 8080: porta de conexão websocket
// porta 8000: porta da página requisitada

var server = app.listen(portExpress , function () {
    var port = server.address().port;
    console.log('EXPRESS RODANDO NA PORTA http://%s:%s', addresses, port);
});

 connect_Backup();

	function connect_Backup() {
            websocket = new WebSocket('ws://localhost:9000');
            websocket.onopen = function() {
				Flag_Backup = 1;
				var MSG = {
					tipo: 'CONECTAR',
					valor: 'SERVIDOR_1'
				};
				websocket.send(JSON.stringify(MSG));

            };
			
            websocket.onclose = function(e) {
                Flag_Backup = 0;
				console.log('Reconectando com SERVIDOR_BACKUP...');
                websocket.close();
				setTimeout(function() {
                    connect_Backup();
                }, 5000);
            };
			
            websocket.onmessage = function(e) {
                //console.log('Message:', e.data);
                //onMessage(e);
            };
			
            websocket.onerror = function(err) {
                //console.error('Erro encontrado no socket', err.message, 'Fechando socket');
            };
        };


function envia_log(data){
	
	if(Flag_Backup){
		websocket.send(JSON.stringify({
					tipo: 'LOG',
					valor: data
		}));
	}				
	
};
		
wss.on('connection', function connection(ws) {

    ws.ID = '';
    ws.Nome = '';
    ws.Status = '';
    ws.Adv = '';
	ws.Cor = '';
    Vetor_JOG.push(ws);

    ws.on('message', function incoming(MSG) {

        MSG = JSON.parse(MSG);

        if (MSG.tipo == 'CONECTAR') // Novo usuario pedindo para conectar
        {
            Vetor_JOG[Vetor_JOG.length - 1].ID = MSG.valor.ID;
            Vetor_JOG[Vetor_JOG.length - 1].Nome = MSG.valor.Nome;
            Vetor_JOG[Vetor_JOG.length - 1].Status = MSG.valor.Status;
            Vetor_JOG[Vetor_JOG.length - 1].Adv = MSG.valor.Adv;
			Vetor_JOG[Vetor_JOG.length - 1].Cor = MSG.valor.Cor;
			
			log = MSG.valor.ID + ' - ' + MSG.valor.Nome + ' - ' + MSG.valor.Status + ' - ' + MSG.valor.Adv + ' - ' + MSG.valor.Cor + ' conectou.';
            console.log(log);
			envia_log(log);
			
			log = 'Conectado(s): ' + Vetor_JOG.length;
            console.log(log);
			envia_log(log);

			
			
            var msgRetorno = {
                tipo: 'CONECTADO',
                valor: 'CONECTADO!'
            }; // Responde que foi conectado
            ws.send(JSON.stringify(msgRetorno));

            enviarListaAtualizada(); // Envia para todos a lista atualizada de usuários

        }
		
		if (MSG.tipo == 'MOVIMENTO') // Recebeu comando de algum jogador
        {
			peca = MSG.valor.peca;
			movimenta = MSG.valor.movimenta;
			
			if(!seleciona(movimenta[1]['x'],movimenta[1]['y'])){
			
				var flag = false;
				log = ws.ID + ' realizou movimento (' + movimenta[0]['x'] +','+ movimenta[0]['y']+') ' + movimenta[0]['peca'] + ' ' + movimenta[0]['cor'] + ' -> (' + movimenta[1]['x'] +','+ movimenta[1]['y']+')';
				console.log(log);
				envia_log(log);
				

				for (var x = 0; x < Vetor_JOG.length; x++)
				{
					if (Vetor_JOG[x].ID == ws.Adv) {
						MSG.valor.vez = Vetor_JOG[x].Cor; // envia pro adversario a cor
						ws.send(JSON.stringify(MSG)); // envia para jogador
						Vetor_JOG[x].send(JSON.stringify(MSG)); // envia para adversario
						flag = true;
						break;
					}
				}
				
				if(flag == false){
					for (var x = 0; x < Vetor_JOG.length; x++)
					{
						if (Vetor_JOG[x] == ws) {
							Vetor_JOG[x].Adv = ''; 
							Vetor_JOG[x].Status = 'Livre';
							Vetor_JOG[x].Cor = '';
							break;
						}
					}
					var msgFim = {
						tipo: 'FINALIZAR',
						valor: {nomeRemetente: 'ADVERSARIO'}
					}; // envia mensagem ao REMENTENTE para finalizar jogo
					ws.send(JSON.stringify(msgFim));
					enviarListaAtualizada(); // Envia para todos a lista atualizada de usuários
				}
			}else{
				var flag = false;
				log = ws.ID + ' realizou movimento (' + movimenta[0]['x'] +','+ movimenta[0]['y']+') ' + movimenta[0]['peca'] + ' ' + movimenta[0]['cor'] + ' -> (' + movimenta[1]['x'] +','+ movimenta[1]['y']+')';
				console.log(log);
				envia_log(log);
				

				for (var x = 0; x < Vetor_JOG.length; x++)
				{
					if (Vetor_JOG[x].ID == ws.Adv) {
						MSG.valor.vez = Vetor_JOG[x].Cor; // envia pro adversario a cor
						ws.send(JSON.stringify(MSG)); // envia para jogador
						Vetor_JOG[x].send(JSON.stringify(MSG)); // envia para adversario
						
						var ganhou = {
							tipo: 'GANHOU',
							valor: ws.ID
						};
						ws.send(JSON.stringify(ganhou)); // envia para jogador
						Vetor_JOG[x].send(JSON.stringify(ganhou)); // envia para adversario
						flag = true;
						log = ws.ID+' ganhou de '+ws.Adv+'\n'+'JOGO FINALIZADO!';
						console.log(log);
						envia_log(log);
						Vetor_JOG[x].Adv = "";
						Vetor_JOG[x].Status = 'Livre';
						Vetor_JOG[x].Cor = "";
						
						for(var i = 0; i < Vetor_JOG.length; i++){
							if(Vetor_JOG[i] == ws){
								Vetor_JOG[i].Adv = "";
								Vetor_JOG[i].Status = 'Livre';
								Vetor_JOG[i].Cor = "";
							}
						}
						
						enviarListaAtualizada(); 
						break;
					}
					
				}
				
				if(flag == false){
					for (var x = 0; x < Vetor_JOG.length; x++)
					{
						if (Vetor_JOG[x] == ws) {
							Vetor_JOG[x].Adv = ''; 
							Vetor_JOG[x].Status = 'Livre';
							Vetor_JOG[x].Cor = '';
							break;
						}
					}
					var msgFim = {
						tipo: 'FINALIZAR',
						valor: {nomeRemetente: 'ADVERSARIO'}
					}; // envia mensagem ao REMENTENTE para finalizar jogo
					ws.send(JSON.stringify(msgFim));
					enviarListaAtualizada(); // Envia para todos a lista atualizada de usuários
				}
			}	
		}

        if (MSG.tipo == 'CONVIDAR') // rementente solicitou convite de jogo para destinatario
        {

			log = MSG.valor.remetente + ' Convidou -> ' + MSG.valor.destinatario;
            console.log(log);
			envia_log(log);

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
					break;
                } 
            }
        }

        if (MSG.tipo == 'ACEITA') // destinatario aceitou convite de jogo do remetente
        {
			var cor_remetente;

			if(MSG.valor.Cor=='branco'){cor_remetente='preto';}else{cor_remetente='branco';}

			log = MSG.valor.destinatario + '(' + MSG.valor.Cor + ') Aceitou convite de -> ' + MSG.valor.remetente + '(' + cor_remetente + ')';
            console.log(log);
			envia_log(log);
			
            for (var x = 0; x < Vetor_JOG.length; x++) { // atualiza lista DESTINATARIO
                if (Vetor_JOG[x].ID == MSG.valor.destinatario) 
                {
                    Vetor_JOG[x].Status = 'Jogando';
                    Vetor_JOG[x].Adv = MSG.valor.remetente;
					Vetor_JOG[x].Cor = MSG.valor.Cor;
                }
            }
			
			MSG.tipo = 'ACEITOU'; 
			MSG.valor.Cor = cor_remetente;
			
			for (var x = 0; x < Vetor_JOG.length; x++) { // atualiza lista REMETENTE
                if (Vetor_JOG[x].ID == MSG.valor.remetente) 
                {
                    Vetor_JOG[x].Status = 'Jogando';
                    Vetor_JOG[x].Adv = MSG.valor.destinatario;
					Vetor_JOG[x].Cor = cor_remetente;
                    Vetor_JOG[x].send(JSON.stringify(MSG));
                }
			}
			
            enviarListaAtualizada(); // Envia para todos a lista atualizada de usuários
        }

        if (MSG.tipo == 'RECUSA') // destinatario recusou convite de jogo do remetente
        {

			log = MSG.valor.destinatario + ' Recusou convite de -> ' + MSG.valor.remetente;
            console.log(log);
			envia_log(log);

            for (let x = 0; x < Vetor_JOG.length; x++) {
                if (Vetor_JOG[x].ID == MSG.valor.remetente) // envia mensagem ao REMETENTE que DESTINATARIO recusou convite
                {
                    let msgConvite = {
                        tipo: 'RECUSOU',
                        valor: MSG.valor
                    };
                    Vetor_JOG[x].send(JSON.stringify(msgConvite));
					break;
                }
            }

        }

        if (MSG.tipo == 'FINALIZAR') // Algum jogador quer finalizar o jogo
        {

			log = MSG.valor.remetente + ' Finalizou o jogo com -> ' + MSG.valor.destinatario;
            console.log(log);
			envia_log(log);

            for (var x = 0; x < Vetor_JOG.length; x++) {
                if (Vetor_JOG[x].ID == MSG.valor.remetente) // atualiza lista REMETENTE
                {
                    Vetor_JOG[x].Status = 'Livre';
                    Vetor_JOG[x].Adv = '';
					Vetor_JOG[x].Cor = '';
                }

                if (Vetor_JOG[x].ID == MSG.valor.destinatario) // atualiza lista DESTINATARIO
                {
                    Vetor_JOG[x].Status = 'Livre';
                    Vetor_JOG[x].Adv = '';
					Vetor_JOG[x].Cor = '';
					MSG.valor.nomeRemetente = 'ADVERSARIO';
                    var msgFim = {
                        tipo: 'FINALIZAR',
                        valor: MSG.valor
                    }; // envia mensagem ao DESTINATARIO para finalizar jogo
                    Vetor_JOG[x].send(JSON.stringify(msgFim));
                }
            }
            enviarListaAtualizada(); // Envia para todos a lista atualizada de usuários
        }
    });

    ws.on('close', function close() { // se alguem desconectar, retire da lista e finaliza o jogo

		if (ws.Adv!=''){
			log = ws.ID + ' Finalizou o jogo com -> ' + ws.Adv;
            console.log(log);
			envia_log(log);
			for (var x = 0; x < Vetor_JOG.length; x++) {
                if (Vetor_JOG[x].ID == ws.Adv) // atualiza lista DESTINATARIO
                {
                    Vetor_JOG[x].Status = 'Livre';
                    Vetor_JOG[x].Adv = '';
					Vetor_JOG[x].Cor = '';
					
                    var msgFim = {
                        tipo: 'FINALIZAR',
                        valor: {remetente: ws.ID, nomeRemetente: 'ADVERSARIO'}
                    }; // envia mensagem ao DESTINATARIO para finalizar jogo
                    Vetor_JOG[x].send(JSON.stringify(msgFim));
                }
            }
		}
		
        for (var x = 0; x < Vetor_JOG.length; x++) {	// remove usuario que saiu da pagina
            if (Vetor_JOG[x] == ws) {
				log = ws.ID + ' desconectou.';
				console.log(log);
				envia_log(log);
                Vetor_JOG.splice(x, 1);
                break;
            }
        }
        enviarListaAtualizada(); // Envia para todos a lista atualizada de usuários
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
            Adv: Vetor_JOG[x].Adv,
			Cor: Vetor_JOG[x].Cor
        });
    }
	
    var msgLista = {
        tipo: 'LISTA',
        valor: lista
    };
    fazBroadcast(msgLista);
}

function verifica_possivel(x,y,c){ // faz a busca no vetor de possíveis verificando se tem a posição de destino neste vetor 
	var pode=0;
	var cp;
	var div = "t"+x+y;
	
	for(cp=1;cp<c;cp++){
		
		if(possiveis[cp]==div){
			pode ++;
		}
		if(pode>0){
			return 1;
		}
	}	
}

function possiveis_movimentos(x, y){
	
		var c = 0; //contador pro array possiveis
		var i; //contador pros for
		
		possiveis[c] = "t"+x+y; c++;
       ///////////////////////////////////////////////////////////////////////////////////PEAO////////////////////////////////
		
		if(peca[x][y]['peca']=='peao'){
			
			if(peca[x][y]['cor']=='branco'){
					
					if(!peca[x-1][y]['peca']){
						possivel(x-1,y);
					}if(y-1>0 && peca[x-1][y-1]['peca']){
						possivel(x-1,y-1);						
					}
					if(y+1<9 && peca[x-1][y+1]['peca']){
						possivel(x-1,y+1);					
					}					

					if(x==7){ // primeiro movimento pulo duplo
						if(!peca[x-2][y]['peca'] && !peca[x-1][y]['peca']){
							possivel(x-2,y);
						}
					}

			}
			
			if(peca[x][y]['cor']=='preto'){
					
					if(!peca[x+1][y]['peca']){
						possivel(x+1,y);
					}if(y-1>0 && peca[x+1][y-1]['peca']){
						possivel(x+1,y-1);						
					}
					if(y+1<9 && peca[x+1][y+1]['peca']){
						possivel(x+1,y+1);					
					}					

					if(x==2){ // primeiro movimento pulo duplo
					
						if(!peca[x+2][y]['peca'] && !peca[x+1][y]['peca']){
							possivel(x+2,y);
						}
			
					}

			}
		}
       ///////////////////////////////////////////////////////////////////////////////////////FIM PEAO//////////////////////////////

       //////////////////////////////////////////////////////////////////////////////////////CAVALO ////////////////////////////////

		if(peca[x][y]['peca']=='cavalo'){
			
			possivel(x-1,y-2);
			possivel(x+1,y+2);
			possivel(x+1,y-2);
			possivel(x-1,y+2);
			possivel(x-2,y-1);
			possivel(x+2,y+1);
			possivel(x+2,y-1);
			possivel(x-2,y+1);
			
		}
       //////////////////////////////////////////////////////////////////////////////////////FIM CAVALO ////////////////////////////

       //////////////////////////////////////////////////////////////////////////////////////REI ///////////////////////////////////
		if(peca[x][y]['peca']=='rei'){
			possivel(x-1,y);
			possivel(x,y-1);
			possivel(x-1,y-1);
			possivel(x+1,y);
			possivel(x,y+1);
			possivel(x+1,y+1);
			possivel(x-1,y+1);
			possivel(x+1,y-1);
		}
       //////////////////////////////////////////////////////////////////////////////////////FIM REI ////////////////////////////


       //////////////////////////////////////////////////////////////////////////////////////TORRE ///////////////////////////////////
		if(peca[x][y]['peca']=='torre'){
			
			for(i=1;possivel(x-i,y);i++);
			for(i=1;possivel(x+i,y);i++);
			for(i=1;possivel(x,y-i);i++);
			for(i=1;possivel(x,y+i);i++);
		}
       //////////////////////////////////////////////////////////////////////////////////////FIM TORRE ////////////////////////////

       //////////////////////////////////////////////////////////////////////////////////////BISPO ///////////////////////////////////
		if(peca[x][y]['peca']=='bispo'){
			
			for(i=1;possivel(x-i,y-i);i++);
			for(i=1;possivel(x+i,y+i);i++);
			for(i=1;possivel(x-i,y+i);i++);
			for(i=1;possivel(x+i,y-i);i++);
		}
       //////////////////////////////////////////////////////////////////////////////////////FIM BISPO ////////////////////////////

       //////////////////////////////////////////////////////////////////////////////////////RAINHA ///////////////////////////////////
		if(peca[x][y]['peca']=='rainha'){
			
			for(i=1;possivel(x-i,y-i);i++);
			for(i=1;possivel(x+i,y+i);i++);
			for(i=1;possivel(x-i,y+i);i++);
			for(i=1;possivel(x+i,y-i);i++);
			for(i=1;possivel(x-i,y);i++);
			for(i=1;possivel(x+i,y);i++);
			for(i=1;possivel(x,y-i);i++);
			for(i=1;possivel(x,y+i);i++);
			
		}
       //////////////////////////////////////////////////////////////////////////////////////FIM RAINHA ////////////////////////////

		function possivel(px,py){
				
				if(px>0 && px <9 && py>0 && py <9 && peca[px][py]['cor']!= movimenta[0]['cor']){
					//document.getElementById('t'+(px)+(py)).style.backgroundColor = "#3C9"; //muda cor de fundo
					possiveis[c] = "t"+(px)+(py); 
					c++;
					
					if(!peca[px][py]['peca']){
						return true;
					}
				}else{
					return false;
				}
		}
	return c;
}


function seleciona(x,y){
		var cont_possiveis;
		cont_possiveis = possiveis_movimentos(movimenta[0]['x'],movimenta[0]['y']);	

		if(verifica_possivel(x,y,cont_possiveis)){ //se for segundo clique e a cor da peca destino for diferente da selecionada
			
			if(peca[x][y]['peca']=="rei"){
				return 1;
			}
			if(peca[x][y]['cor'] != movimenta[0]['cor']){ // peça selecionada é diferente da peça de origem
				
				
				peca[x][y]['peca'] = movimenta[0]['peca'];	//posicao destino recebe a peca
				peca[x][y]['cor'] = movimenta[0]['cor'];		//posicao destino recebe a cor
								
				peca[movimenta[0]['x']][movimenta[0]['y']]['peca'] = false;		//peca selecionada recebe 0
				peca[movimenta[0]['x']][movimenta[0]['y']]['cor'] = false;		//cor selecionada recebe 0	
			}
		}
	return 0;
}