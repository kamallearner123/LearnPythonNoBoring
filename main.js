// Global Pyodide instance
let pyodide = null;
let isPyodideLoading = false;

// Initialize Pyodide
async function initPyodide() {
  if (pyodide || isPyodideLoading) return;
  isPyodideLoading = true;
  
  try {
    // Note: loadPyodide is available globally because we include the script in HTML
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
    });
    console.log("Pyodide loaded successfully.");
    
    // Enable all run buttons now that Pyodide is ready
    document.querySelectorAll('.btn-run').forEach(btn => {
      btn.disabled = false;
      btn.innerHTML = '▶ Run Code';
    });
  } catch (error) {
    console.error("Error loading Pyodide:", error);
    document.querySelectorAll('.btn-run').forEach(btn => {
      btn.innerHTML = 'Error Loading Python';
    });
  }
}

// Redirect Python's stdout to our custom print function
async function runPythonCode(code, outputElement, validationCode = null, validationElement = null) {
  if (!pyodide) {
    outputElement.textContent = "Python engine is still loading...";
    return;
  }

  outputElement.textContent = "";
  outputElement.classList.remove('error');
  if (validationElement) {
    validationElement.style.display = 'none';
    validationElement.className = 'validation-message';
  }

  // Set up custom stdout and stdin
  let output = "";
  pyodide.setStdout({ batched: (msg) => {
    output += msg + "\n";
    outputElement.textContent = output;
  }});
  
  pyodide.setStdin({
    stdin: () => {
      const result = window.prompt("Python is asking for input:");
      if (result !== null) {
          // Echo input to output area
          output += result + "\n";
          outputElement.textContent = output;
      }
      return result !== null ? result + "\n" : "\n";
    }
  });

  try {
    // Run the user's code
    await pyodide.runPythonAsync(code);
    
    // If there is no output but the code ran successfully, show a message
    if (output === "") {
        outputElement.textContent = "[Program finished with no output]";
    }

    // Run validation if provided
    if (validationCode && validationElement) {
      try {
        // Evaluate validation code which should return a boolean or throw an error
        let validationResult = await pyodide.runPythonAsync(validationCode);
        
        if (validationResult === true) {
          validationElement.textContent = "🎉 Great job! That's correct.";
          validationElement.classList.add('success');
          validationElement.style.display = 'block';
        } else {
          validationElement.textContent = "Hmm, that doesn't look quite right. Try again!";
          validationElement.classList.add('error');
          validationElement.style.display = 'block';
        }
      } catch (valErr) {
        validationElement.textContent = "Validation failed: " + valErr.message.split('\n').pop();
        validationElement.classList.add('error');
        validationElement.style.display = 'block';
      }
    }

  } catch (err) {
    // Display errors nicely
    outputElement.classList.add('error');
    // Extract the last few lines of the traceback which are most helpful for beginners
    let errLines = err.message.split('\n');
    let shortErr = errLines.slice(-3).join('\n'); // Usually gives the specific Error type and line
    outputElement.textContent = shortErr;
  }
}

// Initialize all editors on the page
function initEditors() {
  const editors = document.querySelectorAll('.interactive-editor');
  
  editors.forEach((editorDiv, index) => {
    const textarea = editorDiv.querySelector('textarea');
    const runBtn = editorDiv.querySelector('.btn-run');
    const outputArea = editorDiv.querySelector('.output-area');
    const validationMessage = editorDiv.querySelector('.validation-message');
    
    // The validation python code is stored in a data attribute
    const validationCode = editorDiv.getAttribute('data-validation');
    
    // Initialize CodeMirror
    const editor = CodeMirror.fromTextArea(textarea, {
      mode: {
        name: "python",
        version: 3,
        singleLineStringErrors: false
      },
      theme: "monokai",
      lineNumbers: true,
      indentUnit: 4,
      matchBrackets: true,
      autoCloseBrackets: true
    });
    
    // Set initial size
    editor.setSize("100%", "100%");

    // Handle Run Button Click
    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true;
      runBtn.innerHTML = '⏳ Running...';
      
      const code = editor.getValue();
      await runPythonCode(code, outputArea, validationCode, validationMessage);
      
      runBtn.disabled = false;
      runBtn.innerHTML = '▶ Run Code';
    });
  });
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  // Start loading Pyodide in the background
  initPyodide();
  // Initialize editors
  initEditors();
});

// Gamification Logic
window.markChapterFinished = function(btn) {
    // Determine which chapter we are on based on the URL
    const path = window.location.pathname;
    const page = path.split("/").pop();
    if (page && page.startsWith("chapter")) {
        // Save to localStorage
        localStorage.setItem(page, "true");
        btn.innerHTML = "🎉 Chapter Finished! (+100 XP) 🎉";
        btn.style.backgroundColor = "#4caf50";
        btn.style.boxShadow = "0 0 15px rgba(76, 175, 80, 0.6)";
    }
};

window.renderStatus = function() {
    const statusContainer = document.getElementById("status-container");
    if (!statusContainer) return;
    
    let xp = 0;
    let html = '<div class="status-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-top: 2rem;">';
    
    // Loop through all 19 chapters
    for (let i = 1; i <= 19; i++) {
        const chapterFile = `chapter${i}.html`;
        const isFinished = localStorage.getItem(chapterFile) === "true";
        
        if (isFinished) {
            xp += 100;
            html += `
                <div class="status-card" style="background: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px; padding: 1rem; text-align: center;">
                    <h3 style="color: #2e7d32; margin: 0 0 0.5rem 0;">Chapter ${i}</h3>
                    <div style="font-size: 2rem;">✅</div>
                    <div style="font-weight: bold; color: #4caf50; margin-top: 0.5rem;">Completed</div>
                </div>`;
        } else {
            html += `
                <div class="status-card" style="background: #fafafa; border: 1px solid #ddd; border-radius: 8px; padding: 1rem; text-align: center; opacity: 0.6;">
                    <h3 style="color: #666; margin: 0 0 0.5rem 0;">Chapter ${i}</h3>
                    <div style="font-size: 2rem;">🔒</div>
                    <div style="color: #999; margin-top: 0.5rem;">Not Started</div>
                </div>`;
        }
    }
    html += '</div>';
    
    // Calculate Rank
    let rank = "Novice (Lvl 1)";
    if (xp >= 300) rank = "Apprentice (Lvl 5)";
    if (xp >= 800) rank = "Wizard (Lvl 10)";
    if (xp >= 1500) rank = "Python Grandmaster (Lvl 20)";
    if (xp >= 1900) rank = "AI OVERLORD (MAX LVL)";
    
    document.getElementById("total-xp").innerText = `${xp} XP`;
    document.getElementById("current-rank").innerText = rank;
    statusContainer.innerHTML = html;
};

window.resetProgress = function() {
    if (confirm("Are you sure you want to reset all your progress? You will lose all your XP!")) {
        for (let i = 1; i <= 19; i++) {
            localStorage.removeItem(`chapter${i}.html`);
        }
        window.renderStatus();
    }
};

// If on status page, render immediately
if (window.location.pathname.endsWith("status.html")) {
    document.addEventListener("DOMContentLoaded", window.renderStatus);
}
