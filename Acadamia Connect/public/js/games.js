
// ===== GAMES ENGINE =====
function launchGame(gameId) {
  switch(gameId) {
    case 'quiz':      startSubjectQuizGame(); break;
    case 'scramble':  startWordScramble(); break;
    case 'memory':    startMemoryGame(); break;
    case 'flashcard': startFlashcards(); break;
    case 'math':      startMathChallenge(); break;
    case 'colorsort': startColorSort(); break;
    case 'spelling':  startSpellingBee(); break;
    case 'trivia':    startScienceTrivia(); break;
    default: showToast('Game coming soon!', 'info');
  }
}

// ===== SUBJECT QUIZ GAME =====
function startSubjectQuizGame() {
  const questions = [
    { q:'What is the chemical symbol for water?', opts:['H2O','CO2','NaCl','O2'], a:0, subj:'Chemistry' },
    { q:'What is 15 × 8?', opts:['110','120','125','130'], a:1, subj:'Mathematics' },
    { q:'Who wrote Romeo and Juliet?', opts:['Dickens','Shakespeare','Austen','Hemingway'], a:1, subj:'English' },
    { q:'What planet is closest to the Sun?', opts:['Venus','Earth','Mercury','Mars'], a:2, subj:'Science' },
    { q:'What is the capital of Ethiopia?', opts:['Nairobi','Addis Ababa','Cairo','Lagos'], a:1, subj:'Geography' },
    { q:'What is the square root of 144?', opts:['11','12','13','14'], a:1, subj:'Mathematics' },
    { q:'How many bones are in the human body?', opts:['196','206','216','226'], a:1, subj:'Biology' },
    { q:'What gas do plants absorb from the air?', opts:['Oxygen','Nitrogen','Carbon Dioxide','Hydrogen'], a:2, subj:'Biology' },
    { q:'What is 2 to the power of 10?', opts:['512','1024','2048','256'], a:1, subj:'Mathematics' },
    { q:'What is the speed of light (approx)?', opts:['300,000 km/s','150,000 km/s','450,000 km/s','200,000 km/s'], a:0, subj:'Physics' }
  ];
  runQuizGame(questions, 'Subject Quiz', 'quiz');
}

function startScienceTrivia() {
  const questions = [
    { q:'What is the powerhouse of the cell?', opts:['Nucleus','Mitochondria','Ribosome','Golgi body'], a:1, subj:'Biology' },
    { q:'What force keeps planets in orbit?', opts:['Magnetism','Friction','Gravity','Electricity'], a:2, subj:'Physics' },
    { q:'What is the atomic number of Carbon?', opts:['4','6','8','12'], a:1, subj:'Chemistry' },
    { q:'What is the largest organ in the human body?', opts:['Heart','Liver','Skin','Brain'], a:2, subj:'Biology' },
    { q:'What type of energy does the Sun produce?', opts:['Chemical','Nuclear','Mechanical','Electrical'], a:1, subj:'Physics' },
    { q:'What is H2SO4?', opts:['Hydrochloric acid','Sulfuric acid','Nitric acid','Acetic acid'], a:1, subj:'Chemistry' },
    { q:'How many chromosomes do humans have?', opts:['23','44','46','48'], a:2, subj:'Biology' },
    { q:'What is Newton\'s first law about?', opts:['Gravity','Inertia','Action-Reaction','Acceleration'], a:1, subj:'Physics' }
  ];
  runQuizGame(questions, 'Science Trivia', 'trivia');
}

function runQuizGame(questions, title, gameId) {
  let current = 0, score = 0, timeLeft = 30;
  let timer;

  function render() {
    const q = questions[current];
    document.getElementById('modal-content').innerHTML = `
<div class="game-container" style="max-width:100%;">
  <div class="game-header">
    <span style="font-weight:700;color:var(--accent);">${title}</span>
    <span class="game-score">Score: ${score}/${questions.length}</span>
    <span class="game-timer" id="g-timer" style="color:${timeLeft<=10?'#EF5350':'var(--text-light)'};">${timeLeft}s</span>
  </div>
  <div style="font-size:0.78rem;color:rgba(245,245,245,0.4);margin-bottom:8px;">Q${current+1}/${questions.length} · ${q.subj}</div>
  <div class="quiz-game-question">${q.q}</div>
  <div class="quiz-game-options">
    ${q.opts.map((o,i) => `<button class="quiz-option" id="opt-${i}" onclick="pickAnswer(${i},${q.a})">${o}</button>`).join('')}
  </div>
  <div class="progress-bar" style="margin-top:16px;">
    <div class="progress-fill" style="width:${(current/questions.length)*100}%"></div>
  </div>
</div>`;

    clearInterval(timer);
    timeLeft = 30;
    timer = setInterval(() => {
      timeLeft--;
      const el = document.getElementById('g-timer');
      if (el) { el.textContent = timeLeft + 's'; el.style.color = timeLeft <= 10 ? '#EF5350' : 'var(--text-light)'; }
      if (timeLeft <= 0) { clearInterval(timer); pickAnswer(-1, q.a); }
    }, 1000);
  }

  window.pickAnswer = function(chosen, correct) {
    clearInterval(timer);
    document.querySelectorAll('.quiz-option').forEach((b,i) => {
      b.disabled = true;
      if (i === correct) b.classList.add('correct');
      else if (i === chosen) b.classList.add('wrong');
    });
    if (chosen === correct) score++;
    setTimeout(() => {
      current++;
      if (current < questions.length) render();
      else showGameResult(score, questions.length, title);
    }, 900);
  };

  openModal('');
  render();
}

