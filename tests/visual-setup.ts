export default function setup() {
  if (process.platform !== 'linux') {
    throw new Error('VRT は Linux 専用です。比較と基準画像の更新は GitHub Actions で実行してください。')
  }
}
