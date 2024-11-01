// カウンター表示を更新
async function updateCounter() {
    try {
        const data = await chrome.storage.local.get(['tweetCounter']);
        const count = data.tweetCounter || 0;
        document.getElementById('currentCount').textContent = `ツイート数: ${count}`;
    } catch (error) {
        console.error('Error updating counter:', error);
    }
}

// ステータスメッセージを表示
function showStatus(message, isSuccess = true) {
    const status = document.getElementById('saveStatus');
    status.textContent = message;
    status.className = 'status ' + (isSuccess ? 'success' : 'error');
    status.style.display = 'block';
    
    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}

// 全データをリセット
async function resetAllData() {
    await chrome.storage.local.set({ 
        tweetCounter: 0, 
        tweets: [], 
        processedTweetIds: []
    });
    updateCounter();
}

// ユーザーIDをロード
async function loadUserId() {
    const settings = await chrome.storage.local.get(['userId']);
    if (settings.userId) {
        document.getElementById('userId').value = settings.userId;
    }
}

// ハッシュタグ自動追加モードの状態をロード
async function loadAutoHashtagMode() {
    const settings = await chrome.storage.local.get(['autoHashtagMode']);
    document.getElementById('autoHashtagMode').checked = settings.autoHashtagMode || false;
}

// カウンター常時表示モードの状態をロード
async function loadAlwaysShowCounter() {
    const settings = await chrome.storage.local.get(['alwaysShowCounter']);
    document.getElementById('alwaysShowCounter').checked = settings.alwaysShowCounter || false;
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    updateCounter();
    loadUserId();
    loadAutoHashtagMode();
    loadAlwaysShowCounter();
    
    // ユーザーIDを保存
    document.getElementById('saveUserId').addEventListener('click', async () => {
        const userId = document.getElementById('userId').value.trim();
        const currentSettings = await chrome.storage.local.get(['userId']);
        
        if (userId) {
            // IDが現在のものと異なる場合、全データをリセット
            if (currentSettings.userId !== userId) {
                await chrome.storage.local.set({ userId });
                await resetAllData();
                showStatus('ユーザーIDを保存し、データをリセットしました！');
            } else {
                showStatus('ユーザーIDを保存しました！');
            }

            // 現在のタブをリロード
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        } else {
            showStatus('有効なユーザーIDを入力してください', false);
        }
    });

    // ハッシュタグ自動追加モードの変更を保存
    document.getElementById('autoHashtagMode').addEventListener('change', async (e) => {
        const autoHashtagMode = e.target.checked;
        await chrome.storage.local.set({ autoHashtagMode });
    });

    // カウンター常時表示モードの変更を保存
    document.getElementById('alwaysShowCounter').addEventListener('change', async (e) => {
        const alwaysShowCounter = e.target.checked;
        await chrome.storage.local.set({ alwaysShowCounter });
    });

    // ツイート一覧を見る
    document.getElementById('viewList').addEventListener('click', () => {
        chrome.tabs.create({ url: 'list.html' });
    });
});

// ストレージ変更時にカウンターを更新
chrome.storage.onChanged.addListener((changes) => {
    if (changes.tweetCounter) {
        updateCounter();
    }
});