async function showGameResult(score, total, title) {
  const pct = Math.round((score/total)*100);
  const xp = Math.round(pct / 2);
  if (AppState.user) {
    await API.post('/api/student/study-session', { subject: title, duration: 5 });
  }
  document.getElementById('modal-content').innerHTML = `
<div class="game-result">
  <div style="font-size:3rem;margin-bottom:8px;">${pct===100?'🏆':pct>=70?'⭐':'📚'}</div>
  <div class="game-result-score">${score}/${total}</div>
  <div class="game-result-msg">${pct===100?'Perfect! Outstanding!':pct>=70?'Great job! Keep it up!':'Good effort! Keep practising!'}</div>
  <div class="game-xp-earned">+${xp} XP earned</div>
  <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">
    <button class="btn btn-secondary" onclick="closeModal()">Done</button>
    <button class="btn btn-primary" onclick="launchGame('${title.toLowerCase().replace(/\s/g,'_')}')">Play Again</button>
  </div>
</div>`;
}

// ===== WORD SCRAMBLE =====
function startWordScramble() {
  const words = [
    { word:'PHOTOSYNTHESIS', hint:'Process plants use to make food from sunlight' },
    { word:'DEMOCRACY', hint:'A system of government by the people' },
    { word:'HYPOTHESIS', hint:'A proposed explanation for an observation' },
    { word:'ALGORITHM', hint:'A step-by-step procedure for solving a problem' },
    { word:'METAMORPHOSIS', hint:'A transformation process in biology' },
    { word:'CIVILIZATION', hint:'An advanced human society with culture and laws' },
    { word:'ELECTRICITY', hint:'Flow of electric charge through a conductor' },
    { word:'ATMOSPHERE', hint:'The layer of gases surrounding Earth' },
    { word:'CHROMOSOME', hint:'Structure in cells that carries genetic information' },
    { word:'RENAISSANCE', hint:'A period of cultural rebirth in European history' }
  ];

  let idx = 0, score = 0, timeLeft = 60;
  let timer;

  function scramble(word) {
    return word.split('').sort(() => Math.random() - 0.5).join('');
  }

  function render() {
    const item = words[idx];
    const scrambled = scramble(item.word);
    document.getElementById('modal-content').innerHTML = `
<div class="game-container" style="max-width:100%;">
  <div class="game-header">
    <span style="font-weight:700;color:var(--accent);">Word Scramble</span>
    <span class="game-score">Score: ${score}</span>
    <span class="game-timer" id="ws-timer">${timeLeft}s</span>
  </div>
  <div style="font-size:0.78rem;color:rgba(245,245,245,0.4);margin-bottom:8px;">Word ${idx+1}/${words.length}</div>
  <div class="scramble-word">${scrambled}</div>
  <div class="scramble-hint">${item.hint}</div>
  <input class="scramble-input" id="ws-input" type="text" placeholder="Type your answer..." autocomplete="off"
    onkeydown="if(event.key==='Enter')checkScramble('${item.word}')">
  <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">
    <button class="btn btn-primary" onclick="checkScramble('${item.word}')">Submit</button>
    <button class="btn btn-secondary" onclick="skipScramble()">Skip</button>
  </div>
  <div class="progress-bar" style="margin-top:16px;">
    <div class="progress-fill" style="width:${(idx/words.length)*100}%"></div>
  </div>
</div>`;
    document.getElementById('ws-input').focus();
    clearInterval(timer);
    timeLeft = 60;
    timer = setInterval(() => {
      timeLeft--;
      const el = document.getElementById('ws-timer');
      if (el) el.textContent = timeLeft + 's';
      if (timeLeft <= 0) { clearInterval(timer); skipScramble(); }
    }, 1000);
  }

  window.checkScramble = function(correct) {
    const val = document.getElementById('ws-input')?.value.trim().toUpperCase();
    if (val === correct) {
      score++;
      showToast('Correct! +1 point', 'success');
      nextScramble();
    } else {
      showToast(`Wrong! The answer was: ${correct}`, 'error');
      nextScramble();
    }
  };

  window.skipScramble = function() {
    const item = words[idx];
    showToast(`Skipped! Answer: ${item.word}`, 'info');
    nextScramble();
  };

  function nextScramble() {
    clearInterval(timer);
    idx++;
    if (idx < words.length) render();
    else showGameResult(score, words.length, 'Word Scramble');
  }

  openModal('');
  render();
}

