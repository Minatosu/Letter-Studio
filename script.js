/**
 * AI Letter Studio — script.js
 * =====================================================
 * Handles:
 *  1. Theme toggle (dark ↔ light) with localStorage
 *  2. Live paper preview (sender, recipient, date)
 *  3. Gemini API call to generate the letter body
 *  4. Rendering the letter onto the Virtual Paper
 *  5. Copy-to-clipboard functionality
 * =====================================================
 */

'use strict';

/* ─────────────────────────────────────────────────────
   CONFIGURATION
   ─────────────────────────────────────────────────────
   ⚠  Replace 'YOUR_KEY_HERE' with your Gemini API key.
   Do NOT expose this key in a public repository.
   ───────────────────────────────────────────────────── */
const GEMINI_API_KEY = 'AIzaSyBN_XpMtkSvWwXxRlQ2DcFzfE9qvVsaLw0';

/* Gemini model endpoint — using gemini-2.5-flash-lite */
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;


/* ─────────────────────────────────────────────────────
   DOM REFERENCES
   ───────────────────────────────────────────────────── */
const themeToggleBtn   = document.getElementById('themeToggle');
const generateBtn      = document.getElementById('generateBtn');
const copyBtn          = document.getElementById('copyBtn');
const statusMessage    = document.getElementById('statusMessage');
const loadingOverlay   = document.getElementById('loadingOverlay');

// Form inputs
const senderInput         = document.getElementById('senderName');
const recipientInput      = document.getElementById('recipientName');
const recipientTitleInput = document.getElementById('recipientTitle');
const recipientAddrInput  = document.getElementById('recipientAddress');
const schoolNameInput     = document.getElementById('schoolName');
const studentIdInput      = document.getElementById('studentId');
const toneSelect          = document.getElementById('tone');
const letterDateInput     = document.getElementById('letterDate');
const contextTextarea     = document.getElementById('context');

// Paper elements
const paperSender            = document.getElementById('paperSender');
const paperSenderId          = document.getElementById('paperSenderId');
const paperSenderOrg         = document.getElementById('paperSenderOrg');
const paperDate              = document.getElementById('paperDate');
const paperRecipient         = document.getElementById('paperRecipient');
const paperRecipientTitle    = document.getElementById('paperRecipientTitle');
const paperRecipientAddress  = document.getElementById('paperRecipientAddress');
const paperSubjectLine       = document.getElementById('paperSubjectLine');
const paperSalutation        = document.getElementById('paperSalutation');
const paperBody              = document.getElementById('paperBody');
const paperClosing           = document.getElementById('paperClosing');
const paperSignature         = document.getElementById('paperSignature');


/* ─────────────────────────────────────────────────────
   1. THEME MANAGEMENT
   ───────────────────────────────────────────────────── */

/**
 * Applies a theme ('dark' or 'light') to the <html> element
 * and persists the preference to localStorage.
 * @param {string} theme - 'dark' or 'light'
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('letterStudio_theme', theme);
}

/**
 * Reads saved theme from localStorage; falls back to 'dark'.
 */
