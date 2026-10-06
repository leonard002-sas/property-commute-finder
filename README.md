# 住まいと通勤

物件URLを登録し、対象会社までの通勤時間で比較する個人用Webアプリです。

## AWS構成

- Amazon S3：静的ファイルの保存
- Amazon CloudFront：HTTPS配信とS3の非公開化
- Amazon Cognito：自分だけのログイン
- API Gateway HTTP API：データAPIの入口
- AWS Lambda：物件の登録・更新・削除
- Amazon DynamoDB：物件と対象会社の保存

## 低コスト運用方針

- DynamoDBは小容量・少量アクセスで利用
- Cognitoはメール認証のみ。SMS MFAと高度なセキュリティ機能は使わない
- Lambdaは短時間処理のみ
- NAT Gateway、RDS、常時稼働サーバーは使わない
- CloudWatch Logsには短い保存期間を設定
- AWS Budgetsで月100円相当のアラートを設定

## デプロイ前に設定する値

`config.js`を作成し、Cognito User PoolとAPI Gatewayの値を設定します。

```js
window.APP_CONFIG = {
  cognitoDomain: "https://YOUR_DOMAIN.auth.ap-northeast-1.amazoncognito.com",
  clientId: "YOUR_COGNITO_APP_CLIENT_ID",
  apiBaseUrl: "https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com"
};
```

現在の`index.html`は、AWS接続前でも画面を確認できるデモモードです。接続時は、ブラウザ内保存部分をAPI呼び出しへ置き換えます。

## GitHub Actions

`.github/workflows/deploy.yml`は、`main`へのpushでTerraformを適用し、S3へ静的ファイルを同期する構成です。GitHub Actionsには長期AWSアクセスキーを置かず、AWS IAMのOIDCロールを`AWS_DEPLOY_ROLE_ARN`というSecretで渡します。

初回だけ、Terraform stateを保存する場所とGitHub OIDCのデプロイロールを用意します。そこまでの作業はAWSアカウント固有のため、実デプロイ時にアカウントIDとGitHubリポジトリ名を設定します。

## 注意

経路検索APIは別料金になる場合があります。初期段階では物件登録と比較画面を先に完成させ、経路計算は使用量を監視しながら追加します。
