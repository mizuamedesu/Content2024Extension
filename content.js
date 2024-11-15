// content.js

console.log('Content script loaded');

let configuredUserId = null;
let processedTweetIds = new Set();
let isProcessing = false;
let autoHashtagMode = false;
let lastInsertedTweet = null;
let alwaysShowCounter = false;
let enableCustomQuery = false;
let customQuery = null;
let tweetCounter = 0;

// カウンターの期間
let countStartDateTime = null;
let countEndDateTime = null;

// カウンターオーバーレイ
let counterOverlay = null;

// ストアされたデータをロード
async function loadStoredData() {
    try {
        const settings = await chrome.storage.local.get([
            'userId',
            'processedTweetIds',
            'autoHashtagMode',
            'alwaysShowCounter',
            'enableCustomQuery',
            'customQuery',
            'tweetCounter'
        ]);
        configuredUserId = settings.userId;
        if (settings.processedTweetIds) {
            processedTweetIds = new Set(settings.processedTweetIds);
        }
        autoHashtagMode = settings.autoHashtagMode || false;
        alwaysShowCounter = settings.alwaysShowCounter || false;
        enableCustomQuery = settings.enableCustomQuery || false;
        customQuery = settings.customQuery || null;
        tweetCounter = settings.tweetCounter || 0;

        // カウント期間を設定
        setCountDateTime();

        console.log('Loaded user ID:', configuredUserId);
        console.log('Loaded processed tweet count:', processedTweetIds.size);
        console.log('Auto Hashtag Mode:', autoHashtagMode);
        console.log('Always Show Counter:', alwaysShowCounter);
        console.log('Custom Query Enabled:', enableCustomQuery);
        if (enableCustomQuery && customQuery) {
            console.log('Custom Query Period:', customQuery.startDateTime, '-', customQuery.endDateTime);
        } else {
            console.log('Count Period:', countStartDateTime, '-', countEndDateTime);
        }

        if (alwaysShowCounter) {
            showTweetCounterOverlay();
        }

        if (autoHashtagMode) {
            setupAutoHashtag();
        }
    } catch (error) {
        console.error('Error loading stored data:', error);
    }
}

// カウンター期間を設定
function setCountDateTime() {
    if (enableCustomQuery && customQuery) {
        countStartDateTime = new Date(customQuery.startDateTime);
        countEndDateTime = new Date(customQuery.endDateTime);
    } else {
        // デフォルト: 今日の00:00~23:59
        let today = new Date();
        countStartDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        countEndDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    }
}

// ハッシュタグを取得
function getTwitterHashtags() {
    return ['#コンテンツ入門2024'];
}

// キャレット位置にテキストを挿入
function insertTextAtCursor(element, text) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    const textNode = document.createTextNode(text + ' ');
    range.insertNode(textNode);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
}

// ハッシュタグを挿入
function insertHashtags(composerArea) {
    if (!autoHashtagMode || !composerArea) return;

    const hashtags = getTwitterHashtags();
    if (hashtags.length === 0) return;

    const hashtagText = hashtags.join(' ');

    // ハッシュタグが既に含まれていない場合のみ追加
    if (!composerArea.innerText.includes(hashtagText)) {
        composerArea.focus();

        // キャレットを先頭に移動
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(composerArea);
        range.collapse(true); // trueで先頭、falseで末尾
        selection.removeAllRanges();
        selection.addRange(range);

        // ハッシュタグと改行を挿入
        document.execCommand('insertText', false, hashtagText);
        document.execCommand('insertLineBreak');
        
        // 入力イベントをディスパッチ
        composerArea.dispatchEvent(new Event('input', { bubbles: true }));

        console.log('Hashtags inserted with newline:', hashtagText);
    }
}

// ツイート入力欄の監視
function setupAutoHashtag() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const callback = function (mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const composerArea = node.querySelector('[data-testid="tweetTextarea_0"][role="textbox"]');
                        if (composerArea) {
                            insertHashtags(composerArea);
                        }
                    }
                });
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
}

