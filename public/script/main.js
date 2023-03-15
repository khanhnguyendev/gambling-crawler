const socket = io();

socket.on('log', (msg) => {
  const logDiv = document.getElementById('log');
  const logLine = document.createElement('div');
  logLine.classList.add('log-line');
  logLine.innerText = msg;
  logDiv.appendChild(logLine);

  const logLines = logDiv.getElementsByClassName('log-line');
  if (logLines.length % 2 === 0) {
    logDiv.appendChild(document.createElement('br'));
  }
  const totalTxt = document.getElementById('totalTxt');
  totalTxt.innerText = logLines.length
});