// ===== MEMORY MATCH =====
function startMemoryGame() {
  const pairs = [
    ['🔬','🔬'],['⚗️','⚗️'],['🧬','🧬'],['🌍','🌍'],
    ['📐','📐'],['🔭','🔭'],['💡','💡'],['🧲','🧲']
  ];
  const cards = [...pairs].flat().sort(() => Math.random() - 0.5);
  let flipped = [], matched = [], moves = 0, canFlip = true;

  function render() {
    document.getElementById('modal-content').innerHTML = `
<div class="game-container" style="max-width:100%;">
  <div class="game-header">
    <span style="font-weight:700;color:var(--accent);">Memory Match</span>
    <span class="game-score">Moves: ${moves} | Matched: ${matched.length/2}/${pairs.length}</span>
  </div>
  <div class="memory-grid" id="memory-grid">
    ${cards.map((c,i) => `
    <div class="memory-card ${matched.includes(i)?'flipped':''}" id="mc-${i}" onclick="flipCard(${i})">
      <div class="memory-card-inner">
        <div class="memory-card-front">?</div>
        <div class="memory-card-back ${matched.includes(i)?'matched':''}">${c}</div>
      </div>
    </div>`).join('')}
  </div>
</div>`;
  }

  window.flipCard = function(idx) {
    if (!canFlip || flipped.includes(idx) || matched.includes(idx)) return;
    flipped.push(idx);
    document.getElementById('mc-'+idx)?.classList.add('flipped');
    if (flipped.length === 2) {
      canFlip = false; moves++;
      const [a, b] = flipped;
      if (cards[a] === cards[b]) {
        matched.push(a, b);
        flipped = []; canFlip = true;
        if (matched.length === cards.length) {
          setTimeout(() => showGameResult(pairs.length, pairs.length, 'Memory Match'), 500);
        } else render();
      } else {
        setTimeout(() => {
          document.getElementById('mc-'+a)?.classList.remove('flipped');
          document.getElementById('mc-'+b)?.classList.remove('flipped');
          flipped = []; canFlip = true;
          render();
        }, 1000);
      }
    }
  };

  openModal('');
  render();
}

// ===== FLASHCARDS =====
function startFlashcards() {
  const cards = [
    { front:'Photosynthesis', back:'The process by which plants convert sunlight, water, and CO2 into glucose and oxygen.' },
    { front:'Mitosis', back:'Cell division that produces two identical daughter cells with the same number of chromosomes.' },
    { front:'Newton\'s 2nd Law', back:'Force = Mass × Acceleration (F = ma)' },
    { front:'Pythagorean Theorem', back:'In a right triangle: a² + b² = c² where c is the hypotenuse.' },
    { front:'Democracy', back:'A system of government where citizens vote to elect their representatives.' },
    { front:'Osmosis', back:'The movement of water molecules through a semi-permeable membrane from low to high solute concentration.' },
    { front:'Atom', back:'The smallest unit of an element that retains the chemical properties of that element.' },
    { front:'Metaphor', back:'A figure of speech that describes something by saying it IS something else (e.g., "Life is a journey").' }
  ];
  let idx = 0;

  function render() {
    document.getElementById('modal-content').innerHTML = `
<div class="game-container" style="max-width:100%;">
  <div class="game-header">
    <span style="font-weight:700;color:var(--accent);">Flashcards</span>
    <span class="game-score">${idx+1} / ${cards.length}</span>
  </div>
  <p style="text-align:center;color:rgba(245,245,245,0.5);font-size:0.82rem;margin-bottom:12px;">Click the card to reveal the answer</p>
  <div class="flashcard-wrap">
    <div class="flashcard" id="flashcard" onclick="this.classList.toggle('flipped')">
      <div class="flashcard-front"><div class="flashcard-text">${cards[idx].front}</div></div>
      <div class="flashcard-back"><div class="flashcard-text">${cards[idx].back}</div></div>
    </div>
  </div>
  <div class="flashcard-nav">
    <button class="btn btn-secondary btn-sm" onclick="prevCard()" ${idx===0?'disabled':''}>← Prev</button>
    <span class="flashcard-counter">${idx+1}/${cards.length}</span>
    <button class="btn btn-primary btn-sm" onclick="nextCard()" ${idx===cards.length-1?'disabled':''}>Next →</button>
  </div>
  ${idx===cards.length-1 ? `<div style="text-align:center;margin-top:16px;"><button class="btn btn-primary" onclick="showGameResult(${cards.length},${cards.length},'Flashcards')">Finish</button></div>` : ''}
</div>`;
  }

  window.nextCard = function() { if (idx < cards.length-1) { idx++; render(); } };
  window.prevCard = function() { if (idx > 0) { idx--; render(); } };

  openModal('');
  render();
}

