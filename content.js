console.log('Content script loaded');

let configuredUserId = null;
let processedTweetIds = new Set();
let isProcessing = false;
let autoHashtagMode = false;
let lastInsertedTweet = null;
let alwaysShowCounter = false;
let tweetCounter = 0;

// カウンターの期間をコンピューターの日付の00:00~23:59に設定
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
            'tweetCounter'
        ]);
        configuredUserId = settings.userId;
        if (settings.processedTweetIds) {
            processedTweetIds = new Set(settings.processedTweetIds);
        }
        autoHashtagMode = settings.autoHashtagMode || false;
        alwaysShowCounter = settings.alwaysShowCounter || false;
        tweetCounter = settings.tweetCounter || 0;

        // カウント期間を今日の00:00~23:59に設定
        updateCountDateTime();

        console.log('Loaded user ID:', configuredUserId);
        console.log('Loaded processed tweet count:', processedTweetIds.size);
        console.log('Auto Hashtag Mode:', autoHashtagMode);
        console.log('Always Show Counter:', alwaysShowCounter);
        console.log('Count Period:', countStartDateTime, '-', countEndDateTime);

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

// カウンター期間を今日の00:00~23:59に更新
function updateCountDateTime() {
    let today = new Date();
    countStartDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    countEndDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
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
    const searchQuery = `from%3A${encodedUserId}+コンテンツ入門2024`;
    const searchUrl = `https://x.com/search?q=${searchQuery}&src=recent_search_click&f=live`;

    window.location.href = searchUrl;
}

// ツイートカウンターを再計算
async function recalculateTweetCounter() {
    // カウント期間を更新
    updateCountDateTime();

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
                        tweetCounter = response.tweetCounter;
                        console.log('Tweet processed and counted:', {
                            id: tweetId,
                            rawDataSize: rawData.tweetContent.length
                        });
                    } else {
                        console.log('Tweet processed but not counted (outside time range):', {
                            id: tweetId
                        });
                    }

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
    if (changes.tweetCounter) {
        tweetCounter = changes.tweetCounter.newValue || 0;
        console.log('Tweet Counter updated:', tweetCounter);
        updateTweetCounterOverlay();
    }
});
