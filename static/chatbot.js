// chatbot.js
document.getElementById('openBot').onclick = function() {
  document.getElementById('botWindow').classList.remove('hidden');
}
document.getElementById('closeBot').onclick = function() {
  document.getElementById('botWindow').classList.add('hidden');
}
document.getElementById('botSend').onclick = sendBotMessage;
document.getElementById('botInput').addEventListener('keydown', function(e){
  if(e.key === 'Enter') sendBotMessage();
});

function sendBotMessage() {
  const input = document.getElementById('botInput');
  const msg = input.value.trim();
  if(!msg) return;
  const botMessages = document.getElementById('botMessages');
  botMessages.innerHTML += `<div class="bg-gray-200 p-3 rounded-xl text-right ml-10 shadow">${msg}</div>`;
  input.value = '';
  setTimeout(() => {
    let resp = '';
    if(msg.toLowerCase().includes('autos') || msg.toLowerCase().includes('número')) {
      resp = 'El campo "Número de autos" te permite definir cuántos autos verás en la simulación. Usa cualquier número entre 1 y 100.';
    } else if(msg.toLowerCase().includes('tráfico')) {
      resp = 'Puedes seleccionar entre tráfico "Fluido", "Moderado" o "Congestionado", lo que afecta la velocidad y la cantidad de autos en el mapa.';
    } else if(msg.toLowerCase().includes('simulador')) {
      resp = 'Cuando termines de configurar, da clic en "Iniciar Simulador" para empezar la animación.';
    } else {
      resp = '¡Gracias por tu pregunta! Por ahora soy un asistente básico, pero puedo ayudarte con instrucciones sobre el uso del simulador. Prueba preguntar por "autos", "tráfico" o "simulador".';
    }
    botMessages.innerHTML += `<div class="bg-blue-100 p-3 rounded-xl shadow mr-10">${resp}</div>`;
    botMessages.scrollTop = botMessages.scrollHeight;
  }, 500);
}