// ツイート数オーバーレイを表示
function showTweetCounterOverlay() {
    if (!counterOverlay) {
        counterOverlay = document.createElement('div');
        counterOverlay.id = 'tweet-counter-overlay';
        counterOverlay.style.position = 'fixed';
        counterOverlay.style.bottom = '10px';
        counterOverlay.style.left = '10px';
        counterOverlay.style.backgroundColor = 'rgba(29, 161, 242, 0.8)';
        counterOverlay.style.color = 'white';
        counterOverlay.style.padding = '10px';
        counterOverlay.style.borderRadius = '50%';
        counterOverlay.style.zIndex = '10000';
        counterOverlay.style.fontSize = '16px';
        counterOverlay.style.fontWeight = 'bold';
        counterOverlay.style.textAlign = 'center';
        counterOverlay.style.cursor = 'pointer';
        counterOverlay.addEventListener('click', navigateToSearchPage);
        document.body.appendChild(counterOverlay);
    }
    updateTweetCounterOverlay();
}

// ツイート数オーバーレイを削除
function removeTweetCounterOverlay() {
    if (counterOverlay) {
        counterOverlay.removeEventListener('click', navigateToSearchPage);
        counterOverlay.remove();
        counterOverlay = null;
    }
}

// ツイート数オーバーレイを更新
function updateTweetCounterOverlay() {
    if (alwaysShowCounter && counterOverlay) {
        counterOverlay.textContent = tweetCounter;
    }
}

// 検索ページに移動
function navigateToSearchPage() {
    if (!configuredUserId) return;

    const encodedUserId = encodeURIComponent(configuredUserId);
    let searchQuery = `from%3A${encodedUserId}+コンテンツ入門2024`;

    if (enableCustomQuery && customQuery) {
        const start = encodeURIComponent(customQuery.startDateTime);
        const end = encodeURIComponent(customQuery.endDateTime);
        searchQuery += `+since%3A${start}+until%3A${end}`;
    }

    const searchUrl = `https://x.com/search?q=${searchQuery}&src=recent_search_click&f=live`;

    window.location.href = searchUrl;
}

// ツイートカウンターを再計算
async function recalculateTweetCounter() {
    // カウント期間を更新
    setCountDateTime();

    const data = await chrome.storage.local.get(['tweets']);
    const allTweets = data.tweets || [];

    // カウント期間内のツイートのみをカウント
    const filteredTweets = allTweets.filter(tweet => {
        const tweetTime = new Date(tweet.tweetTime);
        return isDateTimeInRange(tweetTime, countStartDateTime, countEndDateTime);
    });

    tweetCounter = filteredTweets.length;

    await chrome.storage.local.set({ tweetCounter });
    updateTweetCounterOverlay();
}

// 日時が範囲内かチェック
function isDateTimeInRange(dateTime, startDateTime, endDateTime) {
    return dateTime >= startDateTime && dateTime <= endDateTime;
}

