// --- SELETORES DO DOM ---
const scoreEl = document.getElementById('score');
const flagImageEl = document.getElementById('flag-image');
const optionsContainerEl = document.getElementById('options-container');
const feedbackMessageEl = document.getElementById('feedback-message');
const hintContainerEl = document.getElementById('hint-container');
const hintTextEl = document.getElementById('hint-text');
const nextButtonEl = document.getElementById('next-button');

// Seletores de Dicas e Timer
const timerEl = document.getElementById('timer');
const timerBarEl = document.getElementById('timer-bar');
const hintEliminateBtn = document.getElementById('hint-eliminate');
const hintCapitalBtn = document.getElementById('hint-capital');
const eliminateHintsCountEl = document.getElementById('eliminate-hints-count');
const capitalHintsCountEl = document.getElementById('capital-hints-count');


// --- VARIÁVEIS DE ESTADO DO JOGO ---
let allCountries = [];
let score = 0;
let correctAnswer = null;
let isAnswered = false;

// Variáveis de Dicas e Timer
let eliminateHintsLeft = 3;
let capitalHintsLeft = 2;
let timerInterval; // Para guardar a referência do setInterval
let timeRemaining;
const ROUND_TIME = 15; // 15 segundos para responder


// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', fetchCountries);
nextButtonEl.addEventListener('click', loadNewRound);
hintEliminateBtn.addEventListener('click', useEliminateHint);
hintCapitalBtn.addEventListener('click', useCapitalHint);

async function fetchCountries() {
    // 💡 Melhoria: Fallback para tentar carregar de diferentes regiões
    const endpoints = [
        'https://restcountries.com/v3.1/region/europe?fields=name,flags,capital',
        'https://restcountries.com/v3.1/region/americas?fields=name,flags,capital', 
        'https://restcountries.com/v3.1/all?fields=name,flags,capital' // Último recurso
    ];

    for (const url of endpoints) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) throw new Error(`Falha ao carregar de ${url}`);

            let data = await response.json();
            
            // Filtra países sem capital ou com nomes muito longos
            allCountries = data.filter(country => country.capital && country.capital.length > 0 && country.name.common.length < 20);
            
            if (allCountries.length < 10) throw new Error("Países insuficientes após filtro.");
            
            updateHintCounters();
            loadNewRound();
            return; // Sai da função após o sucesso

        } catch (error) {
            console.warn(`Tentativa de carregamento falhou: ${error.message}. Tentando o próximo endpoint...`);
            // Continua para o próximo item no loop
        }
    }

    // Se o loop terminou sem sucesso
    feedbackMessageEl.textContent = "Erro ao carregar o jogo. Tente recarregar.";
}


// --- LÓGICA DO JOGO ---

function loadNewRound() {
    isAnswered = false;
    optionsContainerEl.innerHTML = '';
    feedbackMessageEl.textContent = '';
    hintContainerEl.classList.add('hidden');
    hintTextEl.textContent = '';
    nextButtonEl.classList.add('hidden');
    
    // 💡 Melhoria: Limpa a src da bandeira antes de carregar a nova
    flagImageEl.src = ''; 
    flagImageEl.alt = 'Carregando Bandeira...';

    // Reseta botões de dica
    hintEliminateBtn.disabled = eliminateHintsLeft === 0;
    hintCapitalBtn.disabled = capitalHintsLeft === 0;

    // 1. Escolher 4 países
    const options = [];
    // 💡 Evita que as dicas que foram usadas na rodada anterior afetem a próxima
    const tempCountries = [...allCountries]; 
    for (let i = 0; i < 4; i++) {
        // Garante que a lista de países seja suficiente
        if (tempCountries.length === 0) break; 
        const randomIndex = Math.floor(Math.random() * tempCountries.length);
        options.push(tempCountries.splice(randomIndex, 1)[0]);
    }
    
    // Pega o primeiro como resposta (ou um aleatório)
    correctAnswer = options[Math.floor(Math.random() * options.length)];
    if (!correctAnswer) {
         feedbackMessageEl.textContent = "Erro ao carregar rodada.";
         return;
    }


    // 2. Mostrar bandeira
    flagImageEl.src = correctAnswer.flags.svg;
    flagImageEl.alt = `Bandeira de ${correctAnswer.name.common}`;

    // 3. Criar botões de opção
    options.forEach(country => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = country.name.common;
        button.addEventListener('click', () => checkAnswer(country, button));
        optionsContainerEl.appendChild(button);
    });

    // 4. Iniciar o Timer
    startTimer();
}

