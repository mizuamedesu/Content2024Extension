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
                const tweetCounter = inRange ? (data.tweetCounter || 0) + 1 : data.tweetCounter || 0;
                const tweets = data.tweets || [];

                const newTweet = {
                    url: request.url,
                    tweetId: request.tweetId,
                    twitterId: request.twitterId,
                    tweetTime: request.tweetTime,
                    date: request.tweetTime,
                    count: tweetCounter
                };

                // ストレージを更新
                processedIds.add(request.tweetId);
                tweets.push(newTweet);

                await chrome.storage.local.set({
                    tweetCounter,
                    tweets,
                    processedTweetIds: Array.from(processedIds)
                });

                console.log('Tweet saved:', newTweet);
                sendResponse({ success: true, tweetCounter });
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
