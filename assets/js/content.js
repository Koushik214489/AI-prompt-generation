function extractJobContext() {
    let platform = window.location.hostname;
    let url = window.location.href;
    
    let title = "";
    let company = "Unknown Company";
    let desc = "";

    // Smart Detection helper
    const getText = (selector, parent = document) => {
        let el = parent.querySelector(selector);
        return el ? el.innerText.trim() : null;
    };
    
    const getVisibleDesc = (selectors, parent = document) => {
        for (let sel of selectors) {
            let el = parent.querySelector(sel);
            if (el && el.innerText.trim().length > 50) return el.innerText;
        }
        return null;
    };

    if (platform.includes('linkedin.com')) {
        let panel = document.querySelector('.jobs-search__job-details--container') || document.querySelector('.job-view-layout') || document;
        title = getText('.job-details-jobs-unified-top-card__job-title', panel) || getText('h1', panel) || document.title;
        company = getText('.job-details-jobs-unified-top-card__company-name', panel) || getText('.job-details-jobs-unified-top-card__primary-description a', panel) || "LinkedIn Company";
        desc = getVisibleDesc(['.jobs-description__content', '.description__text', '#job-details'], panel) || "";
    } else if (platform.includes('upwork.com')) {
        title = getText('h1.up-card-title') || document.title;
        company = getText('[data-qa="client-company-name"]') || getText('li[data-qa="client-name"]') || "Upwork Client";
        desc = getVisibleDesc(['.job-description', '[data-test="job-description-text"]']) || "";
    } else if (platform.includes('fiverr.com')) {
        title = getText('h1') || document.title;
        company = getText('.seller-name') || "Fiverr Buyer";
        desc = getVisibleDesc(['.description-wrapper', '.gig-description']) || "";
    } else if (platform.includes('freelancer.com')) {
        title = getText('h1') || document.title;
        company = "Freelancer Client";
        desc = getVisibleDesc(['.PageProjectViewLogout-detail', '.Card-body']) || "";
    }
    
    // Generic fallback
    if (!desc || desc.length < 50) {
        let main = document.querySelector('main') || document.querySelector('article') || document.body;
        desc = main.innerText;
        title = document.title;
    }

    // Clean up generic whitespace and limit to 3500 chars
    desc = desc.replace(/\s+/g, ' ').trim().substring(0, 3500);

    return {
        platform: platform,
        title: title || document.title || "Job Post",
        company: company || "Unknown Company",
        description: desc,
        url: url
    };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getJobContext") {
        sendResponse(extractJobContext());
    } else if (request.action === "insertProposal") {
        let inserted = false;
        
        // Try currently focused element
        let active = document.activeElement;
        if (active && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && active.type === 'text'))) {
            active.value = request.text;
            active.dispatchEvent(new Event('input', { bubbles: true }));
            inserted = true;
        } 
        // Fallback: search for first textarea
        else {
            let textareas = document.querySelectorAll('textarea');
            if (textareas.length > 0) {
                textareas[0].value = request.text;
                textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
                inserted = true;
            }
        }
        sendResponse({ success: inserted });
    }
});