function loadTheme() {
  const saved = localStorage.getItem('letterStudio_theme');
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

/**
 * Toggles between dark and light themes.
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Wire up the toggle button
themeToggleBtn.addEventListener('click', toggleTheme);

// Apply persisted theme on page load
loadTheme();


/* ─────────────────────────────────────────────────────
   2. LIVE PAPER PREVIEW
   ───────────────────────────────────────────────────── */

/**
 * Sets the date on the paper based on user input or current date.
 */
function setLetterDate() {
  const userDate = letterDateInput.value;
  
  if (userDate) {
    // User provided a date - format it
    const date = new Date(userDate + 'T00:00:00');
    const formatted = date.toLocaleDateString('en-US', {
      year:  'numeric',
      month: 'long',
      day:   'numeric',
    });
    paperDate.textContent = formatted;
  } else {
    // Use current date
    const now = new Date();
    const formatted = now.toLocaleDateString('en-US', {
      year:  'numeric',
      month: 'long',
      day:   'numeric',
    });
    paperDate.textContent = formatted;
  }
}

/**
 * Updates the sender display on the paper.
 * Falls back to placeholder text if the input is empty.
 */
function updateSender() {
  const name = senderInput.value.trim();
  const display = name || 'Your Name';
  paperSender.textContent    = display;
  paperSignature.textContent = display;
}

/**
 * Updates sender organization and ID on the paper.
 */
function updateSenderDetails() {
  const school = schoolNameInput.value.trim();
  const id = studentIdInput.value.trim();
  
  paperSenderOrg.textContent = school || '';
  paperSenderId.textContent = id ? `ID: ${id}` : '';
}

/**
 * Updates the recipient display on the paper (title, name, address).
 * Generates appropriate salutation based on tone and recipient details.
 */
function updateRecipient() {
  const name = recipientInput.value.trim();
  const title = recipientTitleInput.value.trim();
  const address = recipientAddrInput.value.trim();
  const tone = toneSelect.value;
  
  const displayName = name || 'Recipient Name';
  paperRecipient.textContent = displayName;
  paperRecipientTitle.textContent = title ? `${title}` : '';
  paperRecipientAddress.textContent = address || '';
  
  // Generate appropriate salutation
  paperSalutation.textContent = generateSalutation(displayName, title, tone);
}

/**
 * Generates a professional salutation based on recipient details and tone.
 * @param {string} recipientName
 * @param {string} recipientTitle
 * @param {string} tone
 * @returns {string}
 */
function generateSalutation(recipientName, recipientTitle, tone) {
  // For formal tones, use "Respected" with title or full name
  if (tone === 'formal') {
    if (recipientTitle) {
      return `Respected ${recipientTitle},`;
    }
    return `Respected ${recipientName},`;
  }
  
  // For casual and warm tones, use first name if available or full name
  if (tone === 'casual' || tone === 'warm') {
    const firstName = recipientName.split(' ')[0];
    return `Hi ${firstName},`;
  }
  
  // For confident and sincere, use standard professional greeting
  if (tone === 'confident' || tone === 'sincere') {
    if (recipientTitle) {
      return `Dear ${recipientTitle},`;
    }
    return `Dear ${recipientName},`;
  }
  
  return `Dear ${recipientName},`;
}

// Attach live-update listeners
senderInput.addEventListener('input', updateSender);
recipientInput.addEventListener('input', updateRecipient);
recipientTitleInput.addEventListener('input', updateRecipient);
recipientAddrInput.addEventListener('input', updateRecipient);
schoolNameInput.addEventListener('input', updateSenderDetails);
studentIdInput.addEventListener('input', updateSenderDetails);
toneSelect.addEventListener('change', updateRecipient);
letterDateInput.addEventListener('change', setLetterDate);

// Initialise paper with current date
setLetterDate();


/* ─────────────────────────────────────────────────────
   3. HELPER UTILITIES
   ───────────────────────────────────────────────────── */

/**
 * Shows a status/error message below the generate button.
 * @param {string} text    - The message to display.
 * @param {'error'|'success'|''} type - CSS modifier class.
 */
function showStatus(text, type = '') {
  statusMessage.textContent = text;
  statusMessage.className   = 'status-message' + (type ? ` is-${type}` : '');
}

/**
 * Sets the loading state of the UI.
 * @param {boolean} loading
 */
function setLoading(loading) {
  generateBtn.disabled = loading;
  loadingOverlay.classList.toggle('is-visible', loading);

  if (loading) {
    generateBtn.querySelector('.btn-generate__text').textContent = 'Generating…';
  } else {
    generateBtn.querySelector('.btn-generate__text').textContent = 'Generate Letter';
  }
}

/**
 * Converts a plain-text string (with \n line breaks) into
 * HTML paragraphs so the paper renders them correctly.
 * Empty lines create new paragraph breaks.
 * @param {string} text
 * @returns {string} HTML string
 */
function textToHtmlParagraphs(text) {
  // Split on one or more blank lines to separate paragraphs
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map(para =>
      // Within a paragraph, single \n becomes a <br>
      `<p>${para.replace(/\n/g, '<br>')}</p>`
    );
  return paragraphs.join('\n');
}

/**
 * Builds a plain-text version of the full letter for clipboard copy.
 * @returns {string}
 */
function buildPlainTextLetter() {
  const sender       = paperSender.textContent;
  const date         = paperDate.textContent;
  const recipient    = paperRecipient.textContent;
  const recipientAddr = paperRecipientAddress.textContent;
  const subject      = paperSubjectLine.textContent;
  const salutation   = paperSalutation.textContent;
  const bodyText     = paperBody.innerText;   // innerText respects <br> → newlines
  const closing      = paperClosing.textContent;
  const signature    = paperSignature.textContent;

  const parts = [sender, date, ''];
  
  // Add recipient block
  if (recipient) {
    parts.push(recipient);
  }
  if (recipientAddr) {
    parts.push(recipientAddr);
  }
  parts.push('');
  
  // Add subject if it exists
  if (subject) {
    parts.push(`Subject: ${subject}`);
    parts.push('');
  }
  
  // Add salutation and body
  parts.push(salutation, '', bodyText, '', closing, signature);

  return parts.join('\n');
}


/* ─────────────────────────────────────────────────────
   4. GEMINI API CALL
   ───────────────────────────────────────────────────── */

/**
 * Calls the Gemini API to generate a letter body.
 * Returns the generated text string.
 * Throws an Error with a descriptive message on failure.
 *
 * @param {string} sender      - Sender's name
 * @param {string} schoolName  - Sender's school/organization
 * @param {string} studentId   - Sender's student/employee ID
 * @param {string} recipient   - Recipient's name
 * @param {string} recipientTitle - Recipient's title/designation
 * @param {string} recipientAddr - Recipient's address
 * @param {string} tone        - Selected tone value
 * @param {string} context     - User's context / key points
 * @returns {Promise<string>}
 */
async function callGemini(sender, schoolName, studentId, recipient, recipientTitle, recipientAddr, tone, context) {
  // Create a tone description for better AI guidance
  const toneDescriptions = {
    formal: 'Formal and professional, maintaining a respectful and proper tone',
    casual: 'Casual and relaxed, conversational and friendly',
    warm: 'Warm and affectionate, showing genuine care and personal touch',
    confident: 'Confident and assertive, conveying strength and conviction',
    sincere: 'Sincere and heartfelt, expressing genuine emotions and intentions'
  };
  
  const toneDesc = toneDescriptions[tone] || 'Professional';
  
  // For formal letters, request both subject line and body
  let prompt;
  if (tone === 'formal') {
    prompt = `
You are an expert formal letter writer. Write a professional formal letter based on the details below.

OUTPUT FORMAT:
First, output the subject line prefixed with "SUBJECT: "
Then output the body paragraphs.

INSTRUCTIONS:
- Generate a concise, professional subject line (2-6 words) that summarizes the letter's purpose. Output it as: SUBJECT: [your subject here]
- Write the body paragraphs ONLY (no salutation, no closing, no signature — those are handled separately).
- Match the formal tone exactly.
- Be eloquent, clear, and appropriately detailed.
- Use proper paragraph breaks (blank line between paragraphs).
- Do not include headings or any other metadata beyond the subject line.
- Output plain text only — no markdown, no bullet points.

LETTER DETAILS:
- From:      ${sender || 'The Sender'}${schoolName ? ` (${schoolName})` : ''}${studentId ? ` [ID: ${studentId}]` : ''}
- To:        ${recipientTitle ? recipientTitle + ', ' : ''}${recipient || 'The Recipient'}${recipientAddr ? `\n  Address: ${recipientAddr}` : ''}
- Tone:      ${toneDesc}
- Purpose / Key Points: ${context}

Write the letter now:
`.trim();
  } else {
    prompt = `
You are an expert letter writer. Write a professional letter based on the details below.

INSTRUCTIONS:
- Write ONLY the body paragraphs of the letter (no salutation, no closing, no signature — those are handled separately).
- Match the specified tone exactly: ${toneDesc}
- Be eloquent, clear, and appropriately detailed.
- Use proper paragraph breaks (blank line between paragraphs).
- Do not include subject lines, headings, or any metadata.
- Output plain text only — no markdown, no bullet points.

LETTER DETAILS:
- From:      ${sender || 'The Sender'}${schoolName ? ` (${schoolName})` : ''}${studentId ? ` [ID: ${studentId}]` : ''}
- To:        ${recipientTitle ? recipientTitle + ', ' : ''}${recipient || 'The Recipient'}${recipientAddr ? `\n  Address: ${recipientAddr}` : ''}
- Tone:      ${toneDesc}
- Context / Key Points: ${context}

Write the letter body now:
`.trim();
  }

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    // Generation configuration for quality output
    generationConfig: {
      temperature:     0.8,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(GEMINI_API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(requestBody),
  });

  if (!response.ok) {
    // Attempt to parse error detail from Gemini's JSON response
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errorDetail = errData?.error?.message || errorDetail;
    } catch (_) { /* ignore JSON parse failure */ }
    throw new Error(errorDetail);
  }

  const data = await response.json();

  // Navigate Gemini's response structure
  let generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    throw new Error('No content returned. Please try again.');
  }

  // For formal letters, extract subject line if present
  let subject = '';
  if (tone === 'formal') {
    const subjectMatch = generatedText.match(/SUBJECT:\s*(.+?)(?:\n|$)/);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      // Remove subject line from body text
      generatedText = generatedText.replace(/SUBJECT:\s*.+?\n+/, '').trim();
    }
  }

  return { body: generatedText, subject: subject };
}


