document.getElementById('openBot').onclick = function() {
  document.getElementById('botWindow').classList.add('active');
  document.getElementById('botInput').focus();
};

document.getElementById('closeBot').onclick = function() {
  document.getElementById('botWindow').classList.remove('active');
};

document.getElementById('botSend').onclick = sendBotMessage;

document.getElementById('botInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendBotMessage();
});

function sendBotMessage() {
  const input = document.getElementById('botInput');
  const msg = input.value.trim();
  if (!msg) return;

  const botMessages = document.getElementById('botMessages');
  botMessages.innerHTML += `<div class="user-message">${msg}</div>`;
  input.value = '';

  setTimeout(() => {
    let resp = '';

    const lowerMsg = msg.toLowerCase();

    if (lowerMsg.length < 3) {
      resp = '¿Podrías darme un poco más de contexto para ayudarte mejor?';
    } else if (lowerMsg.includes('autos') || lowerMsg.includes('número') || lowerMsg.includes('vehículos')) {
      resp = 'El campo "Número de autos" te permite definir cuántos autos verás en la simulación. Usa cualquier número entre 1 y 100.';
    } else if (lowerMsg.includes('tráfico') || lowerMsg.includes('fluido') || lowerMsg.includes('moderado') || lowerMsg.includes('congestionado')) {
      resp = 'Puedes seleccionar entre tráfico "Fluido", "Moderado" o "Congestionado", lo que afecta la velocidad y la cantidad de autos en el mapa.';
    } else if (lowerMsg.includes('simulador') || lowerMsg.includes('inicio') || lowerMsg.includes('empezar')) {
      resp = 'Cuando termines de configurar, da clic en "Iniciar Simulador" para empezar la animación.';
    } else if (lowerMsg.includes('zoom') || lowerMsg.includes('acercar') || lowerMsg.includes('alejar')) {
      resp = 'Los botones de zoom están en la parte inferior derecha. Úsalos para acercar o alejar el mapa según tu preferencia.';
    } else if (lowerMsg.includes('recargar') || lowerMsg.includes('reload') || lowerMsg.includes('reiniciar')) {
      resp = 'El botón de recargar reinicia la simulación, borrando bloqueos, autos y otras configuraciones activas.';
    } else if (lowerMsg.includes('micrófono') || lowerMsg.includes('voz') || lowerMsg.includes('hablar')) {
      resp = 'Puedes usar el micrófono para dictar instrucciones. Solo haz clic en el ícono del micrófono y empieza a hablar.';
    } else if (lowerMsg.includes('semáforo') || lowerMsg.includes('luces')) {
      resp = 'En el simulador puedes controlar los semáforos haciendo clic en los círculos rojo, amarillo o verde que están sobre el mapa.';
    } else {
      resp = '¡Gracias por tu pregunta! Por ahora soy un asistente básico, pero puedo ayudarte con instrucciones sobre el uso del simulador. Prueba preguntar por "autos", "tráfico", "zoom", "micrófono" o "simulador".';
    }

    botMessages.innerHTML += `<div class="bot-message">${resp}</div>`;
    botMessages.scrollTop = botMessages.scrollHeight;
  }, 500);
}