// 新しいツイートを処理
async function processTweet(tweet) {
    if (!configuredUserId || tweet.dataset.processed || isProcessing) return;

    try {
        isProcessing = true;

        const authorElement = tweet.querySelector('a[role="link"][href^="/"]');
        if (!authorElement) return;

        const authorName = authorElement.getAttribute('href').substring(1);
        if (authorName !== configuredUserId) {
            console.log('Skipping tweet from different author:', authorName);
            return;
        }

        // リツイートを除外
        const isRetweet = tweet.querySelector('[data-testid="socialContext"]')?.textContent?.match(
            /がリツイート|Retweeted|がリポスト|Reposted/i
        );

        if (isRetweet) {
            console.log('Skipping retweet:', isRetweet[0]);
            return;
        }

        // 引用リツイートか確認
        const isQuoteRetweet = tweet.querySelector('[data-testid="quoteTweet"]') !== null;

        const tweetTextElement = tweet.querySelector('[data-testid="tweetText"]');
        const tweetText = tweetTextElement ? tweetTextElement.textContent : '';

        // ツイートテキストにハッシュタグが含まれているか確認
        if (tweetText.includes('#コンテンツ入門2024')) {
            const tweetUrl = tweet.querySelector('a[href*="/status/"]')?.href;
            const tweetId = tweetUrl ? getTweetIdFromUrl(tweetUrl) : null;
            const tweetTime = getTweetTime(tweet);

            if (!tweetId || processedTweetIds.has(tweetId) || !tweetTime) {
                console.log('Skipping:', !tweetId ? 'No ID' : processedTweetIds.has(tweetId) ? 'Already processed' : 'No time');
                return;
            }

            console.log('Processing tweet:', {
                id: tweetId,
                author: authorName,
                time: tweetTime,
                isQuoteRetweet: isQuoteRetweet
            });

            // ツイートデータを保存
            const rawData = {
                tweetContent: tweet.outerHTML,
                tweetText: tweetText,
                tweetTime: tweetTime,
                timestamp: new Date().toISOString()
            };

            try {
                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        type: "NEW_TWEET",
                        url: tweetUrl,
                        tweetId: tweetId,
                        twitterId: authorName,
                        tweetTime: tweetTime,
                        rawData: rawData
                    }, response => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(response);
                        }
                    });
                });

                if (response?.success) {
                    processedTweetIds.add(tweetId);
                    await chrome.storage.local.set({
                        processedTweetIds: Array.from(processedTweetIds)
                    });

                    // カウント期間内のツイートか確認
                    const tweetTimeObj = new Date(tweetTime);

                    if (isDateTimeInRange(tweetTimeObj, countStartDateTime, countEndDateTime)) {
                        // 以下のインクリメント部分を削除
                        // tweetCounter += 1;
                        console.log('Tweet processed and counted:', {
                            id: tweetId,
                            rawDataSize: rawData.tweetContent.length
                        });
                    }

                    await chrome.storage.local.set({ tweetCounter });
                    updateTweetCounterOverlay();
                }
            } catch (error) {
                console.error('Failed to process tweet:', error);
            }
        } else {
            console.log('Skipping tweet without hashtag:', tweetText);
        }
    } finally {
        tweet.dataset.processed = "true";
        isProcessing = false;
    }
}

// ツイート時間を取得
function getTweetTime(tweet) {
    const timeElement = tweet.querySelector('time');
    return timeElement ? timeElement.getAttribute('datetime') : null;
}

// ツイートIDをURLから取得
function getTweetIdFromUrl(url) {
    const match = url.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
}

// 新しいツイートの監視
function observeTweets() {
    const tweetObserver = new MutationObserver((mutations) => {
        if (!configuredUserId) return;

        for (const mutation of mutations) {
            const tweets = document.querySelectorAll('[data-testid="tweet"]:not([data-processed])');
            tweets.forEach(tweet => processTweet(tweet));
        }
    });

    tweetObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    console.log('Tweet observer started');
}

// 初期化
console.log('Initializing content script');
loadStoredData().then(() => {
    observeTweets();
    recalculateTweetCounter(); // 初期カウンターの再計算
}).catch(console.error);

// 設定変更のリスナー
chrome.storage.onChanged.addListener((changes) => {
    if (changes.userId) {
        configuredUserId = changes.userId.newValue;
        console.log('User ID updated:', configuredUserId);

        // ユーザーIDが更新されたら検索ページに移動
        navigateToSearchPage();
    }
    if (changes.processedTweetIds) {
        processedTweetIds = new Set(changes.processedTweetIds.newValue || []);
        console.log('Processed tweets updated:', processedTweetIds.size);
    }
    if (changes.autoHashtagMode) {
        autoHashtagMode = changes.autoHashtagMode.newValue;
        console.log('Auto Hashtag Mode updated:', autoHashtagMode);
        if (autoHashtagMode) {
            setupAutoHashtag();
        }
    }
    if (changes.alwaysShowCounter) {
        alwaysShowCounter = changes.alwaysShowCounter.newValue;
        console.log('Always Show Counter updated:', alwaysShowCounter);
        if (alwaysShowCounter) {
            showTweetCounterOverlay();
        } else {
            removeTweetCounterOverlay();
        }
    }
    if (changes.enableCustomQuery) {
        enableCustomQuery = changes.enableCustomQuery.newValue;
        console.log('Enable Custom Query updated:', enableCustomQuery);
        setCountDateTime();
        recalculateTweetCounter();
    }
    if (changes.customQuery) {
        customQuery = changes.customQuery.newValue || null;
        console.log('Custom Query updated:', customQuery);
        setCountDateTime();
        recalculateTweetCounter();
    }
    if (changes.tweetCounter) {
        tweetCounter = changes.tweetCounter.newValue || 0;
        console.log('Tweet Counter updated:', tweetCounter);
        updateTweetCounterOverlay();
    }
});

