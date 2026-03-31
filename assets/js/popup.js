document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const mainView = document.getElementById('mainView');
    const settingsView = document.getElementById('settingsView');
    const settingsBtn = document.getElementById('settingsBtn');
    const backBtn = document.getElementById('backBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    // Settings inputs
    const apiKeyInput = document.getElementById('apiKeyInput');
    const skillsInput = document.getElementById('skillsInput');
    const experienceInput = document.getElementById('experienceInput');
    const portfolioInput = document.getElementById('portfolioInput');
    const apiModeSelector = document.getElementById('apiModeSelector');
    const customApiKeyGroup = document.getElementById('customApiKeyGroup');

    // Main view elements
    const jobStatus = document.getElementById('jobStatus');
    const statusDot = document.getElementById('statusDot');
    const jobContext = document.getElementById('jobContext');
    const sourceTag = document.getElementById('sourceTag');
    const manualModeBtn = document.getElementById('manualModeBtn');
    const manualModePanel = document.getElementById('manualModePanel');
    const manualJobTitle = document.getElementById('manualJobTitle');
    const manualJobCompany = document.getElementById('manualJobCompany');
    const manualJobText = document.getElementById('manualJobText');
    const applyManualJobBtn = document.getElementById('applyManualJobBtn');
    const toneSelector = document.getElementById('toneSelector');
    const beginnerModeToggle = document.getElementById('beginnerModeToggle');
    const generateBtn = document.getElementById('generateBtn');
    const regenerateShorterBtn = document.getElementById('regenerateShorterBtn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');
    
    // Usage elements
    const usageContainer = document.getElementById('usageContainer');
    const usageText = document.getElementById('usageText');

    // Result elements
    const resultArea = document.getElementById('resultArea');
    const beginnerInsights = document.getElementById('beginnerInsights');
    const insightText = document.getElementById('insightText');
    const proposalOutput = document.getElementById('proposalOutput');
    const copyBtn = document.getElementById('copyBtn');
    const insertBtn = document.getElementById('insertBtn');

    const suggestionsContainer = document.getElementById('suggestionsContainer');
    const suggestionsList = document.getElementById('suggestionsList');

    let currentJobContext = null;

    // --- View Navigation ---
    settingsBtn.addEventListener('click', () => {
        mainView.classList.remove('active');
        mainView.classList.add('hidden');
        settingsView.classList.remove('hidden');
        settingsView.classList.add('active');
    });

    backBtn.addEventListener('click', () => {
        settingsView.classList.remove('active');
        settingsView.classList.add('hidden');
        mainView.classList.remove('hidden');
        mainView.classList.add('active');
        checkApiKeyAndEnable();
    });

    // --- Manual Mode ---
    manualModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        manualModePanel.classList.toggle('hidden');
    });

    applyManualJobBtn.addEventListener('click', () => {
        if (!manualJobText.value.trim()) return;
        handleJobContextResponse({
            platform: 'Manual Input',
            title: manualJobTitle.value.trim() || 'Manual Job',
            company: manualJobCompany.value.trim() || 'Unknown Company',
            description: manualJobText.value.trim()
        });
        manualModePanel.classList.add('hidden');
    });

    // --- Settings Management ---
    function loadSettings() {
        chrome.storage.local.get(['gemini_api_key', 'skills', 'experience', 'portfolio', 'beginnerMode', 'tone', 'apiMode'], (result) => {
            if (result.gemini_api_key) apiKeyInput.value = result.gemini_api_key;
            if (result.skills) skillsInput.value = result.skills;
            if (result.experience) experienceInput.value = result.experience;
            if (result.portfolio) portfolioInput.value = result.portfolio;
            
            if (result.apiMode) apiModeSelector.value = result.apiMode;
            customApiKeyGroup.style.display = apiModeSelector.value === 'custom' ? 'block' : 'none';

            if (result.beginnerMode !== undefined) beginnerModeToggle.checked = result.beginnerMode;
            if (result.tone) toneSelector.value = result.tone;

            checkApiKeyAndEnable();
            checkUsage();
        });
    }

    saveSettingsBtn.addEventListener('click', () => {
        saveSettingsBtn.textContent = 'Saving...';
        chrome.storage.local.set({
            gemini_api_key: apiKeyInput.value.trim(),
            skills: skillsInput.value.trim(),
            experience: experienceInput.value.trim(),
            portfolio: portfolioInput.value.trim(),
            apiMode: apiModeSelector.value
        }, () => {
            setTimeout(() => {
                saveSettingsBtn.textContent = 'Save Profile';
                backBtn.click();
                checkUsage();
            }, 500);
        });
    });

    apiModeSelector.addEventListener('change', () => {
        customApiKeyGroup.style.display = apiModeSelector.value === 'custom' ? 'block' : 'none';
        chrome.storage.local.set({ apiMode: apiModeSelector.value });
        checkApiKeyAndEnable();
        checkUsage();
    });

    toneSelector.addEventListener('change', () => chrome.storage.local.set({ tone: toneSelector.value }));
    beginnerModeToggle.addEventListener('change', () => chrome.storage.local.set({ beginnerMode: beginnerModeToggle.checked }));

    // --- Job Context Extraction ---
    function fetchJobContext() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            let activeTab = tabs[0];
            if (!activeTab || activeTab.url.startsWith('chrome://')) {
                jobStatus.textContent = "Please open a valid webpage.";
                return;
            }

            chrome.tabs.sendMessage(activeTab.id, { action: "getJobContext" }, (response) => {
                // If content script is not injected yet, we might get an error
                if (chrome.runtime.lastError || !response) {
                    // Try to inject script dynamically
                    chrome.scripting.executeScript({
                        target: { tabId: activeTab.id },
                        files: ['assets/js/content.js']
                    }, () => {
                        // Retry sending message after injection
                        setTimeout(() => {
                            chrome.tabs.sendMessage(activeTab.id, { action: "getJobContext" }, handleJobContextResponse);
                        }, 200);
                    });
                } else {
                    handleJobContextResponse(response);
                }
            });
        });
    }

    function handleJobContextResponse(response) {
        if (!response || chrome.runtime.lastError || !response.description) {
            jobStatus.textContent = "Could not read page. Open a job link.";
            statusDot.classList.remove('detected');
            return;
        }

        currentJobContext = response;

        chrome.storage.local.get(['savedProposal', 'savedTip', 'savedJobUrl', 'savedSuggestions'], (saved) => {
            if (saved.savedJobUrl === response.url && saved.savedProposal) {
                proposalOutput.value = saved.savedProposal;
                if (saved.savedTip) {
                    beginnerInsights.classList.remove('hidden');
                    insightText.textContent = saved.savedTip;
                } else {
                    beginnerInsights.classList.add('hidden');
                }

                if (saved.savedSuggestions && saved.savedSuggestions.length > 0) {
                    renderSuggestions(saved.savedSuggestions);
                } else {
                    suggestionsContainer.classList.add('hidden');
                }

                resultArea.classList.remove('hidden');
                regenerateShorterBtn.classList.remove('hidden');
                jobStatus.textContent = `Restored proposal for ${response.title}`;
            }
        });

        let platformName = "Unknown Site";
        if (response.platform.includes('upwork')) platformName = "Upwork";
        if (response.platform.includes('fiverr')) platformName = "Fiverr";
        if (response.platform.includes('freelancer')) platformName = "Freelancer";
        if (response.platform.includes('linkedin')) platformName = "LinkedIn";
        if (response.platform === 'Manual Input') platformName = "Manual Input";

        let snippet = response.description.substring(0, 150) + "...";
        jobStatus.textContent = `Generating proposal for: ${response.title} at ${response.company || 'Unknown Company'}`;
        statusDot.classList.add('detected');

        sourceTag.style.display = 'inline-block';
        sourceTag.textContent = `Source: ${platformName}`;

        jobContext.innerHTML = `<strong>Title:</strong> ${response.title}<br><strong>Company:</strong> ${response.company || 'Unknown Company'}<br><br><span class="text-sm">${snippet}</span>`;

        checkApiKeyAndEnable();
    }

    function checkApiKeyAndEnable() {
        chrome.storage.local.get(['gemini_api_key', 'apiMode'], (result) => {
            let mode = result.apiMode || 'app';
            if (mode === 'custom' && !result.gemini_api_key) {
                generateBtn.disabled = true;
                btnText.textContent = "Setup API Key in Settings";
                return;
            }
            if (!currentJobContext) {
                generateBtn.disabled = true;
                btnText.textContent = "Waiting for Job Data...";
                return;
            }

            generateBtn.disabled = false;
            btnText.textContent = "Generate Proposal for This Job ✨";
            checkUsage(); // Will re-disable if limit reached on App Mode
        });
    }

    async function checkUsage() {
        chrome.storage.local.get(['apiMode'], async (result) => {
            if (result.apiMode === 'custom') {
                if (usageContainer) usageContainer.style.display = 'none';
                return;
            }
            if (usageContainer) usageContainer.style.display = 'block';
            try {
                const res = await fetch('https://ai-prompt-generation.onrender.com/api/usage');
                if (!res.ok) throw new Error();
                const data = await res.json();
                if (usageText) usageText.textContent = `${data.used}/${data.limit} free proposals used today`;
                
                if (data.used >= data.limit) {
                    generateBtn.disabled = true;
                    btnText.textContent = "Free Limit Reached";
                }
            } catch (err) {
                if (usageText) usageText.textContent = "App service offline - Use custom key";
            }
        });
    }

    function renderSuggestions(suggestions) {
        suggestionsList.innerHTML = '';
        suggestions.forEach(sug => {
            let btn = document.createElement('button');
            btn.className = 'badge';
            btn.style.cssText = 'background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; cursor: pointer; padding: 4px 10px; font-size: 0.75rem; border-radius: 12px; transition: all 0.2s; white-space: nowrap; font-family: inherit;';
            btn.textContent = `+ ${sug.label}`;
            btn.title = "Click to append: " + sug.text;
            btn.onclick = (e) => {
                e.preventDefault();
                proposalOutput.value += `\n\n${sug.text}`;
                btn.style.display = 'none';
                chrome.storage.local.set({ savedProposal: proposalOutput.value }); // Update saved state
            };
            suggestionsList.appendChild(btn);
        });
        suggestionsContainer.classList.remove('hidden');
    }

    // --- API Call & Generation ---
    async function performGeneration(makeShorter = false) {
        if (generateBtn.disabled) return;

        // UI Loading State
        generateBtn.disabled = true;
        if (regenerateShorterBtn) regenerateShorterBtn.disabled = true;
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        resultArea.classList.add('hidden');
        jobStatus.textContent = `Generating proposal for ${currentJobContext.title}...`;

        chrome.storage.local.get(['gemini_api_key', 'skills', 'experience', 'portfolio', 'tone', 'beginnerMode', 'apiMode'], async (settings) => {
            try {
                let apiKey = settings.gemini_api_key;
                let tone = settings.tone || 'professional';
                let beginnerMode = settings.beginnerMode !== false; // default true
                let apiMode = settings.apiMode || 'app';

                let prompt = `You are an expert freelance proposal writer. Write like a real freelancer, not an AI. Keep it highly conversant, human-like, yet professional. Use simple, natural language and vary sentence lengths. Avoid overly polished/textbook phrases. Start with something natural like "Hey, this looks like something I've worked on before..." Do NOT sound repetitive or robotic.
                
                Write a comprehensive, highly detailed, and persuasive proposal (around 150-250 words, formatted in 4-5 distinct paragraphs) following this advanced structure:
                1. Greeting: Natural and engaging hook. Mention their Company specifically to grab attention.
                2. Deep Understanding: Dive deeply into their specific needs and show exactly why you understand the complexities of their job.
                3. Proven Value & Skills: Detail precisely how your highlighted experience solves their problem. Emphasize relevant background in a confident, story-like narrative.
                4. Execution Plan: Provide a brief summary of how you would approach starting their project immediately.
                5. Call to Action & Closing: A professional, friendly prompt to schedule an interview or chat, signed confidently.

                Job Details:
                Title: ${currentJobContext.title}
                Company: ${currentJobContext.company || "Unknown Company"}
                Description snippet: ${currentJobContext.description.substring(0, 1500)}

                Freelancer Profile:
                Skills: ${settings.skills || "Adapt to job"}
                Experience: ${settings.experience || "Eager learner"}
                Portfolio Link: ${settings.portfolio || ""}

                Tone: Slightly informal but respectful. Professional, Confident, and Friendly (incorporate requested tone: ${tone}).
                FORMATTING RULES: Extremely clean text. Make sure to escape all newlines as \\n within the JSON strings. Do NOT use markdown symbols like asterisks (*) or hash (#).`;

                if (makeShorter) {
                    prompt += `\n\nCRITICAL EXTRA INSTRUCTION: Make it even shorter and more impactful. Limit to exactly 3-4 impactful lines total. Cut any fluff.`;
                }

                prompt += `
                You must ALWAYS provide exactly 3-5 short, actionable ONE-LINE "suggestions" that the user could optionally append to the end of the proposal.
                Suggestions could be: "View my portfolio here: [link]", or "I can finish this within 3-5 days.", or "I recently worked on a similar project...".

                Return the response in EXACTLY this JSON format:
                {
                    "proposal": "The natural, conversational, short proposal text... (must use \\n to denote paragraphs)",
                    "suggestions": [
                        {"label": "Portfolio Link", "text": "You can view my portfolio here: [link]"},
                        {"label": "Timeline", "text": "I can complete this within 3-5 days."}
                    ],
                    "tip": ${beginnerMode ? '"A short 1-2 sentence tip explanation of why this structure works."' : '""'}
                }
                Return ONLY valid JSON and nothing else. No markdown JSON wrappers.`;

                let data;
                if (apiMode === 'app') {
                    const res = await fetch('https://ai-prompt-generation.onrender.com/api/generate', {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ prompt: prompt })
                    });
                    
                    const backendData = await res.json();
                    if (!res.ok) {
                        throw new Error(backendData.error || "Backend server failed.");
                    }
                    data = backendData.data; // Server wrapped the gemini data
                    checkUsage(); // refresh usage
                } else {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            systemInstruction: { parts: [{text: "You are an expert proposal writing assistant. Output ONLY perfectly valid JSON. Escape all newlines as \\n within strings."}] },
                            contents: [{ parts: [{text: prompt}] }],
                            generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
                        })
                    });
                    data = await res.json();
                }

                if (data.error) {
                    throw new Error(data.error.message);
                }

                let content = data.candidates[0].content.parts[0].text.trim();
                let resultJson = { proposal: "", suggestions: [], tip: "" };
                
                try {
                    // Impenetrable JSON extractor
                    let startIndex = content.indexOf('{');
                    let endIndex = content.lastIndexOf('}');
                    
                    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                        let jsonText = content.substring(startIndex, endIndex + 1);

                        // Prevent API bug: aggressively sanitize literal newlines/tabs inside string payload blocks
                        jsonText = jsonText.replace(/"(?:\\.|[^"\\])*"/g, function(match) {
                            return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
                        });
                        
                        let parsed = JSON.parse(jsonText);
                        if (parsed && typeof parsed === 'object') {
                            if (parsed.proposal) resultJson.proposal = parsed.proposal;
                            if (parsed.suggestions) resultJson.suggestions = parsed.suggestions;
                            if (parsed.tip) resultJson.tip = parsed.tip;
                        }
                    } else {
                        throw new Error("Missing brackets");
                    }
                } catch (e) {
                    console.error("AI JSON Error - Engaging Ultimate Fallback. Raw content:", content);
                    
                    // Fallback! Extract proposal roughly from raw text if parsing utterly exploded or if truncated
                    let roughMatch = content.match(/"proposal"\s*:\s*"?([\s\S]*?)"?(?:\s*,\s*"suggestions"|\s*\}$|$)/i);
                    if (roughMatch && roughMatch[1].length > 10) {
                        // Convert any encoded \\n back to visual newlines since we bypassed JSON parse
                        resultJson.proposal = roughMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
                    } else {
                        // Utter failure: AI generated flat text or complete markdown mess. Just dump the raw content into the proposal box safely!
                        let cleanRaw = content.replace(/^```(json)?\n?|```$/gi, '').trim();
                        cleanRaw = cleanRaw.replace(/^\{\s*"proposal"\s*:\s*"?/i, '');
                        resultJson.proposal = cleanRaw;
                    }
                }

                if (!resultJson.proposal) {
                    resultJson.proposal = "AI generated completely blank output. Try again.";
                }

                // Show Results safely
                if (proposalOutput) {
                    proposalOutput.value = resultJson.proposal || "Could not generate proposal.";
                }

                if (beginnerInsights && insightText) {
                    if (beginnerMode && resultJson.tip) {
                        beginnerInsights.classList.remove('hidden');
                        insightText.textContent = resultJson.tip;
                    } else {
                        beginnerInsights.classList.add('hidden');
                    }
                }

                if (resultJson.suggestions && resultJson.suggestions.length > 0) {
                    renderSuggestions(resultJson.suggestions);
                } else if (suggestionsContainer) {
                    suggestionsContainer.classList.add('hidden');
                }

                if (resultArea) resultArea.classList.remove('hidden');
                if (regenerateShorterBtn) regenerateShorterBtn.classList.remove('hidden');

                // Save state to persist across popup closes
                chrome.storage.local.set({
                    savedProposal: resultJson.proposal || "",
                    savedTip: resultJson.tip || "",
                    savedSuggestions: resultJson.suggestions || [],
                    savedJobUrl: currentJobContext ? currentJobContext.url : ""
                });

            } catch (error) {
                console.error("API Error:", error);
                jobStatus.textContent = "Error: " + error.message;
            } finally {
                generateBtn.disabled = false;
                if (regenerateShorterBtn) regenerateShorterBtn.disabled = false;
                btnText.classList.remove('hidden');
                btnLoader.classList.add('hidden');
                btnText.textContent = "Regenerate Proposal 🔄";
                if (resultArea && !resultArea.classList.contains('hidden')) {
                    jobStatus.textContent = `Proposal generated for ${currentJobContext.title} at ${currentJobContext.company}`;
                }
            }
        });
    }

    generateBtn.addEventListener('click', () => performGeneration(false));
    if (regenerateShorterBtn) {
        regenerateShorterBtn.addEventListener('click', () => performGeneration(true));
    }

    // --- Copy and Insert Actions ---
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(proposalOutput.value).then(() => {
            let originalHeader = copyBtn.innerHTML;
            copyBtn.innerHTML = "✅";
            setTimeout(() => { copyBtn.innerHTML = originalHeader; }, 2000);
        });
    });

    insertBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            let activeTab = tabs[0];
            chrome.tabs.sendMessage(activeTab.id, {
                action: "insertProposal",
                text: proposalOutput.value
            }, (response) => {
                if (response && response.success) {
                    let originalHeader = insertBtn.innerHTML;
                    insertBtn.innerHTML = "✅";
                    setTimeout(() => { insertBtn.innerHTML = originalHeader; }, 2000);
                } else {
                    alert("Could not auto-insert. Please use the Copy button instead and paste it manually.");
                }
            });
        });
    });

    // --- Init ---
    loadSettings();
    // Delay slightly to ensure tab context is ready
    setTimeout(fetchJobContext, 300);
});
