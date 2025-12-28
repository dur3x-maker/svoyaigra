// ========================================
// ДАННЫЕ ИГРЫ
// ========================================

const CATEGORIES = [
    { id: 'animals', title: 'Животные', file: 'animals.json' },
    { id: 'blog', title: 'Блогеры', file: 'blog.json' },
    { id: 'books', title: 'Литература', file: 'books.json' },
    { id: 'cars', title: 'Машинки', file: 'cars.json' },
    { id: 'eng', title: 'Английский', file: 'eng.json' },
    { id: 'logic', title: 'Логика и загадки', file: 'logic.json' },
    { id: 'math', title: 'Математика', file: 'math.json' },
    { id: 'music', title: 'Музыка', file: 'music.json' },
    { id: 'space', title: 'Космос', file: 'space.json' },
    { id: 'words', title: 'Русский язык', file: 'words.json' },
    { id: 'world', title: 'Мир вокруг', file: 'world.json' },
    { id: 'color', title: 'Цвета и формы', file: 'color.json' }
];

const STAGES = [
    { name: 'Этап 1', multipliers: [100, 200, 300, 400, 500] },
    { name: 'Этап 2', multipliers: [200, 400, 600, 800, 1000] },
    { name: 'Этап 3', multipliers: [300, 600, 900, 1200, 1500] }
];

// ========================================
// СОСТОЯНИЕ ИГРЫ
// ========================================

const gameState = {
    players: [],
    currentStage: 0,
    currentCategories: [],
    allShuffledCategories: [],
    categoryData: {},
    usedQuestions: new Set(),
    currentQuestion: null,
    currentAnsweringPlayer: null,
    blockedPlayers: [],
    attemptCount: 0
};

// ========================================
// ЭЛЕМЕНТЫ DOM
// ========================================

const elements = {
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    resultsScreen: document.getElementById('results-screen'),
    startGameBtn: document.getElementById('start-game'),
    stageTitle: document.getElementById('stage-title'),
    gameBoard: document.getElementById('game-board'),
    scoreboard: document.getElementById('scoreboard'),
    questionModal: document.getElementById('question-modal'),
    questionCategory: document.getElementById('question-category'),
    questionPoints: document.getElementById('question-points'),
    questionText: document.getElementById('question-text'),
    playerSelection: document.getElementById('player-selection'),
    playerButtons: document.getElementById('player-buttons'),
    answerButtons: document.getElementById('answer-buttons'),
    correctBtn: document.getElementById('correct-btn'),
    wrongBtn: document.getElementById('wrong-btn'),
    skipBtn: document.getElementById('skip-btn'),
    showAnswerBtn: document.getElementById('show-answer-btn'),
    hostAnswer: document.getElementById('host-answer'),
    hostAnswerText: document.getElementById('host-answer-text'),
    correctAnswer: document.getElementById('correct-answer'),
    answerText: document.getElementById('answer-text'),
    continueBtn: document.getElementById('continue-btn'),
    resultsList: document.getElementById('results-list'),
    restartBtn: document.getElementById('restart-btn')
};

// ========================================
// ИНИЦИАЛИЗАЦИЯ
// ========================================

function init() {
    elements.startGameBtn.addEventListener('click', startGame);
    elements.correctBtn.addEventListener('click', handleCorrectAnswer);
    elements.wrongBtn.addEventListener('click', handleWrongAnswer);
    elements.skipBtn.addEventListener('click', skipQuestion);
    elements.showAnswerBtn.addEventListener('click', toggleHostAnswer);
    elements.continueBtn.addEventListener('click', closeQuestionModal);
    elements.restartBtn.addEventListener('click', restartGame);
}

// ========================================
// ЗАГРУЗКА JSON
// ========================================

async function loadCategoryData(category) {
    if (gameState.categoryData[category.id]) {
        return gameState.categoryData[category.id];
    }
    
    try {
        const response = await fetch(category.file);
        if (!response.ok) {
            throw new Error(`Failed to load ${category.file}`);
        }
        const data = await response.json();
        gameState.categoryData[category.id] = data;
        return data;
    } catch (error) {
        console.error(`Error loading category ${category.id}:`, error);
        return [];
    }
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getQuestionsByLevel(questions, level) {
    const filtered = questions.filter(q => q.level === level);
    return shuffleArray(filtered);
}

// ========================================
// УПРАВЛЕНИЕ ЭКРАНАМИ
// ========================================

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    if (screenName === 'start') {
        elements.startScreen.classList.add('active');
    } else if (screenName === 'game') {
        elements.gameScreen.classList.add('active');
    } else if (screenName === 'results') {
        elements.resultsScreen.classList.add('active');
    }
}

// ========================================
// НАЧАЛО ИГРЫ
// ========================================