function checkAnswer(selectedCountry, button) {
    if (isAnswered) return;
    isAnswered = true;
    
    stopTimer(); // Para o cronômetro
    
    // Desabilita todos os botões de opção.
    document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
    // A dica da capital é desabilitada porque será mostrada em caso de erro.
    hintCapitalBtn.disabled = true; 

    if (selectedCountry && selectedCountry.name.common === correctAnswer.name.common) {
        // ACERTOU
        score++;
        scoreEl.textContent = score;
        feedbackMessageEl.textContent = "Correto! 🎉";
        button.classList.add('correct');
        // Se acertou, desabilita a dica de eliminação também
        hintEliminateBtn.disabled = true; 
    } else {
        // ERROU (ou o tempo acabou)
        feedbackMessageEl.textContent = (selectedCountry === null) ? "Tempo esgotado! ⌛" : "Errado! 😢";
        if(button) button.classList.add('incorrect'); // Só adiciona classe se um botão foi clicado

        // 💡 Melhoria: Mantém a possibilidade de usar a dica de eliminação 
        // após o erro, se houver dicas restantes e opções para eliminar.
        hintEliminateBtn.disabled = eliminateHintsLeft === 0; 
        
        // Mostra a resposta certa
        document.querySelectorAll('.option-btn').forEach(btn => {
            if (btn.textContent === correctAnswer.name.common) {
                btn.classList.add('correct');
            }
        });
        
        // Mostra a dica da capital se ainda não foi mostrada
        if (hintContainerEl.classList.contains('hidden')) {
            showCapitalHint(false); // Apenas mostra, não gasta dica
        }
    }

    nextButtonEl.classList.remove('hidden');
}


// --- LÓGICA DO CRONÔMETRO ---

function startTimer() {
    timeRemaining = ROUND_TIME;
    timerEl.textContent = timeRemaining;
    
    // Reseta a barra de tempo
    timerBarEl.style.transition = 'none'; // Remove transição para resetar
    timerBarEl.style.width = '100%';
    timerBarEl.style.backgroundColor = '#4CAF50';
    
    // Força o navegador a "pintar" o reset antes de começar a transição
    void timerBarEl.offsetWidth; 

    // Inicia a transição da barra
    timerBarEl.style.transition = `width ${ROUND_TIME}s linear, background-color 1s`;
    timerBarEl.style.width = '0%';

    timerInterval = setInterval(() => {
        timeRemaining--;
        timerEl.textContent = timeRemaining;

        // Muda a cor da barra para vermelho quando estiver acabando
        if (timeRemaining <= 5) {
            timerBarEl.style.backgroundColor = '#F44336';
        }

        if (timeRemaining === 0) {
            handleTimeOut();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    
    // Para a transição da barra onde ela estiver
    // Calcula a largura atual para manter a posição visual
    const parentWidth = timerBarEl.parentElement.offsetWidth;
    const currentWidth = timerBarEl.offsetWidth;
    // Evita divisão por zero
    if (parentWidth > 0) { 
        const percentage = (currentWidth / parentWidth) * 100;
        timerBarEl.style.transition = 'none';
        timerBarEl.style.width = `${percentage}%`;
    }
}

function handleTimeOut() {
    // Passamos 'null' pois o jogador não selecionou nada
    checkAnswer(null, null);
}


// --- LÓGICA DAS DICAS ---

function updateHintCounters() {
    eliminateHintsCountEl.textContent = eliminateHintsLeft;
    capitalHintsCountEl.textContent = capitalHintsLeft;
}

function useEliminateHint() {
    if (eliminateHintsLeft > 0 && !isAnswered) {
        
        // Encontra um botão que SEJA INCORRETO e NÃO ESTEJA eliminado
        const incorrectButton = Array.from(document.querySelectorAll('.option-btn')).find(btn => 
            btn.textContent !== correctAnswer.name.common && !btn.classList.contains('eliminated')
        );

        if (incorrectButton) {
            eliminateHintsLeft--;
            updateHintCounters();
            incorrectButton.classList.add('eliminated');
            
            // 💡 Melhoria: Desabilita o botão para esta rodada, já que foi usada.
            hintEliminateBtn.disabled = true; 
        }
        
        // Desabilita o botão de dica se acabar
        if (eliminateHintsLeft === 0) {
            hintEliminateBtn.disabled = true;
        }
    }
}

function useCapitalHint() {
    if (capitalHintsLeft > 0 && !isAnswered) {
        capitalHintsLeft--;
        updateHintCounters();
        
        showCapitalHint(true); // Gasta a dica
        
        // Desabilita o botão de dica se acabar
        if (capitalHintsLeft === 0) {
            hintCapitalBtn.disabled = true;
        }
    }
}

// Função auxiliar para mostrar a capital
function showCapitalHint(isHintUsed) {
    let hintMsg = `Dica: A capital é ${correctAnswer.capital[0]}.`;
    if (isHintUsed) {
        hintMsg += " (Dica usada!)";
    }
    
    hintTextEl.textContent = hintMsg;
    hintContainerEl.classList.remove('hidden');
    hintCapitalBtn.disabled = true; // Desabilita para esta rodada
}
