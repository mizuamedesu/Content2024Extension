# 令和最新版コンテンツ入門2024カウンター

## ☆5 この製品は完ぺきに動作します

### 0.git clone or releaseからダウンロード。2024/11/15現在最新版は[ここからダウンロード可能](https://github.com/mizuamedesu/Content2024Extension/archive/refs/tags/v1.1.1.zip)

![10](https://github.com/user-attachments/assets/e4f37902-5889-4bb1-84c6-8ca7ca2120d5)


### 1. chrome://extensions/ にアクセスし、有効化
![1](https://github.com/user-attachments/assets/c69094bc-fec3-4234-8068-68937236ce4a)

![Advance1](https://github.com/user-attachments/assets/e8e8d329-f2d2-43d0-aec0-ad7319add7af)
![Advance2](https://github.com/user-attachments/assets/a926d017-5365-40f7-a2e6-e4089bf8d274)

右上のデベロッパーモードをonにし、パッケージ化されていない拡張機能を読み込むから追加

### 2. 拡張をクリック
![2](https://github.com/user-attachments/assets/51833a59-14ea-4d47-8184-302db4507e8c)

### 3. IDを入力
![3](https://github.com/user-attachments/assets/06735cb9-6320-4c45-8e64-05d7f386c628)

保存に成功するとリロードが入る

### 4. 左下にカウンターが出現
![4](https://github.com/user-attachments/assets/a5d0ae48-5cc4-4109-9c00-3fefda5c5d67)

ここにカウントされるのは今日の00:00~23:59に投降したもの

### 5. カウンターをクリックすると検索が入る
![5](https://github.com/user-attachments/assets/db85a7fa-24b7-4207-9dc5-f616d4cd9f0b)

### 6. 一覧を見る
![6](https://github.com/user-attachments/assets/7d660279-67ab-4ec2-8fff-2b573a632a6e)
![7](https://github.com/user-attachments/assets/40b387df-bbfe-4e4e-9807-8c2f9eaa16e7)

拡張をクリックし、ツイート一覧を見るをクリックすると別タブで表示される。UI通りフィルターとCSVでの吐き出しが可能

### カスタムクエリー
![8](https://github.com/user-attachments/assets/72bbc449-78d2-4ddc-9b29-a291411d821c)

カスタムクエリーを有効にするのボタンを押すと、左下に常時表示されているカウンターと拡張機能を押した時に表示されるカウント数を日付で指定可能。オフの時はその日の00:00~23:59にツイートされたものがカウントされているはず。
(色々挙動が怪しいのでおまけ程度で考えてください。無効推奨)

### 推奨
csvで出す前に、一回左下のカウンターオーバーレイをクリックし、全部読み込みなおした方がいい

## 注意事項
1. APIリクエストベースの動作について
  - この拡張機能はクライアントのAPIリクエスト(DOMの変更)を監視する仕組みで動作しています
  - クライアントで一度も読み込まれていないツイートは検出できません
  - 過去のツイートを確認したい場合は、カウンターをクリックして表示される検索機能でクライアントに一度読み込む必要があります

2. 利用に関する免責事項
  - 本拡張機能の使用は自己責任となります
  - 開発者は本拡張機能の使用に起因するいかなる損害や問題についても責任を負いません

3. 宗教
  - 開発にはAI、LLM使いまくりなので嫌な人は避けて

## ハッシュタグ自動追加モード
![8](https://github.com/user-attachments/assets/da336d10-15bc-46b5-878f-38a8dc28634e)
![9](https://github.com/user-attachments/assets/fe67cd9d-1e40-4929-9bb1-6262cbf9eec8)

デフォはオフ。オンにすると自動でツイート入力欄にハッシュタグがインジェクションされる。

## ご意見問題等
- Twitter: @nukkonukko11
- Email: hello(🐈)mizuame.works (🐈を@に変えて)