function startGame() {
    const playerInputs = [
        document.getElementById('player1').value.trim(),
        document.getElementById('player2').value.trim(),
        document.getElementById('player3').value.trim(),
        document.getElementById('player4').value.trim()
    ];
    
    gameState.players = playerInputs
        .filter(name => name !== '')
        .map(name => ({ name, score: 0 }));
    
    if (gameState.players.length === 0) {
        alert('Введите хотя бы одного игрока!');
        return;
    }
    
    gameState.currentStage = 0;
    gameState.usedQuestions = new Set();
    gameState.allShuffledCategories = shuffleArray(CATEGORIES);
    
    showScreen('game');
    loadStage();
}

// ========================================
// ЗАГРУЗКА ЭТАПА
// ========================================

function loadStage() {
    const stage = STAGES[gameState.currentStage];
    elements.stageTitle.textContent = stage.name;
    
    const startIndex = gameState.currentStage * 4;
    gameState.currentCategories = gameState.allShuffledCategories.slice(startIndex, startIndex + 4);
    gameState.blockedPlayers = [];
    
    renderGameBoard();
    renderScoreboard();
}

// ========================================
// ОТРИСОВКА ИГРОВОГО ПОЛЯ
// ========================================

function renderGameBoard() {
    const stage = STAGES[gameState.currentStage];
    elements.gameBoard.innerHTML = '';
    
    gameState.currentCategories.forEach((category, categoryIndex) => {
        const column = document.createElement('div');
        column.className = 'category-column';
        
        const header = document.createElement('div');
        header.className = 'category-header';
        header.textContent = category.title;
        column.appendChild(header);
        
        stage.multipliers.forEach((points, questionIndex) => {
            const cell = document.createElement('div');
            cell.className = 'question-cell';
            cell.textContent = points;
            
            const questionId = `${gameState.currentStage}-${categoryIndex}-${questionIndex}`;
            
            if (gameState.usedQuestions.has(questionId)) {
                cell.classList.add('used');
            } else {
                cell.addEventListener('click', () => openQuestion(categoryIndex, questionIndex, points));
            }
            
            column.appendChild(cell);
        });
        
        elements.gameBoard.appendChild(column);
    });
}

// ========================================
// ОТРИСОВКА ТАБЛИЦЫ ОЧКОВ
// ========================================

function renderScoreboard() {
    elements.scoreboard.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-score';
        
        if (gameState.blockedPlayers.includes(index)) {
            playerDiv.classList.add('blocked');
        }
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'player-name';
        nameDiv.textContent = player.name;
        
        const pointsDiv = document.createElement('div');
        pointsDiv.className = 'player-points';
        pointsDiv.textContent = player.score;
        
        playerDiv.appendChild(nameDiv);
        playerDiv.appendChild(pointsDiv);
        elements.scoreboard.appendChild(playerDiv);
    });
}

// ========================================
// ОТКРЫТИЕ ВОПРОСА
// ========================================

async function openQuestion(categoryIndex, questionIndex, points) {
    const category = gameState.currentCategories[categoryIndex];
    const questionId = `${gameState.currentStage}-${categoryIndex}-${questionIndex}`;
    
    const categoryData = await loadCategoryData(category);
    
    const level = gameState.currentStage + 1;
    const levelQuestions = getQuestionsByLevel(categoryData, level);
    
    if (levelQuestions.length === 0) {
        console.error(`No questions found for level ${level} in category ${category.id}`);
        return;
    }
    
    const questionData = levelQuestions[questionIndex % levelQuestions.length];
    const isCatInBag = Math.random() < 0.15;
    
    gameState.currentQuestion = {
        id: questionId,
        category: category.title,
        points,
        text: questionData.q,
        answer: questionData.a,
        img: questionData.img || null,
        isCatInBag
    };
    
    gameState.attemptCount = 0;
    gameState.blockedPlayers = [];
    gameState.currentAnsweringPlayer = null;
    
    elements.questionCategory.textContent = category.title;
    elements.questionPoints.textContent = points;
    
    if (isCatInBag) {
        elements.questionText.innerHTML = '🎁 Кот в мешке!';
    } else {
        displayQuestion(questionData);
    }
    
    elements.playerSelection.classList.remove('hidden');
    elements.answerButtons.classList.add('hidden');
    elements.correctAnswer.classList.add('hidden');
    
    renderPlayerButtons();
    
    elements.questionModal.classList.add('active');
}

function displayQuestion(questionData) {
    if (questionData.img) {
        elements.questionText.innerHTML = `
            <div>${questionData.q}</div>
            <img src="${questionData.img}" alt="Изображение вопроса">
        `;
    } else {
        elements.questionText.textContent = questionData.q;
    }
}

// ========================================
// КНОПКИ ВЫБОРА ИГРОКА
// ========================================

function renderPlayerButtons() {
    elements.playerButtons.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const btn = document.createElement('button');
        btn.className = 'player-btn';
        btn.textContent = player.name;
        btn.disabled = gameState.blockedPlayers.includes(index);
        btn.addEventListener('click', () => selectPlayer(index));
        elements.playerButtons.appendChild(btn);
    });
}

// ========================================
// ВЫБОР ИГРОКА
// ========================================