/* ─────────────────────────────────────────────────────
   5. GENERATE BUTTON HANDLER
   ───────────────────────────────────────────────────── */

generateBtn.addEventListener('click', async () => {
  // --- Validate required fields ---
  const sender    = senderInput.value.trim();
  const recipient = recipientInput.value.trim();
  const tone      = toneSelect.value;
  const context   = contextTextarea.value.trim();
  
  // Additional optional fields
  const schoolName = schoolNameInput.value.trim();
  const studentId = studentIdInput.value.trim();
  const recipientTitle = recipientTitleInput.value.trim();
  const recipientAddr = recipientAddrInput.value.trim();

  if (!sender) {
    showStatus('Please enter your name as the sender.', 'error');
    senderInput.focus();
    return;
  }

  if (!recipient) {
    showStatus('Please enter a recipient name.', 'error');
    recipientInput.focus();
    return;
  }

  if (!context) {
    showStatus('Please describe the purpose or context of the letter.', 'error');
    contextTextarea.focus();
    return;
  }

  if (GEMINI_API_KEY === 'YOUR_KEY_HERE') {
    showStatus('⚠ Please add your Gemini API key in script.js.', 'error');
    return;
  }

  // --- Start loading state ---
  showStatus('');
  setLoading(true);

  try {
    // Call Gemini with all new parameters
    const result = await callGemini(sender, schoolName, studentId, recipient, recipientTitle, recipientAddr, tone, context);

    // Extract body and subject from result
    const { body: generatedText, subject } = result;

    // Convert line breaks to HTML paragraphs
    const bodyHtml = textToHtmlParagraphs(generatedText);

    // Inject into the paper body with a CSS animation
    paperBody.classList.remove('is-animated');
    paperBody.innerHTML = bodyHtml;

    // Force reflow so the animation re-triggers
    void paperBody.offsetWidth;
    paperBody.classList.add('is-animated');

    // Display subject line if it exists (formal letters)
    paperSubjectLine.textContent = subject || '';

    // Update closing based on tone
    updateClosing(tone);

    showStatus('Letter generated successfully.', 'success');

    // Auto-clear success message after 3 s
    setTimeout(() => showStatus(''), 3000);

  } catch (err) {
    console.error('[LetterStudio] Gemini API error:', err);
    showStatus(`Error: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
});


/* ─────────────────────────────────────────────────────
   6. DYNAMIC CLOSING LINE
   Maps tone → appropriate letter closing
   ───────────────────────────────────────────────────── */

const CLOSINGS = {
  formal:    'Yours sincerely,',
  casual:    'Cheers,',
  warm:      'With love and warmth,',
  confident: 'With confidence,',
  sincere:   'With sincere regards,',
};

/**
 * Updates the paper's closing line based on selected tone.
 * @param {string} tone
 */
function updateClosing(tone) {
  paperClosing.textContent = CLOSINGS[tone] || 'Sincerely,';
}

// Update closing whenever tone changes
toneSelect.addEventListener('change', () => {
  updateClosing(toneSelect.value);
});


/* ─────────────────────────────────────────────────────
   7. COPY TO CLIPBOARD
   ───────────────────────────────────────────────────── */

copyBtn.addEventListener('click', async () => {
  const letterText = buildPlainTextLetter();

  try {
    await navigator.clipboard.writeText(letterText);

    // Provide brief visual feedback
    const originalContent = copyBtn.innerHTML;
    copyBtn.textContent = '✓ Copied!';
    copyBtn.style.color       = 'var(--success-color)';
    copyBtn.style.borderColor = 'var(--success-color)';

    setTimeout(() => {
      copyBtn.innerHTML      = originalContent;
      copyBtn.style.color    = '';
      copyBtn.style.borderColor = '';
    }, 2000);

  } catch (err) {
    console.error('[LetterStudio] Clipboard error:', err);
    showStatus('Could not copy to clipboard.', 'error');
  }
});
