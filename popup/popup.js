document.addEventListener('DOMContentLoaded', () => {
    console.log("Beeline Popup v1.1 loaded");
    const bionicToggle = document.getElementById('bionic-toggle');
    const beelineToggle = document.getElementById('beeline-toggle');
    const fontToggle = document.getElementById('font-toggle');
    const applyBtn = document.getElementById('apply-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Load saved settings
    browser.storage.local.get(['bionic', 'beeline', 'font']).then((result) => {
        bionicToggle.checked = result.bionic !== false; // Default true
        beelineToggle.checked = result.beeline !== false; // Default true
        fontToggle.checked = result.font === true; // Default false
    });

    applyBtn.addEventListener('click', () => {
        const settings = {
            bionic: bionicToggle.checked,
            beeline: beelineToggle.checked,
            font: fontToggle.checked
        };
        browser.storage.local.set(settings);
        
        browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id, {
                command: 'apply',
                settings: settings
            });
        });
    });

    resetBtn.addEventListener('click', () => {
        browser.tabs.reload(); // Simplest reset is reload for now
    });
});
