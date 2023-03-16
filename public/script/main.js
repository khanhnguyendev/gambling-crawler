const socket = io();
let lastBonus = 0;
let totalT = 0;
let totalCT = 0;
let totalBonus = 0;
let total = 0;

socket.on('log', (msg) => {
  if (msg) {
    total += 1;
    lastBonus += 1;
  }
  if (msg === 'T') {
    totalT += 1;
  }
  if (msg === 'CT') {
    totalCT += 1;
  }
  if (msg === 'Bonus') {
    totalBonus += 1;
    lastBonus = 0
  }

  function resetIndex() {
    const rows = document.querySelectorAll('#myTable tbody tr');
    for (let i = 0; i < rows.length; i++) {
      rows[i].querySelector('.index-cell').textContent = i + 1;
    }
  }

  document.getElementById('lastBonus').innerHTML = lastBonus
  document.getElementById('totalT').innerHTML = totalT
  document.getElementById('totalCT').innerHTML = totalCT
  document.getElementById('totalBonus').innerHTML = totalBonus
  document.getElementById('totalDsp').innerHTML = total

  const logDiv = document.createElement('div');
  logDiv.classList.add('log-line');
  if (msg === 'T') {
    logDiv.classList.add('coin-t');
  }
  if (msg === 'CT') {
    logDiv.classList.add('coin-ct');
  }
  if (msg === 'Bonus') {
    logDiv.classList.add('coin-bonus');
  }

  const logLines = document.querySelectorAll('#myTable .log-line');
  const currentIndex = logLines.length;
  const currentRowIndex = Math.floor(currentIndex / 10);
  const currentCellIndex = currentIndex % 10;

  let currentRow = document.querySelector(`#myTable tbody tr:nth-child(${currentRowIndex + 1})`);
  if (!currentRow) {
    currentRow = document.createElement('tr');
    document.querySelector('#myTable tbody').appendChild(currentRow);

    const indexCell = document.createElement('td');
    indexCell.innerText = currentRowIndex + 1;
    indexCell.classList.add('index-cell');
    indexCell.classList.add('text-center');
    currentRow.appendChild(indexCell);

    if (currentRowIndex === 13) {
      document.querySelector('#myTable tbody tr:nth-child(1)').remove();
      resetIndex()
    }
  }

  let currentCell = document.querySelector(`#myTable tbody tr:nth-child(${currentRowIndex + 1}) td:nth-child(${currentCellIndex + 2})`);
  if (!currentCell) {
    for (let i = 0; i < 10; i++) {
      currentCell = document.createElement('td');
      currentCell.classList.add('text-center');
    }
    currentRow.appendChild(currentCell);
  }

  currentCell.appendChild(logDiv);
});