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