let calculation = localStorage.getItem('calculation') || '';
displayResult();

function updateCalculation(inputButton) {
  calculation += inputButton;
  localStorage.setItem('calculation', calculation);
  displayResult();
};

function displayResult() {
  document.querySelector('.result-display').innerHTML = calculation || '&nbsp;';
};