// カウンター期間が変わった場合に再計算を要求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RECALCULATE_COUNTER') {
        recalculateTweetCounter().then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            console.error('Error recalculating counter:', error);
            sendResponse({ success: false });
        });
        return true; // 非同期レスポンス
    }
});

console.log('Background service worker starting...');

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "NEW_TWEET") {
        (async () => {
            try {
                // 現在のデータを取得
                const data = await chrome.storage.local.get([
                    'tweetCounter',
                    'tweets',
                    'processedTweetIds',
                    'countStartDateTime',
                    'countEndDateTime',
                    'isCustomQueryEnabled'
                ]);
                const processedIds = new Set(data.processedTweetIds || []);
                const isCustomQueryEnabled = data.isCustomQueryEnabled || false;

                let countStartDateTime, countEndDateTime;

                if (isCustomQueryEnabled) {
                    countStartDateTime = data.countStartDateTime ? new Date(data.countStartDateTime) : null;
                    countEndDateTime = data.countEndDateTime ? new Date(data.countEndDateTime) : null;
                } else {
                    // デフォルトの期間を設定
                    const today = new Date();
                    countStartDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
                    countEndDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
                }

                // 既に処理済みかチェック
                if (processedIds.has(request.tweetId)) {
                    sendResponse({ success: false, error: 'Tweet already processed' });
                    return;
                }

                // ツイート時間がカウント期間内かチェック
                const tweetTimeObj = new Date(request.tweetTime);
                const inRange = isDateTimeInRange(tweetTimeObj, countStartDateTime, countEndDateTime);

                // ツイートを保存
                const tweetCounterNew = inRange ? (data.tweetCounter || 0) + 1 : data.tweetCounter || 0;
                const tweets = data.tweets || [];

                const newTweet = {
                    url: request.url,
                    tweetId: request.tweetId,
                    twitterId: request.twitterId,
                    tweetTime: request.tweetTime,
                    date: request.tweetTime,
                    count: tweetCounterNew
                };

                // ストレージを更新
                processedIds.add(request.tweetId);
                tweets.push(newTweet);

                await chrome.storage.local.set({
                    tweetCounter: tweetCounterNew,
                    tweets,
                    processedTweetIds: Array.from(processedIds)
                });

                console.log('Tweet saved:', newTweet);
                sendResponse({ success: true, tweetCounter: tweetCounterNew });
            } catch (error) {
                console.error('Error processing tweet:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }

    if (request.type === "RESET_COUNTER") {
        (async () => {
            try {
                await chrome.storage.local.set({
                    tweetCounter: 0,
                    tweets: [],
                    processedTweetIds: []
                });
                sendResponse({ success: true });
            } catch (error) {
                console.error('Error resetting counter:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }
});

// インストール時の初期化
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    chrome.storage.local.set({
        tweetCounter: 0,
        tweets: [],
        processedTweetIds: [],
        countStartDateTime: null,
        countEndDateTime: null,
        isCustomQueryEnabled: false,
        alwaysShowCounter: true
    });
});

// 日時が範囲内かチェック
function isDateTimeInRange(dateTime, startDateTime, endDateTime) {
    if (startDateTime && endDateTime) {
        return dateTime >= startDateTime && dateTime <= endDateTime;
    } else if (startDateTime) {
        return dateTime >= startDateTime;
    } else if (endDateTime) {
        return dateTime <= endDateTime;
    } else {
        return true;
    }
}
let allTweets = [];

// 入力用の日付フォーマット
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 表示用の日付フォーマット
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return '無効な日付';
        }
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}/${month}/${day}`;
    } catch (error) {
        console.error('日付のフォーマットエラー:', error);
        return '無効な日付';
    }
}

// 表示用の時間フォーマット
function formatTime(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return '無効な時間';
        }
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (error) {
        console.error('時間のフォーマットエラー:', error);
        return '無効な時間';
    }
}

// デフォルトの日付と時間を設定
function setDefaultDateTimeValues() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 開始日時を今日の0:00に設定
    today.setHours(0, 0, 0, 0);
    document.getElementById('startDateTime').value = formatDateForInput(today);
    
    // 終了日時を明日の0:00に設定
    tomorrow.setHours(0, 0, 0, 0);
    document.getElementById('endDateTime').value = formatDateForInput(tomorrow);
}

// CSVのダウンロード
function downloadCSV(tweets) {
    const headers = ['Count', 'Twitter ID', 'Date', 'Time', 'Tweet URL'];
    const rows = tweets.map((tweet, index) => [
        index + 1, // カウントを1から始める
        tweet.twitterId,
        formatDate(tweet.tweetTime || tweet.date),
        formatTime(tweet.tweetTime || tweet.date),
        tweet.url
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    a.download = `tweets_${formatDateForInput(now).replace(/[T:-]/g, '')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ツイートをストレージから読み込む
async function loadTweets() {
    try {
        const data = await chrome.storage.local.get(['tweets', 'userId']);
        allTweets = data.tweets || [];
        console.log('ツイートを読み込みました:', allTweets);

        // デフォルトのTwitter IDを設定
        if (data.userId) {
            document.getElementById('twitterId').value = data.userId;
        }

        updateDisplay();
    } catch (error) {
        console.error('ツイートの読み込みエラー:', error);
    }
}

// ツイートをフィルタリング
function filterTweets(tweets) {
    const twitterId = document.getElementById('twitterId').value.trim();
    const startDateTime = new Date(document.getElementById('startDateTime').value);
    const endDateTime = new Date(document.getElementById('endDateTime').value);

    return tweets.filter(tweet => {
        let matches = true;
        const tweetDate = new Date(tweet.tweetTime || tweet.date);

        if (twitterId) {
            matches = matches && tweet.twitterId === twitterId;
        }

        // 日付範囲でフィルタリング
        matches = matches && tweetDate >= startDateTime && tweetDate <= endDateTime;

        return matches;
    });
}

// 表示を更新
function updateDisplay() {
    const filteredTweets = filterTweets(allTweets);
    const tbody = document.getElementById('tweetTableBody');
    const tweetCount = document.getElementById('tweetCount');

    // カウントを更新
    tweetCount.textContent = filteredTweets.length.toString();

    tbody.innerHTML = '';

    if (filteredTweets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="no-results">ツイートが見つかりませんでした</td>
            </tr>
        `;
        return;
    }

    // フィルタリングされたツイートを日付の新しい順にソート
    const sortedTweets = filteredTweets.sort((a, b) => {
        const dateA = new Date(a.tweetTime || a.date);
        const dateB = new Date(b.tweetTime || b.date);
        return dateB - dateA; // 降順（新しい順）
    });

    sortedTweets.forEach((tweet, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${tweet.twitterId || ''}</td>
            <td>${formatDate(tweet.tweetTime || tweet.date)}</td>
            <td>${formatTime(tweet.tweetTime || tweet.date)}</td>
            <td><a href="${tweet.url}" target="_blank" class="tweet-link">ツイートを見る</a></td>
        `;
        tbody.appendChild(row);
    });
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDateTimeValues();
    loadTweets();

    // イベントリスナーを追加
    document.getElementById('filterButton').addEventListener('click', updateDisplay);
    document.getElementById('resetButton').addEventListener('click', () => {
        document.getElementById('twitterId').value = '';
        setDefaultDateTimeValues();
        updateDisplay();
    });

    document.getElementById('downloadCsv').addEventListener('click', () => {
        const filteredTweets = filterTweets(allTweets);
        downloadCSV(filteredTweets);
    });

    // ストレージの変更を監視
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.tweets) {
            allTweets = changes.tweets.newValue || [];
            updateDisplay();
        }
    });
}); 