// ===== MATH CHALLENGE =====
function startMathChallenge() {
  let score = 0, total = 10, current = 0, timeLeft = 15;
  let timer;

  function genProblem() {
    const ops = ['+','-','×','÷'];
    const op = ops[Math.floor(Math.random()*ops.length)];
    let a, b, answer;
    if (op==='+') { a=Math.floor(Math.random()*50)+1; b=Math.floor(Math.random()*50)+1; answer=a+b; }
    else if (op==='-') { a=Math.floor(Math.random()*50)+20; b=Math.floor(Math.random()*20)+1; answer=a-b; }
    else if (op==='×') { a=Math.floor(Math.random()*12)+1; b=Math.floor(Math.random()*12)+1; answer=a*b; }
    else { b=Math.floor(Math.random()*10)+1; answer=Math.floor(Math.random()*10)+1; a=b*answer; }
    return { problem:`${a} ${op} ${b} = ?`, answer };
  }

  let prob = genProblem();

  function render() {
    prob = genProblem();
    document.getElementById('modal-content').innerHTML = `
<div class="game-container" style="max-width:100%;">
  <div class="game-header">
    <span style="font-weight:700;color:var(--accent);">Math Challenge</span>
    <span class="game-score">Score: ${score}/${total}</span>
    <span class="game-timer" id="math-timer" style="color:${timeLeft<=5?'#EF5350':'var(--text-light)'};">${timeLeft}s</span>
  </div>
  <div style="text-align:center;font-size:0.78rem;color:rgba(245,245,245,0.4);margin-bottom:8px;">Problem ${current+1}/${total}</div>
  <div class="math-problem">${prob.problem}</div>
  <input class="math-input" id="math-input" type="number" placeholder="?" autofocus
    onkeydown="if(event.key==='Enter')checkMath(${prob.answer})">
  <div style="text-align:center;margin-top:16px;">
    <button class="btn btn-primary" onclick="checkMath(${prob.answer})">Submit</button>
  </div>
  <div class="progress-bar" style="margin-top:16px;">
    <div class="progress-fill" style="width:${(current/total)*100}%"></div>
  </div>
</div>`;
    document.getElementById('math-input')?.focus();
    clearInterval(timer);
    timeLeft = 15;
    timer = setInterval(() => {
      timeLeft--;
      const el = document.getElementById('math-timer');
      if (el) { el.textContent = timeLeft+'s'; el.style.color = timeLeft<=5?'#EF5350':'var(--text-light)'; }
      if (timeLeft<=0) { clearInterval(timer); checkMath(prob.answer, true); }
    }, 1000);
  }

  window.checkMath = function(correct, timeout) {
    clearInterval(timer);
    const val = parseInt(document.getElementById('math-input')?.value);
    if (!timeout && val === correct) { score++; showToast('Correct! +1', 'success'); }
    else if (!timeout) showToast(`Wrong! Answer: ${correct}`, 'error');
    else showToast(`Time up! Answer: ${correct}`, 'warning');
    current++;
    if (current < total) render();
    else showGameResult(score, total, 'Math Challenge');
  };

  openModal('');
  render();
}