function selectPlayer(playerIndex) {
    gameState.currentAnsweringPlayer = playerIndex;
    
    if (gameState.currentQuestion.isCatInBag && gameState.attemptCount === 0) {
        const questionData = {
            q: gameState.currentQuestion.text,
            img: gameState.currentQuestion.img
        };
        displayQuestion(questionData);
    }
    
    elements.playerSelection.classList.add('hidden');
    elements.answerButtons.classList.remove('hidden');
}

// ========================================
// ПРАВИЛЬНЫЙ ОТВЕТ
// ========================================

function handleCorrectAnswer() {
    const player = gameState.players[gameState.currentAnsweringPlayer];
    player.score += gameState.currentQuestion.points;
    
    gameState.usedQuestions.add(gameState.currentQuestion.id);
    
    renderScoreboard();
    closeQuestionModal();
}

// ========================================
// НЕПРАВИЛЬНЫЙ ОТВЕТ
// ========================================

function handleWrongAnswer() {
    const player = gameState.players[gameState.currentAnsweringPlayer];
    player.score -= gameState.currentQuestion.points;
    
    gameState.blockedPlayers.push(gameState.currentAnsweringPlayer);
    gameState.attemptCount++;
    
    renderScoreboard();
    
    if (gameState.attemptCount >= 2 || gameState.blockedPlayers.length >= gameState.players.length) {
        showCorrectAnswer();
    } else {
        elements.answerButtons.classList.add('hidden');
        elements.playerSelection.classList.remove('hidden');
        renderPlayerButtons();
    }
}

// ========================================
// ПОКАЗ ПРАВИЛЬНОГО ОТВЕТА
// ========================================

function showCorrectAnswer() {
    gameState.usedQuestions.add(gameState.currentQuestion.id);
    
    elements.answerText.textContent = gameState.currentQuestion.answer;
    elements.answerButtons.classList.add('hidden');
    elements.playerSelection.classList.add('hidden');
    elements.correctAnswer.classList.remove('hidden');
}

// ========================================
// ПРОПУСТИТЬ ВОПРОС
// ========================================

function skipQuestion() {
    gameState.usedQuestions.add(gameState.currentQuestion.id);
    closeQuestionModal();
}

// ========================================
// ПОКАЗАТЬ/СКРЫТЬ ОТВЕТ ДЛЯ ВЕДУЩЕГО
// ========================================

function toggleHostAnswer() {
    if (elements.hostAnswer.classList.contains('hidden')) {
        elements.hostAnswerText.textContent = gameState.currentQuestion.answer;
        elements.hostAnswer.classList.remove('hidden');
        elements.showAnswerBtn.textContent = '🙈 Скрыть ответ';
    } else {
        elements.hostAnswer.classList.add('hidden');
        elements.showAnswerBtn.textContent = '👁️ Показать ответ';
    }
}

// ========================================
// ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
// ========================================

function closeQuestionModal() {
    elements.questionModal.classList.remove('active');
    elements.hostAnswer.classList.add('hidden');
    elements.showAnswerBtn.textContent = '👁️ Показать ответ';
    
    renderGameBoard();
    
    if (isStageComplete()) {
        if (gameState.currentStage < STAGES.length - 1) {
            gameState.currentStage++;
            setTimeout(() => loadStage(), 500);
        } else {
            setTimeout(() => showResults(), 500);
        }
    }
}

// ========================================
// ПРОВЕРКА ЗАВЕРШЕНИЯ ЭТАПА
// ========================================

function isStageComplete() {
    const stage = STAGES[gameState.currentStage];
    const totalQuestions = gameState.currentCategories.length * stage.multipliers.length;
    
    let usedInCurrentStage = 0;
    gameState.usedQuestions.forEach(id => {
        if (id.startsWith(`${gameState.currentStage}-`)) {
            usedInCurrentStage++;
        }
    });
    
    return usedInCurrentStage >= totalQuestions;
}

// ========================================
// ПОКАЗ РЕЗУЛЬТАТОВ
// ========================================

function showResults() {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    
    elements.resultsList.innerHTML = '';
    
    sortedPlayers.forEach((player, index) => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        
        if (index === 0) {
            resultDiv.classList.add('winner');
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'result-name';
        nameSpan.textContent = index === 0 ? `🏆 ${player.name}` : player.name;
        
        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'result-score';
        scoreSpan.textContent = player.score;
        
        resultDiv.appendChild(nameSpan);
        resultDiv.appendChild(scoreSpan);
        elements.resultsList.appendChild(resultDiv);
    });
    
    showScreen('results');
}

// ========================================
// ПЕРЕЗАПУСК ИГРЫ
// ========================================

function restartGame() {
    document.getElementById('player1').value = '';
    document.getElementById('player2').value = '';
    document.getElementById('player3').value = '';
    document.getElementById('player4').value = '';
    
    gameState.players = [];
    gameState.currentStage = 0;
    gameState.currentCategories = [];
    gameState.usedQuestions = new Set();
    gameState.currentQuestion = null;
    gameState.currentAnsweringPlayer = null;
    gameState.blockedPlayers = [];
    gameState.attemptCount = 0;
    
    showScreen('start');
}

// ========================================
// ЗАПУСК
// ========================================

init();
