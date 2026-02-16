// content.js
console.log("Beeline Content Script v1.1 loaded");

function bionicWord(word) {
    if (word.length < 2) return word;
    const mid = Math.ceil(word.length / 2);
    return `<b>${word.slice(0, mid)}</b>${word.slice(mid)}`;
}

function processContent(settings) {
    // We will target standard content text containers to avoid breaking scripts/styles
    // A simple heuristic: p, li, td, div (sometimes)
    // For "simplest" version, let's just walk all text nodes in body, but be careful of invisible elements.
    
    // Better approach for "simplest": Select all 'p' tags and 'li' tags.
    const textContainers = document.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6');

    textContainers.forEach(container => {
        // Skip if already processed or simplistic check
        if (container.dataset.processed) return;
        
        // Simple logic: get text content, split by space, process, put back.
        // NOTE: This destroys existing HTML structure (links, bolds, etc.) inside the paragraph.
        // For a "replica", preserving links is important.
        // BUT user asked for "simplest/lowest performance".
        // Preserving links AND doing this requires a TreeWalker. Let's do TreeWalker.
        
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const nodes = [];
        let node;
        while(node = walker.nextNode()) {
            if(node.nodeValue.trim().length > 0) {
                nodes.push(node);
            }
        }

        nodes.forEach(node => {
           const text = node.nodeValue;
           const words = text.split(/(\s+)/); // Keep delimiters
           
           const spanWrapper = document.createElement('span');
           
           words.forEach(word => {
               if(word.trim().length === 0) {
                   spanWrapper.appendChild(document.createTextNode(word));
                   return;
               }

               const span = document.createElement('span');
               span.dataset.beelineWord = "true"; // Mark for coloring
               
               if (settings.bionic) {
                   span.innerHTML = bionicWord(word);
               } else {
                   span.textContent = word;
               }
               spanWrapper.appendChild(span);
           });
           
           node.parentNode.replaceChild(spanWrapper, node);
        });
        
        container.dataset.processed = "true";
    });

    if (settings.beeline) {
        applyBeelineColors();
    }
    
    applyFont(settings.font);
}

function applyFont(enable) {
    const styleId = 'beeline-font-style';
    let style = document.getElementById(styleId);
    
    if (enable) {
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                body, p, li, h1, h2, h3, h4, h5, h6, span, div, td, a {
                    font-family: 'Georgia', serif !important;
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        if (style) {
            style.remove();
        }
    }
}

function applyBeelineColors() {
    const allWords = Array.from(document.querySelectorAll('[data-beeline-word="true"]'));
    if (allWords.length === 0) return;

    // Group by line
    // We verify "line" by checking "top" position.
    // If top is within a small margin (e.g. 5px) of previous, it's same line.
    
    let lines = [];
    let currentLine = [];
    let lastTop = null;
    
    allWords.forEach(span => {
        const rect = span.getBoundingClientRect();
        // Skip invisible
        if (rect.width === 0 || rect.height === 0) return;
        
        const top = rect.top + window.scrollY; // Absolute top
        
        if (lastTop === null) {
            currentLine.push(span);
            lastTop = top;
        } else {
            if (Math.abs(top - lastTop) < 10) { // 10px tolerance for "same line"
                currentLine.push(span);
            } else {
                lines.push(currentLine);
                currentLine = [span];
                lastTop = top;
            }
        }
    });
    if (currentLine.length > 0) lines.push(currentLine);

    // Apply colors
    // Cycle: 
    // 0: Red -> Black (start black)
    // 1: Black -> Blue
    // 2: Blue -> Black
    // 3: Black -> Red
    // Replicating roughly Beeline's "Bright" scheme
    
    lines.forEach((line, index) => {
        const type = index % 4;
        const total = line.length;
        
        line.forEach((span, i) => {
            const progress = i / (total - 1 || 1);
            let r, g, b;
            
            // Simple linear interpolation
            // Red: 255, 0, 0
            // Black: 0, 0, 0
            // Blue: 0, 0, 255
            
            switch(type) {
                case 0: // Red -> Black
                    // (255,0,0) -> (0,0,0)
                    r = Math.floor(255 * (1 - progress));
                    g = 0;
                    b = 0;
                    break;
                case 1: // Black -> Blue
                    // (0,0,0) -> (0,0,255)
                    r = 0;
                    g = 0;
                    b = Math.floor(255 * progress);
                    break;
                case 2: // Blue -> Black
                    // (0,0,255) -> (0,0,0)
                    r = 0;
                    g = 0;
                    b = Math.floor(255 * (1 - progress));
                    break;
                case 3: // Black -> Red
                    // (0,0,0) -> (255,0,0)
                    r = Math.floor(255 * progress);
                    g = 0;
                    b = 0;
                    break;
            }
            
            span.style.color = `rgb(${r}, ${g}, ${b})`;
        });
    });
}

browser.runtime.onMessage.addListener((message) => {
    if (message.command === 'apply') {
        processContent(message.settings);
    }
});