// ===== SPELLING BEE =====
function startSpellingBee() {
  const words = [
    { word:'necessary', hint:'Something that must be done or is required' },
    { word:'beautiful', hint:'Pleasing to the senses or mind' },
    { word:'environment', hint:'The natural world around us' },
    { word:'government', hint:'The system that rules a country' },
    { word:'knowledge', hint:'Facts and information acquired through experience' },
    { word:'achievement', hint:'A thing done successfully with effort' },
    { word:'responsibility', hint:'The state of being accountable for something' },
    { word:'communication', hint:'The exchange of information between people' }
  ];
  let idx = 0, score = 0;

  function render() {
    const item = words[idx];
    document.getElementById('modal-content').innerHTML = `
<div class="game-container" style="max-width:100%;">
  <div class="game-header">
    <span style="font-weight:700;color:var(--accent);">Spelling Bee 🐝</span>
    <span class="game-score">Score: ${score}/${words.length}</span>
  </div>
  <div style="text-align:center;padding:20px 0;">
    <div style="font-size:1.1rem;color:rgba(245,245,245,0.7);margin-bottom:8px;">Hint:</div>
    <div style="font-size:1.2rem;color:var(--accent);font-style:italic;margin-bottom:20px;">"${item.hint}"</div>
    <button class="btn btn-secondary btn-sm" onclick="speakWord('${item.word}')">🔊 Hear the word</button>
  </div>
  <input class="scramble-input" id="spell-input" type="text" placeholder="Type the spelling..."
    onkeydown="if(event.key==='Enter')checkSpelling('${item.word}')">
  <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">
    <button class="btn btn-primary" onclick="checkSpelling('${item.word}')">Submit</button>
    <button class="btn btn-secondary" onclick="skipSpelling('${item.word}')">Skip</button>
  </div>
  <div class="progress-bar" style="margin-top:16px;">
    <div class="progress-fill" style="width:${(idx/words.length)*100}%"></div>
  </div>
</div>`;
    document.getElementById('spell-input')?.focus();
  }

  window.speakWord = function(word) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(word);
      u.rate = 0.8;
      speechSynthesis.speak(u);
    } else showToast('Speech not supported in this browser', 'info');
  };

  window.checkSpelling = function(correct) {
    const val = document.getElementById('spell-input')?.value.trim().toLowerCase();
    if (val === correct) { score++; showToast('Correct! +1', 'success'); }
    else showToast(`Wrong! Correct: "${correct}"`, 'error');
    idx++;
    if (idx < words.length) render();
    else showGameResult(score, words.length, 'Spelling Bee');
  };

  window.skipSpelling = function(correct) {
    showToast(`Skipped! Answer: "${correct}"`, 'info');
    idx++;
    if (idx < words.length) render();
    else showGameResult(score, words.length, 'Spelling Bee');
  };

  openModal('');
  render();
}

// ===== COLOR SORT =====
function startColorSort() {
  openModal(`
<div class="game-container" style="max-width:100%;">
  <div class="game-header">
    <span style="font-weight:700;color:var(--accent);">Color Sort</span>
    <span style="font-size:0.82rem;color:rgba(245,245,245,0.5);">Sort colors into matching tubes</span>
  </div>
  <div style="text-align:center;padding:20px;">
    <div style="font-size:3rem;margin-bottom:16px;">🎨</div>
    <p style="color:rgba(245,245,245,0.7);margin-bottom:20px;">Sort the colored segments so each tube contains only one color.</p>
    <div class="color-sort-wrap" id="color-tubes"></div>
    <div style="margin-top:20px;">
      <button class="btn btn-primary" onclick="initColorSort()">Start Game</button>
    </div>
  </div>
</div>`);
  initColorSort();
}

function initColorSort() {
  const colors = ['#E53935','#1E88E5','#43A047','#FB8C00'];
  let tubes = [
    [colors[0],colors[1],colors[2],colors[3]],
    [colors[1],colors[0],colors[3],colors[2]],
    [colors[2],colors[3],colors[0],colors[1]],
    [colors[3],colors[2],colors[1],colors[0]],
    [], []
  ].map(t => [...t].sort(() => Math.random()-0.5));

  let selected = null;

  function render() {
    const wrap = document.getElementById('color-tubes');
    if (!wrap) return;
    wrap.innerHTML = tubes.map((tube, ti) => `
<div class="color-tube ${selected===ti?'selected':''}" onclick="selectTube(${ti})">
  ${tube.map(c => `<div class="color-segment" style="background:${c};"></div>`).join('')}
</div>`).join('');

    const done = tubes.every(tube => tube.length===0 || (tube.length===4 && tube.every(c=>c===tube[0])));
    if (done) setTimeout(() => showGameResult(4, 4, 'Color Sort'), 500);
  }

  window.selectTube = function(ti) {
    if (selected === null) {
      if (tubes[ti].length > 0) { selected = ti; render(); }
    } else {
      if (ti !== selected) {
        const from = tubes[selected];
        const to = tubes[ti];
        if (to.length < 4 && from.length > 0) {
          const color = from[from.length-1];
          if (to.length === 0 || to[to.length-1] === color) {
            to.push(from.pop());
          }
        }
      }
      selected = null;
      render();
    }
  };

  render();
}
