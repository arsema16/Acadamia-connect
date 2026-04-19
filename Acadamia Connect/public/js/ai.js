// ===== ATHENA AI CHATBOT V2 =====
// Enhanced with varied responses, context-awareness, grade-appropriate content,
// subject-based suggestions, and draggable button with snap-to-edge.

const AthenaAI = {
  history: JSON.parse(localStorage.getItem('ai_history') || '[]'),
  lastResponse: null, // Track last response to avoid repetition
  sessionResponses: {}, // Track responses per category in this session

  knowledge: {
    study_tips: [
      "Use the Pomodoro technique: study for 25 minutes, then take a 5-minute break. After 4 cycles, take a longer 15-30 minute break.",
      "Active recall is more effective than re-reading. Close your notes and try to recall what you just learned.",
      "Spaced repetition helps long-term memory. Review material after 1 day, 3 days, 1 week, then 1 month.",
      "Create mind maps to connect concepts visually. This helps you see the big picture.",
      "Teach what you've learned to someone else — or even to yourself out loud. If you can explain it, you understand it.",
      "Study in a clean, well-lit environment. Remove distractions like your phone.",
      "Write summaries in your own words after each study session.",
      "Use flashcards for memorizing facts, vocabulary, and formulas.",
      "Study the hardest subjects when your energy is highest — usually in the morning.",
      "Review your notes within 24 hours of class to retain 80% more information."
    ],
    overwhelmed: [
      "Take a deep breath. It's okay to feel overwhelmed — it means you care about your work.",
      "Break your tasks into smaller, manageable steps. Focus on just one thing at a time.",
      "Write down everything that's worrying you. Getting it out of your head and onto paper helps.",
      "Take a short walk or do some light stretching. Physical movement reduces stress hormones.",
      "Talk to a trusted friend, teacher, or family member about how you're feeling.",
      "Remember: you don't have to be perfect. Progress is more important than perfection.",
      "Prioritize your tasks. What absolutely must be done today? Focus on that first.",
      "Give yourself permission to take a 10-minute break. You'll come back more focused.",
      "Remember why you started. Your goals are worth the effort.",
      "One step at a time. You've overcome challenges before, and you can do it again."
    ],
    exam_prep: [
      "Start reviewing at least 2 weeks before your exam. Don't cram the night before.",
      "Create a study schedule and stick to it. Consistency beats intensity.",
      "Practice with past exam papers to understand the format and common question types.",
      "Focus on understanding concepts, not just memorizing answers.",
      "Make a list of topics you're unsure about and tackle those first.",
      "Get enough sleep the night before your exam. Sleep consolidates memory.",
      "Eat a healthy meal before your exam. Your brain needs fuel.",
      "Arrive early to the exam room to settle your nerves.",
      "Read all questions carefully before starting. Manage your time wisely.",
      "If you get stuck on a question, move on and come back to it later."
    ],
    time_management: [
      "Use a planner or digital calendar to schedule your study sessions and deadlines.",
      "Apply the 2-minute rule: if a task takes less than 2 minutes, do it now.",
      "Identify your peak productivity hours and schedule important tasks then.",
      "Batch similar tasks together to reduce mental switching costs.",
      "Set specific, measurable goals for each study session.",
      "Eliminate time-wasters: limit social media during study hours.",
      "Use the Eisenhower Matrix: categorize tasks by urgency and importance.",
      "Review your schedule every Sunday to plan the week ahead.",
      "Learn to say no to activities that don't align with your goals.",
      "Track how you spend your time for one week — you'll be surprised where it goes."
    ],
    motivation: [
      "Every expert was once a beginner. Keep going!",
      "Your future self will thank you for the effort you put in today.",
      "Small daily improvements lead to stunning results over time.",
      "Believe in yourself. You are more capable than you think.",
      "Challenges are what make life interesting. Overcoming them is what makes life meaningful.",
      "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      "The secret of getting ahead is getting started.",
      "Don't watch the clock; do what it does. Keep going.",
      "You don't have to be great to start, but you have to start to be great.",
      "Dream big, work hard, stay focused, and surround yourself with good people."
    ],
    mathematics: [
      "Practice mathematics daily, even if just for 15 minutes. Consistency is key.",
      "Always show your work step by step. This helps you find where you went wrong.",
      "Understand the 'why' behind formulas, not just how to use them.",
      "Draw diagrams for geometry problems. Visual representation helps.",
      "Check your answers by working backwards or using a different method.",
      "Master the basics (arithmetic, fractions, algebra) before moving to advanced topics.",
      "Use real-world examples to understand abstract concepts.",
      "Don't skip steps when solving problems — each step matters.",
      "Review your mistakes carefully. Each error is a learning opportunity.",
      "Form a study group for math — explaining to others deepens your own understanding."
    ],
    science: [
      "Connect science concepts to real-world phenomena you observe every day.",
      "Draw and label diagrams for biology and chemistry topics.",
      "For physics, always identify what's given and what you need to find before solving.",
      "Understand the scientific method: observation, hypothesis, experiment, conclusion.",
      "Watch educational videos to visualize complex processes like cell division or chemical reactions.",
      "Create summary tables comparing similar concepts (e.g., mitosis vs meiosis).",
      "Practice unit conversions regularly — they appear in almost every science exam.",
      "For chemistry, memorize the periodic table gradually, not all at once.",
      "Lab work reinforces theory. Pay attention during practical sessions.",
      "Ask 'why' and 'how' questions — science is about understanding, not memorizing."
    ],
    english: [
      "Read widely — novels, newspapers, articles. Reading improves vocabulary and writing.",
      "Keep a vocabulary journal. Write new words with their meanings and example sentences.",
      "Practice writing every day, even if it's just a short paragraph.",
      "Read your writing aloud to catch awkward sentences and errors.",
      "Study grammar rules, but also learn from examples in real texts.",
      "For essays, plan your structure before writing: introduction, body paragraphs, conclusion.",
      "Use transition words to connect your ideas smoothly.",
      "Analyze literature by asking: What is the author's message? What techniques are used?",
      "Practice summarizing texts in your own words to improve comprehension.",
      "Watch English movies or shows with subtitles to improve listening and vocabulary."
    ],
    breaks: [
      "Take a 5-10 minute break every 25-30 minutes of studying.",
      "During breaks, step away from your screen. Look at something far away to rest your eyes.",
      "Light physical activity during breaks — stretching, a short walk — boosts focus.",
      "Avoid social media during short breaks — it's hard to stop and can extend your break.",
      "Drink water during your breaks. Staying hydrated improves concentration.",
      "A 20-minute nap can restore alertness if you're feeling tired.",
      "Listen to calming music or nature sounds during breaks.",
      "Do some deep breathing exercises to reduce stress.",
      "Eat a healthy snack — fruits, nuts, or yogurt — to fuel your brain.",
      "Use longer breaks (15-30 min) for a proper meal or outdoor activity."
    ],
    general: [
      "I'm Athena, your AI study coach! I'm here to help with study tips, exam prep, time management, and motivation.",
      "Great question! Let me help you with that.",
      "Remember, every challenge you face is making you stronger and smarter.",
      "You're doing great by seeking help and wanting to improve!",
      "Learning is a journey, not a destination. Enjoy the process!",
      "I'm here whenever you need guidance. What would you like to explore today?",
      "Your dedication to learning is admirable. Keep it up!",
      "Feel free to ask me about any subject or study challenge you're facing.",
      "Remember to take care of your mental and physical health — they affect your learning.",
      "You have the potential to achieve great things. I believe in you!"
    ],
    // Grade-appropriate responses
    primary: [
      "Learning is like building blocks — each new thing you learn helps you understand the next!",
      "It's great that you're studying! Even 15 minutes a day makes a big difference.",
      "Try drawing pictures to help you remember what you've learned.",
      "Ask your teacher or parents when you don't understand something — that's how we learn!",
      "Reading books, even for fun, helps you get better at school."
    ],
    secondary: [
      "At your level, understanding concepts deeply is more important than memorizing facts.",
      "Start connecting what you learn in different subjects — they often relate to each other.",
      "Practice past exam questions to prepare effectively for your exams.",
      "Build good study habits now — they'll serve you throughout your education.",
      "Consider forming study groups with classmates to discuss difficult topics."
    ]
  },

  categorize(msg) {
    const m = msg.toLowerCase();
    if (m.match(/study tip|how to study|study method|learn better|study technique/)) return 'study_tips';
    if (m.match(/overwhelm|stress|anxious|worried|can't cope|too much|pressure|nervous/)) return 'overwhelmed';
    if (m.match(/exam|test|quiz|revision|prepare|preparation|study for/)) return 'exam_prep';
    if (m.match(/time|schedule|manage|plan|organize|procrastinat|deadline/)) return 'time_management';
    if (m.match(/motivat|inspire|give up|discourage|tired|lazy|don't want/)) return 'motivation';
    if (m.match(/math|algebra|geometry|calculus|equation|number|arithmetic/)) return 'mathematics';
    if (m.match(/science|physics|chemistry|biology|lab|experiment|formula/)) return 'science';
    if (m.match(/english|writing|essay|grammar|vocabulary|reading|literature/)) return 'english';
    if (m.match(/break|rest|tired|relax|pause|stop studying/)) return 'breaks';
    return 'general';
  },

  getResponse(msg, studentContext = null) {
    const category = this.categorize(msg);
    let responses = [...this.knowledge[category]];

    // Add grade-appropriate responses for primary/secondary students
    if (studentContext?.grade) {
      const gradeNum = parseInt(studentContext.grade.replace(/\D/g, '')) || 0;
      if (gradeNum <= 6) {
        responses = [...this.knowledge.primary, ...responses];
      } else {
        responses = [...this.knowledge.secondary, ...responses];
      }
    }

    // Add subject-specific context if student has low scores
    if (studentContext?.lowScoreSubjects?.length > 0 && category !== 'general') {
      const subject = studentContext.lowScoreSubjects[0];
      responses.push(`I noticed you might need extra help with ${subject}. Try the ${subject} games in the Games section — they make learning fun! 🎮`);
    }

    // Add career interest context
    if (studentContext?.interests?.length > 0) {
      const interest = studentContext.interests[0];
      if (category === 'motivation') {
        responses.push(`As someone interested in ${interest}, remember that every study session brings you closer to your dream career!`);
      }
    }

    // Track used responses per category to avoid repetition
    if (!this.sessionResponses[category]) {
      this.sessionResponses[category] = [];
    }

    // Filter out last response and recently used ones
    let available = responses.filter(r => r !== this.lastResponse);
    const recentlyUsed = this.sessionResponses[category];
    if (available.length > 3) {
      available = available.filter(r => !recentlyUsed.includes(r));
    }
    if (available.length === 0) {
      available = responses.filter(r => r !== this.lastResponse);
      this.sessionResponses[category] = [];
    }

    // Pick a response using a combination of message hash and randomness
    const hash = msg.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const idx = (hash + this.sessionResponses[category].length) % available.length;
    const response = available[idx];

    // Track this response
    this.lastResponse = response;
    this.sessionResponses[category].push(response);
    if (this.sessionResponses[category].length > 5) {
      this.sessionResponses[category].shift();
    }

    return response;
  },

  addMessage(role, text) {
    this.history.push({ role, text, time: new Date().toISOString() });
    if (this.history.length > 50) this.history = this.history.slice(-50);
    localStorage.setItem('ai_history', JSON.stringify(this.history));
    this.renderMessage(role, text);
  },

  renderMessage(role, text) {
    const container = document.getElementById('ai-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'ai-msg ' + (role === 'user' ? 'user' : 'bot');
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  init() {
    const container = document.getElementById('ai-messages');
    if (!container) return;
    container.innerHTML = '';
    const studentName = AppState?.user?.nickname || AppState?.user?.full_name?.split(' ')[0] || 'there';
    if (this.history.length === 0) {
      this.renderMessage('bot', `Hello ${studentName}! I'm Athena, your AI study coach. I'm here to help with study tips, exam preparation, time management, and motivation. What can I help you with today?`);
    } else {
      this.history.slice(-10).forEach(m => this.renderMessage(m.role, m.text));
    }
  }
};

function toggleAI() {
  const panel = document.getElementById('ai-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    AthenaAI.init();
    document.getElementById('ai-input')?.focus();
  }
}

function sendAI() {
  const input = document.getElementById('ai-input');
  const msg = input?.value?.trim();
  if (!msg) return;
  input.value = '';
  AthenaAI.addMessage('user', msg);

  // Build student context from AppState
  const studentContext = {
    grade: AppState?.user?.grade,
    interests: (() => {
      try { return JSON.parse(AppState?.user?.interests || '[]'); } catch { return []; }
    })(),
    lowScoreSubjects: [] // Could be populated from assessment data
  };

  setTimeout(() => {
    const response = AthenaAI.getResponse(msg, studentContext);
    AthenaAI.addMessage('bot', response);
  }, 600);
}

// ===== DRAGGABLE AI BUTTON WITH SNAP-TO-EDGE =====
function initDraggableAIButton() {
  const btn = document.getElementById('ai-fab');
  if (!btn) return;

  let isDragging = false;
  let startX, startY, startLeft, startTop;
  let hasMoved = false;

  function getPos() {
    const rect = btn.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  }

  function snapToEdge() {
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Determine nearest edge
    const distLeft = cx;
    const distRight = vw - cx;
    const distTop = cy;
    const distBottom = vh - cy;
    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    let finalLeft, finalTop;
    const margin = 12;

    if (minDist === distLeft) {
      finalLeft = margin;
      finalTop = Math.max(margin, Math.min(vh - rect.height - margin, rect.top));
    } else if (minDist === distRight) {
      finalLeft = vw - rect.width - margin;
      finalTop = Math.max(margin, Math.min(vh - rect.height - margin, rect.top));
    } else if (minDist === distTop) {
      finalLeft = Math.max(margin, Math.min(vw - rect.width - margin, rect.left));
      finalTop = margin;
    } else {
      finalLeft = Math.max(margin, Math.min(vw - rect.width - margin, rect.left));
      finalTop = vh - rect.height - margin;
    }

    btn.style.transition = 'left 0.25s ease, top 0.25s ease';
    btn.style.left = finalLeft + 'px';
    btn.style.top = finalTop + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';

    setTimeout(() => { btn.style.transition = ''; }, 300);
  }

  // Mouse events
  btn.addEventListener('mousedown', (e) => {
    isDragging = true;
    hasMoved = false;
    const pos = getPos();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = pos.left;
    startTop = pos.top;
    btn.style.transition = 'none';
    btn.style.left = startLeft + 'px';
    btn.style.top = startTop + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;
    btn.style.left = (startLeft + dx) + 'px';
    btn.style.top = (startTop + dy) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    if (hasMoved) {
      snapToEdge();
    } else {
      toggleAI();
    }
  });

  // Touch events
  btn.addEventListener('touchstart', (e) => {
    isDragging = true;
    hasMoved = false;
    const touch = e.touches[0];
    const pos = getPos();
    startX = touch.clientX;
    startY = touch.clientY;
    startLeft = pos.left;
    startTop = pos.top;
    btn.style.transition = 'none';
    btn.style.left = startLeft + 'px';
    btn.style.top = startTop + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;
    btn.style.left = (startLeft + dx) + 'px';
    btn.style.top = (startTop + dy) + 'px';
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    if (hasMoved) {
      snapToEdge();
    } else {
      toggleAI();
    }
  });
}

// Initialize draggable button when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDraggableAIButton);
} else {
  initDraggableAIButton();
}
